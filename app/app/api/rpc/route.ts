import { SERVER_RPC_URL } from "@/lib/solana";

// Only what the browser side of the app needs, so the proxy isn't a free general-purpose RPC.
const ALLOWED = new Set([
  "getAccountInfo",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getLatestBlockhash",
  "isBlockhashValid",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getBalance",
  "getTokenAccountBalance",
  "getMinimumBalanceForRentExemption",
  "getFeeForMessage",
  "getSlot",
  "getBlockHeight",
  "getEpochInfo",
  "getGenesisHash",
  "getVersion",
  "simulateTransaction",
  "sendTransaction",
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const calls = Array.isArray(body) ? body : [body];
  if (!body || calls.length > 20 || calls.some((c) => !ALLOWED.has(c?.method))) {
    return Response.json({ error: "Method not allowed" }, { status: 403 });
  }
  const res = await fetch(SERVER_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}
