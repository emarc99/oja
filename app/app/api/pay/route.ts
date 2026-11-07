import { PublicKey } from "@solana/web3.js";
import { buildPayTransaction, requestOrigin } from "@/lib/pay";
import { hexToBytes, usd } from "@/lib/solana";

const MIN_SPONSORED_AMOUNT = 100_000;

export function GET(req: Request) {
  return Response.json({ label: "Òjà", icon: `${requestOrigin(req)}/oja.svg` });
}

export async function POST(req: Request) {
  const q = new URL(req.url).searchParams;
  const { account } = (await req.json().catch(() => ({}))) as { account?: string };

  try {
    const amount = Number(q.get("amount"));
    const id = q.get("id") ?? "";
    const note = (q.get("note") ?? "Òjà sale").slice(0, 160);
    // The sponsor pays each receipt's rent, so dust payments would drain it.
    if (!Number.isSafeInteger(amount) || amount < MIN_SPONSORED_AMOUNT) throw new Error("Minimum payment is 0.10 USDC.");
    if (!/^[0-9a-f]{32}$/.test(id)) throw new Error("Invalid invoice.");

    const { merchant, transaction } = await buildPayTransaction({
      account: new PublicKey(account ?? ""),
      owner: new PublicKey(q.get("shop") ?? ""),
      reference: new PublicKey(q.get("ref") ?? ""),
      invoiceId: hexToBytes(id),
      amount,
      note,
    });

    return Response.json({ transaction, message: `Pay ${merchant.name} ${usd(amount)} USDC` });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Could not build the payment." }, { status: 400 });
  }
}
