"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import bs58 from "bs58";
import { Header } from "@/components/header";
import { LenderNote } from "@/components/note";
import type { ShopRecord } from "@/lib/credit";
import { api, friendly, sendIxs } from "@/lib/client";
import { type AdvanceAccount, USDC_MINT, advanceStatus, ata, fromBase, program } from "@/lib/solana";

type Row = { address: PublicKey; advance: AdvanceAccount; record: ShopRecord };

// Advance layout: discriminator 8, merchant 32, index 4, lender 32, principal 8, fee 2, repay 2, due 8, repaid 8 → status.
const LENDER_OFFSET = 44;
const STATUS_OFFSET = 104;

async function loadRows(filter: { offset: number; bytes: string }) {
  const advances = await program.account.advance.all([{ memcmp: filter }]);
  return Promise.all(
    advances.map(async ({ publicKey, account }) => {
      const merchant = await program.account.merchant.fetch(account.merchant);
      const { record } = await api<{ record: ShopRecord }>(`/api/record?shop=${merchant.owner.toBase58()}`);
      return { address: publicKey, advance: account, record };
    }),
  );
}

async function loadAll(lender: PublicKey | null) {
  const [open, mine] = await Promise.all([
    loadRows({ offset: STATUS_OFFSET, bytes: bs58.encode([0]) }),
    lender ? loadRows({ offset: LENDER_OFFSET, bytes: lender.toBase58() }) : [],
  ]);
  return { open, mine };
}

export default function LendPage() {
  const wallet = useWallet();
  const [open, setOpen] = useState<Row[] | null>(null);
  const [mine, setMine] = useState<Row[]>([]);

  const refresh = useCallback(async () => {
    const all = await loadAll(wallet.publicKey);
    setOpen(all.open);
    setMine(all.mine);
  }, [wallet.publicKey]);

  useEffect(() => {
    let live = true;
    loadAll(wallet.publicKey)
      .then((all) => {
        if (!live) return;
        setOpen(all.open);
        setMine(all.mine);
      })
      .catch(() => live && setOpen([]));
    return () => {
      live = false;
    };
  }, [wallet.publicKey]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-6 pb-16">
        <p className="label">Lend</p>
        <h1 className="mt-2 max-w-2xl text-5xl font-black tracking-tight">
          Fund traders with a record you can check.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Every number below comes from receipts on Solana. You&apos;re repaid from a share of each sale, split by the
          program before the trader gets paid.
        </p>

        <section className="mt-12 grid gap-4 lg:grid-cols-2">
          {open === null && <p className="text-muted">Reading requests from Solana…</p>}
          {open?.length === 0 && <p className="text-muted">No open requests right now.</p>}
          {open?.map((row) => <Request key={row.address.toBase58()} row={row} onFunded={refresh} />)}
        </section>

        {mine.length > 0 && (
          <section className="mt-16">
            <p className="label">Your advances</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {mine.map(({ address, advance, record }) => {
                const due = fromBase(advance.totalDue);
                const repaid = fromBase(advance.repaid);
                return (
                  <div key={address.toBase58()} className="card">
                    <p className="font-bold">{record.name}</p>
                    <p className="mt-1 text-sm text-muted capitalize">{advanceStatus(advance.status)}</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.min(100, (repaid / due) * 100)}%` }} />
                    </div>
                    <p className="mt-2 font-mono text-sm">
                      {repaid.toFixed(2)} / {due.toFixed(2)} USDC
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function Request({ row, onFunded }: { row: Row; onFunded: () => Promise<void> }) {
  const wallet = useWallet();
  const { advance, record } = row;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const principal = fromBase(advance.principal);
  const own = wallet.publicKey?.toBase58() === record.owner;

  async function fund() {
    const lender = wallet.publicKey!;
    const owner = new PublicKey(record.owner);
    setBusy(true);
    setError("");
    try {
      const ix = await program.methods
        .fundAdvance()
        .accountsStrict({
          lender,
          merchant: advance.merchant,
          advance: row.address,
          mint: USDC_MINT,
          lenderToken: ata(lender),
          merchantToken: ata(owner),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();
      await sendIxs(wallet, [
        createAssociatedTokenAccountIdempotentInstruction(lender, ata(owner), owner, USDC_MINT),
        ix,
      ]);
      await onFunded();
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{record.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {record.stats.sales} sales · {record.stats.customers} customers · {record.stats.activeDays} days
          </p>
        </div>
        <span className="rounded-2xl bg-ink px-3 py-2 text-center text-paper">
          <span className="block text-2xl leading-none font-black">{record.score}</span>
          <span className="text-[10px] tracking-widest uppercase">score</span>
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-paper p-4 text-sm">
        <div>
          <dt className="text-muted">Lend</dt>
          <dd className="font-mono font-bold">{principal.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-muted">Get back</dt>
          <dd className="font-mono font-bold">{fromBase(advance.totalDue).toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-muted">From each sale</dt>
          <dd className="font-mono font-bold">{advance.repayBps / 100}%</dd>
        </div>
      </dl>

      <LenderNote shop={record.owner} />

      <button className="btn-pop w-full" onClick={fund} disabled={busy || !wallet.connected || own}>
        {own ? "This is your shop" : busy ? "Funding…" : `Fund ${principal.toFixed(2)} USDC`}
      </button>
      {error && <p className="text-sm font-medium text-pepper">{error}</p>}
    </div>
  );
}
