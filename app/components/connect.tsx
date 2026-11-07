"use client";

import { useSyncExternalStore } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { short } from "@/lib/solana";

const noop = () => () => {};

export function Connect({ big = false }: { big?: boolean }) {
  const { wallets, select, connected, connecting, publicKey, disconnect } = useWallet();
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed);

  // Installed wallets are only known in the browser; render a stable placeholder on the server.
  if (!inBrowser) return <span className={big ? "btn-pop invisible" : "btn invisible"}>Connect wallet</span>;

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
