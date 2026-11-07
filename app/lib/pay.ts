import { BN } from "@anchor-lang/core";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import bs58 from "bs58";
import {
  MEMO_PROGRAM_ID,
  type MerchantAccount,
  advanceStatus,
  ata,
  connection,
  merchantPda,
  program,
  receiptPda,
} from "./solana";

export function requestOrigin(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function loadSponsor(): Keypair | null {
  const raw = process.env.SPONSOR_SECRET_KEY?.trim();
  if (!raw) return null;
  const bytes = raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw);
  return Keypair.fromSecretKey(bytes);
}

type PayArgs = {
  payer: PublicKey;
  feePayer: PublicKey;
  owner: PublicKey;
  merchant: MerchantAccount;
  invoiceId: Uint8Array;
  amount: number;
  reference?: PublicKey;
  /** Overrides used only by the cheat simulator, to show what the program rejects. */
  mint?: PublicKey;
  payerToken?: PublicKey;
  lenderToken?: PublicKey;
  skipAdvance?: boolean;
};

export async function payInvoiceIx(a: PayArgs) {
  const merchantKey = merchantPda(a.owner);
  let advance: PublicKey | null = null;
  let lenderToken: PublicKey | null = null;

  if (a.merchant.currentAdvance && !a.skipAdvance) {
    advance = a.merchant.currentAdvance;
    const current = await program.account.advance.fetch(advance);
    if (advanceStatus(current.status) === "active") {
      lenderToken = a.lenderToken ?? ata(current.lender, a.merchant.mint);
    }
  }

  const ix = await program.methods
    .payInvoice(Array.from(a.invoiceId), new BN(a.amount))
    .accountsStrict({
      payer: a.payer,
      feePayer: a.feePayer,
      merchant: merchantKey,
      mint: a.mint ?? a.merchant.mint,
      payerToken: a.payerToken ?? ata(a.payer, a.merchant.mint),
      merchantToken: ata(a.owner, a.merchant.mint),
      receipt: receiptPda(merchantKey, a.invoiceId),
      advance,
      lenderToken,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  if (a.reference) ix.keys.push({ pubkey: a.reference, isSigner: false, isWritable: false });
  return ix;
}

export function memoIx(note: string) {
  return new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [], data: Buffer.from(note, "utf8") });
}

/** The transaction a customer's wallet signs: one memo with the invoice, one `pay_invoice` with the Solana Pay reference. */
export async function buildPayTransaction(args: {
  account: PublicKey;
  owner: PublicKey;
  invoiceId: Uint8Array;
  amount: number;
  reference: PublicKey;
  note: string;
}) {
  const merchant = await program.account.merchant.fetchNullable(merchantPda(args.owner));
  if (!merchant) throw new Error("This shop is not open on Òjà yet.");

  const balance = await connection
    .getTokenAccountBalance(ata(args.account, merchant.mint))
    .then((r) => Number(r.value.amount))
    .catch(() => 0);
  if (balance < args.amount) throw new Error("This wallet does not have enough devnet USDC.");

  const sponsor = loadSponsor();
  const feePayer = sponsor?.publicKey ?? args.account;

  const pay = await payInvoiceIx({
    payer: args.account,
    feePayer,
    owner: args.owner,
    merchant,
    invoiceId: args.invoiceId,
    amount: args.amount,
    reference: args.reference,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer, recentBlockhash: blockhash }).add(
    createAssociatedTokenAccountIdempotentInstruction(feePayer, ata(args.owner, merchant.mint), args.owner, merchant.mint),
    memoIx(args.note),
    pay,
  );
  if (sponsor) tx.partialSign(sponsor);

  return {
    merchant,
    transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
  };
}
