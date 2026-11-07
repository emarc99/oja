import { PublicKey } from "@solana/web3.js";
import { advanceStatus, connection, fromBase, merchantPda, program } from "./solana";

// Mirrors programs/oja/src/constants.rs; the program enforces these, this file only explains them.
export const CREDIT_LADDER = [10, 25, 50, 100];
export const MAX_ADVANCE_SHARE = 0.3;
export const MIN_SALES = 5;
export const MIN_PAYERS = 3;
export const FEE_BPS = 500;
export const REPAY_BPS = 2000;

export type ShopRecord = NonNullable<Awaited<ReturnType<typeof shopRecord>>>;

export async function shopRecord(owner: PublicKey) {
  const merchantKey = merchantPda(owner);
  const merchant = await program.account.merchant.fetchNullable(merchantKey);
  if (!merchant) return null;

  const receipts = (
    await program.account.receipt.all([{ memcmp: { offset: 8, bytes: merchantKey.toBase58() } }])
  )
    .map(({ publicKey, account }) => ({
      address: publicKey.toBase58(),
      payer: account.payer.toBase58(),
      amount: fromBase(account.amount),
      lenderShare: fromBase(account.lenderShare),
      ts: account.ts.toNumber(),
    }))
    .sort((a, b) => b.ts - a.ts);

  const advance = merchant.currentAdvance
    ? await program.account.advance.fetch(merchant.currentAdvance).then((a) => ({
        address: merchant.currentAdvance!.toBase58(),
        status: advanceStatus(a.status),
        lender: a.lender.toBase58(),
        principal: fromBase(a.principal),
        totalDue: fromBase(a.totalDue),
        repaid: fromBase(a.repaid),
        repayBps: a.repayBps,
      }))
    : null;

  const sales = merchant.saleCount;
  const volume = fromBase(merchant.totalReceived);
  const payers = [...new Set(receipts.map((r) => r.payer))];
  const activeDays = new Set(receipts.map((r) => new Date(r.ts * 1000).toISOString().slice(0, 10))).size;
  const completedAdvances = merchant.completedAdvances;

  const linkedPayers = await payersFundedByOwner(owner, payers.slice(0, 8));

  const ladderCap = CREDIT_LADDER[Math.min(completedAdvances, CREDIT_LADDER.length - 1)];
  const volumeCap = Math.floor(volume * MAX_ADVANCE_SHARE * 100) / 100;
  const eligible = sales >= MIN_SALES && merchant.uniquePayers >= MIN_PAYERS && !advance && linkedPayers.length === 0;
  const maxAdvance = eligible ? Math.min(ladderCap, volumeCap) : 0;

  const score = Math.max(
    0,
    Math.round(
      Math.min(sales / 20, 1) * 25 +
        Math.min(payers.length / 8, 1) * 25 +
        Math.min(activeDays / 7, 1) * 20 +
        Math.min(volume / 100, 1) * 15 +
        Math.min(completedAdvances / 2, 1) * 15 -
        linkedPayers.length * 20,
    ),
  );

  return {
    name: merchant.name,
    owner: owner.toBase58(),
    merchant: merchantKey.toBase58(),
    advanceCount: merchant.advanceCount,
    score,
    stats: {
      sales,
      volume,
      customers: payers.length,
      uniquePayersOnChain: merchant.uniquePayers,
      activeDays,
      completedAdvances,
      ladderCap,
      volumeCap,
      maxAdvance,
    },
    linkedPayers,
    advance,
    receipts: receipts.slice(0, 20),
  };
}

/**
 * A payer the shop owner sent money to is probably the owner's own wallet.
 * Checks each payer's recent history for a transaction the owner signed.
 */
async function payersFundedByOwner(owner: PublicKey, payers: string[]) {
  const linked: string[] = [];
  for (const payer of payers) {
    const sigs = await connection.getSignaturesForAddress(new PublicKey(payer), { limit: 10 }).catch(() => []);
    if (!sigs.length) continue;
    const txs = await connection
      .getParsedTransactions(
        sigs.map((s) => s.signature),
        { maxSupportedTransactionVersion: 1, commitment: "confirmed" },
      )
      .catch(() => []);
    const ownerSigned = txs.some((tx) =>
      tx?.transaction.message.accountKeys.some((k) => k.signer && k.pubkey.equals(owner)),
    );
    if (ownerSigned) linked.push(payer);
  }
  return linked;
}
