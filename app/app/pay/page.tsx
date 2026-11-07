"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Connect } from "@/components/connect";
import { Logo } from "@/components/header";
import { api, friendly, signAndSend } from "@/lib/client";
import { explorerTx, fetchMerchant, naira, usd } from "@/lib/solana";

export default function PayPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <Connect />
      </div>
      <Suspense fallback={null}>
        <Checkout />
      </Suspense>
    </main>
  );
}

function Checkout() {
  const q = useSearchParams();
  const wallet = useWallet();
  const amount = Number(q.get("amount") ?? 0);
  const ngn = Number(q.get("ngn") ?? 0);
  const [shopName, setShopName] = useState<string | null>(null);
  const [sig, setSig] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.resolve()
      .then(() => fetchMerchant(new PublicKey(q.get("shop") ?? "")))
      .then((m) => setShopName(m?.name ?? "Unknown shop"))
      .catch(() => setShopName("Unknown shop"));
  }, [q]);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const { transaction } = await api<{ transaction: string }>(`/api/pay?${q}`, {
        account: wallet.publicKey!.toBase58(),
      });
      setSig(await signAndSend(wallet, transaction));
    } catch (err) {
      // Switching accounts inside Phantom leaves the site holding a stale connection.
      if (/not connected/i.test(String(err))) {
        await wallet.disconnect().catch(() => {});
        setError("Your wallet switched accounts. Connect again to pay.");
        return;
      }
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  if (sig) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-leaf text-4xl text-paper">✓</span>
        <h1 className="text-4xl font-black tracking-tight">Paid</h1>
        <p className="text-muted">
          {usd(amount)} USDC to {shopName}. The receipt is on Solana.
        </p>
        <a href={explorerTx(sig)} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
          View transaction
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center py-10">
      <div className="relative">
        <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-3xl bg-pepper" />
        <div className="relative rounded-3xl border-2 border-ink bg-card p-7">
          <p className="label">Pay</p>
          <h1 className="mt-2 text-2xl font-bold">{shopName ?? "…"}</h1>
          <p className="mt-8 text-6xl font-black tracking-tight">{usd(amount)}</p>
          <p className="mt-1 font-mono text-muted">USDC{ngn > 0 && ` · for ${naira(ngn)}`}</p>
          {q.get("note") && <p className="mt-6 rounded-2xl bg-paper p-4 text-sm">{q.get("note")}</p>}
        </div>
      </div>

      <div className="mt-10 flex flex-col items-stretch gap-3">
        {wallet.connected ? (
          <button className="btn-pop py-4 text-base" onClick={pay} disabled={busy || !amount}>
            {busy ? "Paying…" : `Pay ${usd(amount)} USDC`}
          </button>
        ) : (
          <Connect big />
        )}
        {error && <p className="text-center text-sm font-medium text-pepper">{error}</p>}
        <p className="text-center text-xs text-muted">Solana devnet · no SOL needed for fees</p>
      </div>
    </div>
  );
}
