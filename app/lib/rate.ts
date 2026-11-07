import { PublicKey } from "@solana/web3.js";
import { connection } from "./solana";

// Pyth's sponsored USDC/USD price account; the same address on devnet and mainnet.
const PYTH_RECEIVER = new PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");
const PYTH_USDC_USD = new PublicKey("Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX");
const PYTH_USDC_FEED_ID = "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";
const PYTH_MAX_AGE_S = 600;

// Neither Pyth nor Switchboard publishes USD/NGN, so the naira leg is the median of independent FX sources.
type FxJson = { rates?: Record<string, number>; usd?: Record<string, number> };
const FX_SOURCES = [
  { name: "ExchangeRate-API", urls: ["https://open.er-api.com/v6/latest/USD"], read: (j: FxJson) => j.rates?.NGN },
  {
    name: "currency-api",
    urls: [
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
    ],
    read: (j: FxJson) => j.usd?.ngn,
  },
];
const MAX_SPREAD = 0.03;
const CACHE_MS = 60_000;

export type Rate = {
  ngnPerUsdc: number;
  ngnPerUsd: number;
  usdcUsd: number | null;
  sources: string[];
  spread: number;
};

async function fxQuote(source: (typeof FX_SOURCES)[number]) {
  for (const url of source.urls) {
    const value = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) })
      .then(async (res) => (res.ok ? Number(source.read((await res.json()) as FxJson)) : NaN))
      .catch(() => NaN);
    if (Number.isFinite(value) && value > 0) return value;
  }
  throw new Error(`${source.name} unavailable`);
}

// Decodes the PriceUpdateV2 account written by Pyth's Solana receiver program.
async function pythUsdcUsd(): Promise<number | null> {
  try {
    const info = await connection.getAccountInfo(PYTH_USDC_USD);
    if (!info?.owner.equals(PYTH_RECEIVER)) return null;
    const d = info.data;
    let o = 8 + 32;
    o += d[o] === 0 ? 2 : 1;
    if (d.subarray(o, o + 32).toString("hex") !== PYTH_USDC_FEED_ID) return null;
    o += 32;
    const price = Number(d.readBigInt64LE(o));
    const expo = d.readInt32LE(o + 16);
    const publishTime = Number(d.readBigInt64LE(o + 20));
    if (Date.now() / 1000 - publishTime > PYTH_MAX_AGE_S) return null;
    return price * 10 ** expo;
  } catch {
    return null;
  }
}

let cached: { rate: Rate; at: number } | null = null;

export async function getRate(): Promise<Rate> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.rate;

  const [fx, usdcUsd] = await Promise.all([Promise.allSettled(FX_SOURCES.map(fxQuote)), pythUsdcUsd()]);
  const quotes = fx.flatMap((r, i) => (r.status === "fulfilled" ? [{ name: FX_SOURCES[i].name, value: r.value }] : []));
  if (!quotes.length) throw new Error("No naira rate available");

  const values = quotes.map((q) => q.value).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const ngnPerUsd = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  const rate: Rate = {
    ngnPerUsd,
    usdcUsd,
    ngnPerUsdc: ngnPerUsd * (usdcUsd ?? 1),
    sources: quotes.map((q) => q.name),
    spread: (values[values.length - 1] - values[0]) / ngnPerUsd,
  };
  cached = { rate, at: Date.now() };
  return rate;
}

function ngn(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function rateChecks(rate: Rate) {
  const agree = rate.sources.length >= 2 && rate.spread <= MAX_SPREAD;
  const perDollar = `${ngn(rate.ngnPerUsd)} per dollar`;
  return [
    {
      ok: agree,
      label: agree
        ? `${perDollar}, median of ${rate.sources.join(" and ")}`
        : rate.sources.length < 2
          ? `${perDollar} from ${rate.sources[0]} only`
          : `${perDollar}, but sources differ by ${(rate.spread * 100).toFixed(1)}%`,
    },
    {
      ok: rate.usdcUsd !== null,
      label:
        rate.usdcUsd !== null
          ? `USDC at $${rate.usdcUsd.toFixed(4)} from Pyth on Solana, so ${ngn(rate.ngnPerUsdc)} per USDC`
          : `Pyth USDC price unavailable; assumed $1.00`,
    },
  ];
}
