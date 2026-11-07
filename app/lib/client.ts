"use client";

import { Buffer } from "buffer";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { Transaction, type TransactionInstruction } from "@solana/web3.js";
import idl from "./idl/oja.json";
import { connection } from "./solana";

export async function sendIxs(wallet: WalletContextState, ixs: TransactionInstruction[]) {
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: wallet.publicKey!, recentBlockhash: blockhash }).add(...ixs);
  const sig = await wallet.sendTransaction(tx, connection);
  await confirm(sig);
  return sig;
}

/** Signs a transaction the server built (and may have partly signed as fee payer), then sends it. */
export async function signAndSend(wallet: WalletContextState, base64: string) {
  const tx = Transaction.from(Buffer.from(base64, "base64"));
  const signed = await wallet.signTransaction!(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await confirm(sig);
  return sig;
}

async function confirm(sig: string) {
  for (let i = 0; i < 60; i++) {
    const { value } = await connection.getSignatureStatuses([sig]);
    const status = value[0];
    if (status?.err) throw new Error(JSON.stringify(status.err));
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Timed out waiting for confirmation.");
}

export function friendly(err: unknown) {
  const text = err instanceof Error ? err.message : String(err);
  const hex = text.match(/custom program error: 0x([0-9a-f]+)/i)?.[1];
  const code = hex ? parseInt(hex, 16) : Number(text.match(/"Custom":(\d+)/)?.[1]);
  const known = idl.errors.find((e) => e.code === code);
  if (known) return known.msg;
  if (/rejected|declined|cancel/i.test(text)) return "You cancelled in your wallet.";
  if (/not connected/i.test(text)) return "Your wallet switched accounts. Tap your address at the top to disconnect, then connect again.";
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined ? undefined : {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? "Request failed.");
  return data as T;
}
