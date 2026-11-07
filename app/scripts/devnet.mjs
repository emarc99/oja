// Devnet helpers. Never prints secret keys.
//   node scripts/devnet.mjs setup         create the fee sponsor (secret goes to .env.local) and its USDC account
//   node scripts/devnet.mjs seed <owner>  give a shop a demo sales history from 5 generated customers
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import anchor from "@anchor-lang/core";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";

const { BN, Program } = anchor;

const ENV_FILE = new URL("../.env.local", import.meta.url);
const SEED_FILE = new URL("./.seed-keypair.json", import.meta.url);
const idl = JSON.parse(fs.readFileSync(new URL("../lib/idl/oja.json", import.meta.url), "utf8"));

const env = Object.fromEntries(
  (fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "")
    .split(/\r?\n/)
    .filter((l) => /^\w+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const connection = new Connection(env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com", "confirmed");
const USDC = new PublicKey(env.NEXT_PUBLIC_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const program = new Program(idl, { connection });
const ata = (owner) => getAssociatedTokenAddressSync(USDC, owner, true);
const usdcBalance = (owner) =>
  connection.getTokenAccountBalance(ata(owner)).then((r) => Number(r.value.amount)).catch(() => 0);
const send = (tx, signers) => sendAndConfirmTransaction(connection, tx, signers, { commitment: "confirmed" });

function sponsor() {
  if (!env.SPONSOR_SECRET_KEY) return null;
  return Keypair.fromSecretKey(bs58.decode(env.SPONSOR_SECRET_KEY));
}

async function setup() {
  let kp = sponsor();
  if (!kp) {
    kp = Keypair.generate();
    fs.appendFileSync(ENV_FILE, `\nSPONSOR_SECRET_KEY=${bs58.encode(kp.secretKey)}\n`);
    console.log("Created a sponsor wallet and saved its secret to app/.env.local");
  }
  console.log(`Sponsor: ${kp.publicKey.toBase58()}`);

  const sol = (await connection.getBalance(kp.publicKey)) / LAMPORTS_PER_SOL;
  console.log(`Balance: ${sol} SOL`);
  if (sol < 0.05) {
    console.log(`Fund it, then run setup again:\n  solana transfer ${kp.publicKey.toBase58()} 0.5 --allow-unfunded-recipient -u devnet`);
    return;
  }

  await send(
    new Transaction().add(createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, ata(kp.publicKey), kp.publicKey, USDC)),
    [kp],
  );
  console.log("Sponsor USDC account ready. Setup done.");
}

async function seed(ownerArg) {
  const fees = sponsor();
  if (!fees) throw new Error("Run setup first.");
  const owner = new PublicKey(ownerArg);
  const [merchantKey] = PublicKey.findProgramAddressSync([Buffer.from("merchant"), owner.toBuffer()], program.programId);
  const merchant = await program.account.merchant.fetchNullable(merchantKey);
  if (!merchant) throw new Error("Open the shop in the app first.");

  if (!fs.existsSync(SEED_FILE)) fs.writeFileSync(SEED_FILE, JSON.stringify(Array.from(Keypair.generate().secretKey)));
  const funder = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(SEED_FILE, "utf8"))));

  const sales = [
    [0, 1.2], [1, 0.8], [2, 1.5], [0, 0.6], [3, 1.1],
    [4, 0.9], [1, 1.4], [2, 0.7], [3, 1.3], [4, 1.0],
  ];
  const customers = Array.from({ length: 5 }, () => Keypair.generate());
  const need = customers.map((_, i) => sales.filter(([c]) => c === i).reduce((s, [, a]) => s + Math.round(a * 1e6), 0));
  const total = need.reduce((a, b) => a + b, 0);

  const have = await usdcBalance(funder.publicKey);
  if (have < total) {
    console.log(`Seed wallet needs ${(total / 1e6).toFixed(2)} USDC (has ${(have / 1e6).toFixed(2)}).`);
    console.log(`Get devnet USDC at https://faucet.circle.com (Solana Devnet) for:\n  ${funder.publicKey.toBase58()}`);
    return;
  }

  const fund = new Transaction();
  customers.forEach((c, i) => {
    fund.add(
      createAssociatedTokenAccountIdempotentInstruction(fees.publicKey, ata(c.publicKey), c.publicKey, USDC),
      createTransferCheckedInstruction(ata(funder.publicKey), USDC, ata(c.publicKey), funder.publicKey, need[i], 6),
    );
  });
  fund.feePayer = fees.publicKey;
  await send(fund, [fees, funder]);
  console.log(`Funded ${customers.length} demo customers.`);

  for (const [i, amount] of sales) {
    const payer = customers[i];
    const fresh = await program.account.merchant.fetch(merchantKey);
    let advance = null;
    let lenderToken = null;
    if (fresh.currentAdvance) {
      advance = fresh.currentAdvance;
      const a = await program.account.advance.fetch(advance);
      if ("active" in a.status) lenderToken = ata(a.lender);
    }

    const invoiceId = randomBytes(16);
    const [receipt] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipt"), merchantKey.toBuffer(), invoiceId],
      program.programId,
    );
    const base = Math.round(amount * 1e6);
    const pay = await program.methods
      .payInvoice(Array.from(invoiceId), new BN(base))
      .accountsStrict({
        payer: payer.publicKey,
        feePayer: fees.publicKey,
        merchant: merchantKey,
        mint: USDC,
        payerToken: ata(payer.publicKey),
        merchantToken: ata(owner),
        receipt,
        advance,
        lenderToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(fees.publicKey, ata(owner), owner, USDC),
      new TransactionInstruction({ programId: MEMO, keys: [], data: Buffer.from("Òjà demo sale (seeded)") }),
      pay,
    );
    tx.feePayer = fees.publicKey;
    const sig = await send(tx, [fees, payer]);
    console.log(`Sale ${amount.toFixed(2)} USDC from customer ${i + 1}: ${sig}`);
  }
  console.log("Seeded. Refresh the shop page.");
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "setup") await setup();
else if (cmd === "seed" && arg) await seed(arg);
else console.log("Usage: node scripts/devnet.mjs setup | seed <shop-owner-address>");
