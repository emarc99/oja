import Link from "next/link";
import { Header } from "@/components/header";

const steps = [
  {
    n: "01",
    title: "Sell",
    body: "Type the sale the way you'd say it. AI writes the invoice, code re-checks every naira, and your customer scans to pay in USDC.",
  },
  {
    n: "02",
    title: "Build your record",
    body: "Every sale becomes a receipt on Solana, in your name. No bank statement, no paperwork. Any lender can verify it in seconds.",
  },
  {
    n: "03",
    title: "Get an advance",
    body: "Credit that carries you while you sell. A share of each sale repays the lender automatically, enforced by the program, not by chasing you.",
  },
];

const guards = [
  "Paying your own shop is rejected on-chain",
  "Each customer counts once, however often they pay",
  "First advance capped at 10 USDC; the limit grows only after you repay",
  "Wallets you funded don't count as customers",
];

export default function Home() {
  return (
    <>
      <Header wallet={false} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="grid items-center gap-12 py-14 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="label">Solana Pay for market traders</p>
            <h1 className="mt-5 text-6xl leading-[0.95] font-black tracking-tight text-balance md:text-8xl">
              Every sale builds your <span className="text-pepper">credit.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              Òjà is a checkout for traders banks can&apos;t see. Get paid in USDC, keep a record no one can fake, and
              unlock working capital that pays itself back.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-pop px-7 py-4 text-base">
                Open your shop
              </Link>
              <Link href="/lend" className="btn-ghost px-7 py-4 text-base">
                Lend to traders
              </Link>
            </div>
          </div>

          <ReceiptPreview />
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="card">
              <p className="font-mono text-sm text-pepper">{s.n}</p>
              <h2 className="mt-8 text-2xl font-bold tracking-tight">{s.title}</h2>
              <p className="mt-3 text-muted">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="my-14 rounded-[2rem] bg-ink p-8 text-paper md:p-14">
          <p className="label text-paper/60">Why the record holds up</p>
          <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-tight md:text-5xl">
            Credit only works if the history can&apos;t be faked.
          </h2>
          <ul className="mt-10 grid gap-x-10 gap-y-4 md:grid-cols-2">
            {guards.map((g) => (
              <li key={g} className="flex gap-3 text-lg">
                <span className="mt-2 size-2.5 shrink-0 rounded-full bg-pepper" />
                {g}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-paper/60">
            Open a shop and press <span className="text-paper">Try to cheat</span> to watch the program reject each trick.
          </p>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-6 py-8 text-sm text-muted">
        <span>Built for the MLH Solana Hackathon · runs on devnet</span>
        <a href="https://github.com/emarc99/oja" className="hover:text-ink">
          Source
        </a>
      </footer>
    </>
  );
}

function ReceiptPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-3xl bg-pepper" />
      <div className="relative rounded-3xl border-2 border-ink bg-card p-7">
        <div className="flex items-center justify-between">
          <span className="font-bold">Mama Tolu Provisions</span>
          <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-leaf">Paid</span>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <Row a="2 × bag of rice" b="₦96,000" />
          <Row a="1 × groundnut oil" b="₦9,500" />
        </div>
        <div className="mt-5 flex items-end justify-between border-t border-dashed border-line pt-5">
          <span className="label">Total</span>
          <span className="text-right">
            <span className="block text-3xl font-black tracking-tight">₦105,500</span>
            <span className="font-mono text-sm text-muted">68.06 USDC</span>
          </span>
        </div>
        <div className="mt-6 space-y-2 rounded-2xl bg-paper p-4 text-sm">
          <Row a="To shop" b="54.45 USDC" />
          <Row a="To lender (20%)" b="13.61 USDC" />
        </div>
        <p className="mt-5 font-mono text-xs text-muted">Receipt #23 · on Solana</p>
      </div>
    </div>
  );
}

function Row({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{a}</span>
      <span className="font-mono font-medium">{b}</span>
    </div>
  );
}
