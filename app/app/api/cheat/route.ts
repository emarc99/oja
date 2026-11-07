import { randomBytes } from "node:crypto";
import { BN } from "@anchor-lang/core";
import { NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { CHEATS, type Cheat } from "@/lib/cheats";
import { loadSponsor, payInvoiceIx } from "@/lib/pay";
import { advanceStatus, advancePda, ata, connection, merchantPda, program } from "@/lib/solana";

export async function POST(req: Request) {
  const { shop, kind } = (await req.json().catch(() => ({}))) as { shop?: string; kind?: Cheat };
  const attacker = loadSponsor();
  if (!attacker) return Response.json({ error: "SPONSOR_SECRET_KEY is not set." }, { status: 500 });
  if (!kind || !(kind in CHEATS)) return Response.json({ error: "Unknown cheat." }, { status: 400 });

  try {
    const owner = new PublicKey(shop ?? "");
    const merchantKey = merchantPda(owner);
    const merchant = await program.account.merchant.fetch(merchantKey);
    const current = merchant.currentAdvance ? await program.account.advance.fetch(merchant.currentAdvance) : null;
    const active = current && advanceStatus(current.status) === "active";

    const pay = (over: Partial<Parameters<typeof payInvoiceIx>[0]> = {}) =>
      payInvoiceIx({
        payer: attacker.publicKey,
        feePayer: attacker.publicKey,
        owner,
        merchant,
        invoiceId: randomBytes(16),
        amount: 1_000_000,
        ...over,
      });

    let ix: TransactionInstruction;
    switch (kind) {
      case "self-pay":
        // A distinct source account, so Anchor's duplicate-account guard doesn't fire before the program's own rule.
        ix = await pay({ payer: owner, payerToken: ata(attacker.publicKey) });
        break;
      case "fake-token":
        ix = await pay({ mint: NATIVE_MINT });
        break;
      case "double-pay": {
        const [paid] = await program.account.receipt.all([{ memcmp: { offset: 8, bytes: merchantKey.toBase58() } }]);
        if (!paid) return Response.json({ needs: "Make one sale first." });
        ix = await pay({ invoiceId: Uint8Array.from(paid.account.invoiceId) });
        break;
      }
      case "skip-lender":
        if (!merchant.currentAdvance) return Response.json({ needs: "Request an advance first." });
        ix = await pay({ skipAdvance: true });
        break;
      case "redirect-repayment":
        if (!active) return Response.json({ needs: "Needs a funded advance." });
        ix = await pay({ lenderToken: ata(attacker.publicKey) });
        break;
      case "advance-too-big":
        ix = await program.methods
          .requestAdvance(new BN(1_000_000_000), 500, 2000)
          .accountsStrict({
            owner,
            merchant: merchantKey,
            mint: merchant.mint,
            advance: advancePda(merchantKey, merchant.advanceCount),
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        break;
    }

    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: attacker.publicKey,
        recentBlockhash: blockhash,
        // Make sure the shop's USDC account exists so the program's own checks are what reject the cheat.
        instructions: [
          createAssociatedTokenAccountIdempotentInstruction(attacker.publicKey, ata(owner, merchant.mint), owner, merchant.mint),
          ix,
        ],
      }).compileToV0Message(),
    );
    const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
    const logs = sim.value.logs ?? [];

    return Response.json({ title: CHEATS[kind], blocked: sim.value.err !== null, reason: reason(logs, sim.value.err) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Simulation failed." }, { status: 400 });
  }
}

function reason(logs: string[], err: unknown) {
  for (const line of logs) {
    const anchor = line.match(/Error Code: (\w+)\. Error Number: \d+\. Error Message: (.*?)\.?$/);
    if (anchor) return { code: anchor[1], message: anchor[2] };
    if (line.includes("already in use")) return { code: "ReceiptExists", message: "This invoice already has a receipt" };
  }
  return err ? { code: "Rejected", message: JSON.stringify(err) } : null;
}
