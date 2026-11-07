import { Buffer } from "buffer";
import { AnchorProvider, BN, Program } from "@anchor-lang/core";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "./idl/oja.json";
import type { Oja } from "./idl/oja";

// The RPC key stays on the server; browsers go through the /api/rpc proxy.
export const SERVER_RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
export const RPC_URL = typeof window === "undefined" ? SERVER_RPC_URL : `${window.location.origin}/api/rpc`;
export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
export const USDC_DECIMALS = 6;
export const NGN_PER_USDC = Number(process.env.NEXT_PUBLIC_NGN_PER_USDC ?? 1550);
export const PROGRAM_ID = new PublicKey(idl.address);
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export const connection = new Connection(RPC_URL, "confirmed");

// Read-only program client; transactions are signed by the wallet or the sponsor, never here.
export const program = new Program<Oja>(idl as Oja, { connection } as AnchorProvider);

export type MerchantAccount = Awaited<ReturnType<typeof program.account.merchant.fetch>>;
export type AdvanceAccount = Awaited<ReturnType<typeof program.account.advance.fetch>>;
export type ReceiptAccount = Awaited<ReturnType<typeof program.account.receipt.fetch>>;

export function merchantPda(owner: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("merchant"), owner.toBuffer()], PROGRAM_ID)[0];
}

export function receiptPda(merchant: PublicKey, invoiceId: Uint8Array) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), merchant.toBuffer(), Buffer.from(invoiceId)],
    PROGRAM_ID,
  )[0];
}

export function advancePda(merchant: PublicKey, index: number) {
  const seed = Buffer.alloc(4);
  seed.writeUInt32LE(index);
  return PublicKey.findProgramAddressSync([Buffer.from("advance"), merchant.toBuffer(), seed], PROGRAM_ID)[0];
}

export function ata(owner: PublicKey, mint: PublicKey = USDC_MINT) {
  return getAssociatedTokenAddressSync(mint, owner, true);
}

export async function fetchMerchant(owner: PublicKey) {
  return program.account.merchant.fetchNullable(merchantPda(owner));
}

export function toBase(usdc: number) {
  return Math.round(usdc * 10 ** USDC_DECIMALS);
}

export function fromBase(base: number | bigint | BN) {
  return Number(base.toString()) / 10 ** USDC_DECIMALS;
}

export function usd(base: number | bigint | BN) {
  return fromBase(base).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function naira(amount: number) {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export function hexToBytes(hex: string) {
  return Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));
}

export function explorerTx(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

export function short(key: string | PublicKey) {
  const s = key.toString();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function advanceStatus(status: AdvanceAccount["status"]) {
  return Object.keys(status)[0] as "requested" | "active" | "repaid" | "cancelled";
}
