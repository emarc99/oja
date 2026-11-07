"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { type PublicKey, SystemProgram } from "@solana/web3.js";
import { Cheats } from "@/components/cheats";
import { Connect } from "@/components/connect";
import { Header } from "@/components/header";
import { Record } from "@/components/record";
import { NewSale } from "@/components/sale";
import type { ShopRecord } from "@/lib/credit";
import { api, friendly, sendIxs } from "@/lib/client";
import { USDC_MINT, merchantPda, program } from "@/lib/solana";

export default function ShopPage() {
  const wallet = useWallet();
  const owner = wallet.publicKey;
  const [record, setRecord] = useState<ShopRecord | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (owner) setRecord(await fetchRecord(owner));
  }, [owner]);

  useEffect(() => {
    if (!owner) return;
    let live = true;
    fetchRecord(owner)
      .then((r) => live && setRecord(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [owner]);

  let body: React.ReactNode;
  if (!owner) {
    body = (
      <Centered title="Your shop, on Solana." text="Connect the wallet you want to get paid into.">
        <Connect big />
      </Centered>
    );
  } else if (record === undefined) {
    body = <Centered title="Opening your shop…" text="Reading your sales from Solana." />;
  } else if (record === null) {
    body = <OpenShop onDone={refresh} />;
  } else {
    body = (
      <div className="space-y-10">
        <div>
          <p className="label">Shop</p>
          <h1 className="mt-2 text-5xl font-black tracking-tight">{record.name}</h1>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <NewSale owner={owner} onPaid={refresh} />
          <Record record={record} onChange={refresh} />
        </div>
        <Cheats shop={record.owner} />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-6 pb-16">{body}</main>
    </>
  );
}

async function fetchRecord(owner: PublicKey) {
  return (await api<{ record: ShopRecord | null }>(`/api/record?shop=${owner.toBase58()}`)).record;
}

function OpenShop({ onDone }: { onDone: () => Promise<void> }) {
  const wallet = useWallet();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open(e: React.FormEvent) {
    e.preventDefault();
    const owner = wallet.publicKey!;
    setBusy(true);
    setError("");
    try {
      const ix = await program.methods
        .initMerchant(name.trim())
        .accountsStrict({ owner, mint: USDC_MINT, merchant: merchantPda(owner), systemProgram: SystemProgram.programId })
        .instruction();
      await sendIxs(wallet, [ix]);
      await onDone();
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Centered title="Name your shop." text="This is what customers see when they pay. You'll need a little devnet SOL for the first transaction.">
      <form onSubmit={open} className="flex w-full max-w-md gap-2">
        <input
          className="field"
          placeholder="Mama Tolu Provisions"
          maxLength={32}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-pop shrink-0" disabled={busy || !name.trim()}>
          {busy ? "Opening…" : "Open shop"}
        </button>
      </form>
      {error && <p className="text-sm font-medium text-pepper">{error}</p>}
    </Centered>
  );
}

function Centered({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-5xl font-black tracking-tight md:text-6xl">{title}</h1>
      <p className="max-w-md text-lg text-muted">{text}</p>
      {children}
    </div>
  );
}
