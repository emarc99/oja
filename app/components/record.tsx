"use client";

import { useState } from "react";
import { BN } from "@anchor-lang/core";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { FEE_BPS, MIN_PAYERS, MIN_SALES, REPAY_BPS, type ShopRecord } from "@/lib/credit";
import { friendly, sendIxs } from "@/lib/client";
import { USDC_MINT, advancePda, explorerAddress, program, short, toBase } from "@/lib/solana";
import { LenderNote } from "./note";

export function Record({ record, onChange }: { record: ShopRecord; onChange: () => void }) {
  const s = record.stats;
  return (
    <div className="space-y-4">
      <div className="card">
        <p className="label">Your record</p>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-7xl leading-none font-black tracking-tight">{record.score}</span>
          <span className="pb-2 text-muted">/ 100</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-pepper transition-all" style={{ width: `${record.score}%` }} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4">
          <Stat label="Sales" value={s.sales} />
          <Stat label="Customers" value={s.customers} />
          <Stat label="Days selling" value={s.activeDays} />
          <Stat label="Received" value={`${s.volume.toFixed(2)} USDC`} />
        </dl>
        {record.linkedPayers.length > 0 && (
          <p className="mt-5 rounded-2xl bg-pepper/15 p-4 text-sm">
            <b>{record.linkedPayers.length} customer wallet(s) were funded by you.</b> They look like your own wallets, so
            advances are paused.
          </p>
        )}
        {record.uncheckedPayers.length > 0 && (
          <p className="mt-5 rounded-2xl bg-line/60 p-4 text-sm">
            Couldn&apos;t check {record.uncheckedPayers.length} customer wallet(s); devnet is busy. Refresh in a moment.
          </p>
        )}
      </div>

      <Advance record={record} onChange={onChange} />

      {record.receipts.length > 0 && (
        <div className="card">
          <p className="label">Receipts on Solana</p>
          <ul className="mt-4 divide-y divide-line">
            {record.receipts.slice(0, 6).map((r) => (
              <li key={r.address} className="flex items-center justify-between gap-3 py-3 text-sm">
                <a href={explorerAddress(r.address)} target="_blank" rel="noreferrer" className="hover:underline">
                  <span className="font-mono font-semibold">{r.amount.toFixed(2)} USDC</span>
                  <span className="ml-2 text-muted">from {short(r.payer)}</span>
                </a>
                <span className="text-right text-muted">
                  {r.lenderShare > 0 && <span className="mr-2 text-ink">{r.lenderShare.toFixed(2)} to lender</span>}
                  {new Date(r.ts * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Advance({ record, onChange }: { record: ShopRecord; onChange: () => void }) {
  const wallet = useWallet();
  const s = record.stats;
  const adv = record.advance;
  const [amount, setAmount] = useState(String(s.maxAdvance));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(build: () => Promise<Parameters<typeof sendIxs>[1][number]>) {
    setBusy(true);
    setError("");
    try {
      await sendIxs(wallet, [await build()]);
      onChange();
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  const merchant = new PublicKey(record.merchant);
  const owner = new PublicKey(record.owner);

  const request = () =>
    run(() =>
      program.methods
        .requestAdvance(new BN(toBase(Number(amount))), FEE_BPS, REPAY_BPS)
        .accountsStrict({
          owner,
          merchant,
          mint: USDC_MINT,
          advance: advancePda(merchant, record.advanceCount),
          systemProgram: SystemProgram.programId,
        })
        .instruction(),
    );

  const cancel = () =>
    run(() =>
      program.methods
        .cancelAdvance()
        .accountsStrict({ owner, merchant, advance: new PublicKey(adv!.address) })
        .instruction(),
    );

  let body: React.ReactNode;
  if (adv?.status === "active") {
    const pct = Math.min(100, (adv.repaid / adv.totalDue) * 100);
    body = (
      <>
        <h3 className="mt-3 text-2xl font-black tracking-tight">{adv.principal.toFixed(2)} USDC advance</h3>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 flex justify-between font-mono text-sm">
          <span>{adv.repaid.toFixed(2)} repaid</span>
          <span className="text-muted">of {adv.totalDue.toFixed(2)}</span>
        </p>
        <p className="mt-4 text-sm text-muted">
          {adv.repayBps / 100}% of every sale goes to your lender automatically. Nothing to remember, nothing to chase.
        </p>
      </>
    );
  } else if (adv?.status === "requested") {
    body = (
      <>
        <h3 className="mt-3 text-2xl font-black tracking-tight">Waiting for a lender</h3>
        <p className="mt-2 text-muted">
          You asked for {adv.principal.toFixed(2)} USDC. Lenders see your record on the Lend page.
        </p>
        <button className="btn-ghost mt-5" onClick={cancel} disabled={busy}>
          Cancel request
        </button>
      </>
    );
  } else if (s.maxAdvance > 0) {
    const value = Number(amount);
    body = (
      <>
        <h3 className="mt-3 text-2xl font-black tracking-tight">You qualify for {s.maxAdvance.toFixed(2)} USDC</h3>
        <p className="mt-2 text-sm text-muted">
          {FEE_BPS / 100}% fee. Repaid from {REPAY_BPS / 100}% of each sale. Your limit grows each time you repay.
        </p>
        <div className="mt-5 flex gap-2">
          <input
            className="field font-mono"
            type="number"
            min={0.01}
            max={s.maxAdvance}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="btn-pop shrink-0" onClick={request} disabled={busy || !(value > 0 && value <= s.maxAdvance)}>
            Request
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <h3 className="mt-3 text-2xl font-black tracking-tight">Keep selling</h3>
        <ul className="mt-4 space-y-2 text-sm">
          <Need done={s.sales >= MIN_SALES} label={`${Math.min(s.sales, MIN_SALES)} of ${MIN_SALES} sales`} />
          <Need
            done={s.uniquePayersOnChain >= MIN_PAYERS}
            label={`${Math.min(s.uniquePayersOnChain, MIN_PAYERS)} of ${MIN_PAYERS} different customers`}
          />
          <Need
            done={record.linkedPayers.length === 0 && record.uncheckedPayers.length === 0}
            label="Customers not funded by you"
          />
        </ul>
      </>
    );
  }

  return (
    <div className="card space-y-5">
      <div>
        <p className="label">Advance · limit {s.ladderCap} USDC</p>
        {body}
        {error && <p className="mt-3 text-sm font-medium text-pepper">{error}</p>}
      </div>
      <LenderNote shop={record.owner} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-xl font-bold">{value}</dd>
    </div>
  );
}

function Need({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`grid size-5 place-items-center rounded-full text-xs ${done ? "bg-leaf text-paper" : "bg-line"}`}>
        {done ? "✓" : ""}
      </span>
      {label}
    </li>
  );
}
