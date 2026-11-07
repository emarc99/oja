"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import QRCode from "qrcode";
import { api } from "@/lib/client";
import { connection, explorerTx, hexToBytes, merchantPda, naira, receiptPda, usd } from "@/lib/solana";

type Invoice = {
  invoiceId: string;
  reference: string;
  lines: { name: string; quantity: number; unitPriceNgn: number; lineNgn: number }[];
  totalNgn: number;
  amount: number;
  checks: { ok: boolean; label: string }[];
  link: string;
  browserUrl: string;
};

const EXAMPLE = "2 bags of rice 48k each, 1 groundnut oil 9,500";

export function NewSale({ owner, onPaid }: { owner: PublicKey; onPaid: () => void }) {
  const [note, setNote] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [qr, setQr] = useState("");
  const [paid, setPaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function makeInvoice(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const inv = await api<Invoice>("/api/invoice", { note, shop: owner.toBase58() });
      setQr(await QRCode.toDataURL(inv.link, { margin: 1, width: 360, color: { dark: "#111111", light: "#fffcf5" } }));
      setInvoice(inv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!invoice || paid) return;
    const receipt = receiptPda(merchantPda(owner), hexToBytes(invoice.invoiceId));
    const timer = setInterval(async () => {
      if (!(await connection.getAccountInfo(receipt))) return;
      clearInterval(timer);
      const [sig] = await connection.getSignaturesForAddress(new PublicKey(invoice.reference), { limit: 1 });
      setPaid(sig?.signature ?? "");
      onPaid();
    }, 2000);
    return () => clearInterval(timer);
  }, [invoice, paid, owner, onPaid]);

  function reset() {
    setInvoice(null);
    setPaid(null);
    setNote("");
  }

  if (!invoice) {
    return (
      <form onSubmit={makeInvoice} className="card">
        <p className="label">New sale</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight">What did you sell?</h2>
        <textarea
          className="field mt-5 min-h-28 resize-none text-lg"
          placeholder={EXAMPLE}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="text-sm text-muted underline-offset-4 hover:underline" onClick={() => setNote(EXAMPLE)}>
            Use an example
          </button>
          <button className="btn-pop" disabled={busy || !note.trim()}>
            {busy ? "Writing invoice…" : "Make invoice"}
          </button>
        </div>
        {error && <p className="mt-4 text-sm font-medium text-pepper">{error}</p>}
      </form>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="label">Invoice</p>
        {paid !== null ? (
          <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-leaf">Paid</span>
        ) : (
          <span className="flex items-center gap-2 text-xs font-medium text-muted">
            <span className="size-2 animate-pulse rounded-full bg-pepper" /> Waiting for payment
          </span>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {invoice.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-4">
            <span>
              {l.quantity} × {l.name}
            </span>
            <span className="font-mono">{naira(l.lineNgn)}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-dashed border-line pt-5">
        <span className="label">Total</span>
        <span className="text-right">
          <span className="block text-4xl font-black tracking-tight">{naira(invoice.totalNgn)}</span>
          <span className="font-mono text-sm text-muted">{usd(invoice.amount)} USDC</span>
        </span>
      </div>

      <ul className="mt-5 space-y-1.5 text-sm">
        {invoice.checks.map((c) => (
          <li key={c.label} className="flex gap-2">
            <span className={c.ok ? "text-leaf" : "text-pepper"}>{c.ok ? "✓" : "!"}</span>
            {c.label}
          </li>
        ))}
      </ul>

      {paid === null ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-paper p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Solana Pay QR code" className="size-60 rounded-xl" />
          <p className="text-sm text-muted">Customer scans with Phantom</p>
          <a href={invoice.browserUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">
            Or open the checkout page
          </a>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-mint p-5 text-leaf">
          <p className="text-lg font-bold">{usd(invoice.amount)} USDC received</p>
          <p className="mt-1 text-sm">The receipt is on Solana and now counts toward your credit.</p>
          {paid && (
            <a href={explorerTx(paid)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
              View transaction
            </a>
          )}
        </div>
      )}

      <button className="btn-ghost mt-5 w-full" onClick={reset}>
        {paid !== null ? "New sale" : "Cancel"}
      </button>
    </div>
  );
}
