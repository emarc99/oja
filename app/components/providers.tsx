"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { RPC_URL } from "@/lib/solana";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
