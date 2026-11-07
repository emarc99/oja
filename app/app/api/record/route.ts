import { PublicKey } from "@solana/web3.js";
import { shopRecord } from "@/lib/credit";

export async function GET(req: Request) {
  try {
    const record = await shopRecord(new PublicKey(new URL(req.url).searchParams.get("shop") ?? ""));
    return Response.json({ record });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Could not read the shop." }, { status: 400 });
  }
}
