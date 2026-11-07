"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type Memo = { text: string; claims: number; unverified: string[] };

export function LenderNote({ shop }: { shop: string }) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function write() {
    setBusy(true);
    setError("");
    try {
      setMemo((await api<{ memo: Memo }>("/api/memo", { shop })).memo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write the note.");
    } finally {
      setBusy(false);
    }
  }

  if (!memo) {
    return (
      <div>
        <button className="btn-ghost w-full" onClick={write} disabled={busy}>
          {busy ? "Reading the chain…" : "Write a note for lenders"}
        </button>
        {error && <p className="mt-2 text-sm text-pepper">{error}</p>}
      </div>
    );
  }

  const verified = memo.unverified.length === 0;
  return (
    <div className="rounded-2xl bg-paper p-5">
      <p className="label">AI note, checked by code</p>
      <p className="mt-3 leading-relaxed">{memo.text}</p>
      <p className={`mt-3 text-sm font-medium ${verified ? "text-leaf" : "text-pepper"}`}>
        {verified
          ? `✓ All ${memo.claims} numbers match the on-chain record`
          : `! Not in the record: ${memo.unverified.join(", ")}`}
      </p>
    </div>
  );
}
