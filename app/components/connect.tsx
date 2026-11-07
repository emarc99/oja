"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { short } from "@/lib/solana";

export function Connect({ big = false }: { big?: boolean }) {
  const { wallets, select, connected, connecting, publicKey, disconnect } = useWallet();
  const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed);

  if (connected && publicKey) {
    return (
      <button className="btn-ghost font-mono" onClick={disconnect} title="Disconnect">
        <span className="size-2 rounded-full bg-leaf" />
        {short(publicKey)}
      </button>
    );
  }

  if (!installed.length) {
    return (
      <a className={big ? "btn-pop" : "btn"} href="https://phantom.com/download" target="_blank" rel="noreferrer">
        Get Phantom
      </a>
    );
  }

  const preferred = installed.find((w) => w.adapter.name === "Phantom") ?? installed[0];
  return (
    <button className={big ? "btn-pop" : "btn"} disabled={connecting} onClick={() => select(preferred.adapter.name)}>
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
