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

  const { linked: linkedPayers, unchecked: uncheckedPayers } = await payersFundedByOwner(owner, payers.slice(0, 8));

  const ladderCap = CREDIT_LADDER[Math.min(completedAdvances, CREDIT_LADDER.length - 1)];
  const volumeCap = Math.floor(volume * MAX_ADVANCE_SHARE * 100) / 100;
  const eligible = sales >= MIN_SALES && merchant.uniquePayers >= MIN_PAYERS && !advance && linkedPayers.length === 0 && uncheckedPayers.length === 0;
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
    uncheckedPayers,
    advance,
    receipts: receipts.slice(0, 20),
  };
}

// Transaction history never changes, so each signature only needs reading once per server instance.
const checked = new Map<string, { linked: boolean; sigs: Set<string> }>();

/**
 * A payer the shop owner sent money to is probably the owner's own wallet.
 * Checks each payer's recent history for a transaction the owner signed.
 * Payers whose history couldn't be read are reported as unchecked, never as clean.
 */
async function payersFundedByOwner(owner: PublicKey, payers: string[]) {
  const linked: string[] = [];
  const unchecked: string[] = [];
  for (const payer of payers) {
    const key = `${owner.toBase58()}:${payer}`;
    const entry = checked.get(key) ?? { linked: false, sigs: new Set<string>() };
    if (!entry.linked) {
      try {
        const sigs = await connection.getSignaturesForAddress(new PublicKey(payer), { limit: 10 });
        for (const { signature } of sigs) {
          if (entry.sigs.has(signature)) continue;
          const tx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 1,
            commitment: "confirmed",
          });
          entry.sigs.add(signature);
          if (tx?.transaction.message.accountKeys.some((k) => k.signer && k.pubkey.equals(owner))) {
            entry.linked = true;
            break;
          }
        }
      } catch {
        unchecked.push(payer);
      } finally {
        checked.set(key, entry);
      }
    }
    if (entry.linked) linked.push(payer);
  }
  return { linked, unchecked };
}
