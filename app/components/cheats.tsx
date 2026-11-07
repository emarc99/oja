"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { CHEATS, type Cheat, type CheatResult } from "@/lib/cheats";

export function Cheats({ shop }: { shop: string }) {
  const [results, setResults] = useState<Partial<Record<Cheat, CheatResult | "loading">>>({});

  async function attempt(kind: Cheat) {
    setResults((r) => ({ ...r, [kind]: "loading" }));
    try {
      const result = await api<CheatResult>("/api/cheat", { shop, kind });
      setResults((r) => ({ ...r, [kind]: result }));
    } catch (err) {
      setResults((r) => ({ ...r, [kind]: { needs: err instanceof Error ? err.message : "Failed" } }));
    }
  }

  return (
    <section className="rounded-[2rem] bg-ink p-6 text-paper md:p-10">
      <p className="label text-paper/60">Try to cheat</p>
      <h2 className="mt-3 max-w-xl text-3xl font-black tracking-tight md:text-4xl">
        Your record is only worth something if it can&apos;t be faked.
      </h2>
      <p className="mt-3 max-w-xl text-paper/70">
        Each button builds a real cheating transaction against your shop and asks Solana devnet to run it. Nothing is
        signed or sent.
      </p>

      <ul className="mt-8 grid gap-3 md:grid-cols-2">
        {(Object.keys(CHEATS) as Cheat[]).map((kind) => {
          const r = results[kind];
          return (
            <li key={kind}>
              <button
                onClick={() => attempt(kind)}
                disabled={r === "loading"}
                className="w-full rounded-2xl border border-paper/15 p-4 text-left transition hover:border-pepper"
              >
                <span className="font-semibold">{CHEATS[kind]}</span>
                <span className="mt-2 block min-h-5 text-sm">
                  {r === "loading" && <span className="text-paper/60">Simulating…</span>}
                  {r && r !== "loading" && r.needs && <span className="text-paper/60">{r.needs}</span>}
                  {r && r !== "loading" && r.blocked && (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-pepper px-2 py-0.5 text-xs font-bold text-ink">Blocked</span>
                      <span className="font-mono text-xs text-paper/80">{r.reason?.code}</span>
                      <span className="text-paper/70">{r.reason?.message}</span>
                    </span>
                  )}
                  {r && r !== "loading" && r.blocked === false && (
                    <span className="text-pepper">The transaction would succeed</span>
                  )}
                  {!r && <span className="text-paper/40">Tap to try</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
