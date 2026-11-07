import { PublicKey } from "@solana/web3.js";
import { writeMemo } from "@/lib/ai";
import { shopRecord } from "@/lib/credit";

export async function POST(req: Request) {
  const { shop } = (await req.json().catch(() => ({}))) as { shop?: string };
  try {
    const record = await shopRecord(new PublicKey(shop ?? ""));
    if (!record) return Response.json({ error: "Shop not found." }, { status: 404 });

    const s = record.stats;
    const facts = {
      sales: s.sales,
      different_customers: s.customers,
      days_with_sales: s.activeDays,
      total_received_usdc: Math.round(s.volume * 100) / 100,
      advances_repaid: s.completedAdvances,
      credit_score_out_of_100: record.score,
      max_advance_usdc: s.maxAdvance,
      customer_wallets_funded_by_owner: record.linkedPayers.length,
      customer_wallets_not_yet_checked: record.uncheckedPayers.length,
    };
    return Response.json({ facts, memo: await writeMemo(facts) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Could not write the memo." }, { status: 502 });
  }
}
