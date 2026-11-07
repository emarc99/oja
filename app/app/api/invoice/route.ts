import { createHash } from "node:crypto";
import { Keypair, PublicKey } from "@solana/web3.js";
import { readSale } from "@/lib/ai";
import { requestOrigin } from "@/lib/pay";
import { getRate, rateChecks } from "@/lib/rate";
import { naira } from "@/lib/solana";

export async function POST(req: Request) {
  const { note, shop } = (await req.json().catch(() => ({}))) as { note?: string; shop?: string };
  if (!note?.trim() || note.length > 500) return Response.json({ error: "Write the sale in a sentence." }, { status: 400 });
  try {
    new PublicKey(shop ?? "");
  } catch {
    return Response.json({ error: "Connect your shop wallet first." }, { status: 400 });
  }

  const [saleResult, rateResult] = await Promise.allSettled([readSale(note), getRate()]);
  if (saleResult.status === "rejected") {
    return Response.json(
      { error: "Couldn't read that sale. Try: 2 bags of rice, 48k each." },
      { status: 502 },
    );
  }
  if (rateResult.status === "rejected") {
    return Response.json({ error: "Couldn't get a live naira rate. Try again in a moment." }, { status: 503 });
  }
  const sale = saleResult.value;
  const rate = rateResult.value;

  const lines = sale.items
    .filter((i) => i.quantity > 0 && i.unitPriceNgn > 0)
    .map((i) => ({ ...i, lineNgn: Math.round(i.quantity * i.unitPriceNgn) }));
  const totalNgn = lines.reduce((sum, l) => sum + l.lineNgn, 0);
  if (!totalNgn) return Response.json({ error: "No prices found in that sale." }, { status: 422 });

  const amount = Math.max(1, Math.round((totalNgn / rate.ngnPerUsdc) * 1e6));
  const createdAt = Date.now();
  const invoiceId = createHash("sha256")
    .update(JSON.stringify({ shop, lines, totalNgn, rate: rate.ngnPerUsdc, createdAt }))
    .digest()
    .subarray(0, 16)
    .toString("hex");
  const reference = Keypair.generate().publicKey.toBase58();
  const memo = `Òjà ${naira(totalNgn)}: ${lines.map((l) => `${l.quantity} ${l.name}`).join(", ")}`.slice(0, 160);

  const aiTotalMatches = Math.abs(sale.totalNgn - totalNgn) < 1;
  const checks = [
    {
      ok: aiTotalMatches,
      label: aiTotalMatches
        ? `Total re-added by code: ${naira(totalNgn)}`
        : `AI said ${naira(sale.totalNgn)}; code re-added it to ${naira(totalNgn)}`,
    },
    {
      ok: lines.length === sale.items.length,
      label: `${lines.length} of ${sale.items.length} lines have a quantity and a price`,
    },
    ...rateChecks(rate),
  ];

  const params = new URLSearchParams({ shop: shop!, amount: String(amount), id: invoiceId, ref: reference, note: memo });
  const pageParams = new URLSearchParams({ ...Object.fromEntries(params), ngn: String(totalNgn) });
  const origin = requestOrigin(req);

  return Response.json({
    invoiceId,
    reference,
    lines,
    totalNgn,
    amount,
    memo,
    checks,
    link: `solana:${encodeURIComponent(`${origin}/api/pay?${params}`)}`,
    browserUrl: `${origin}/pay?${pageParams}`,
  });
}
