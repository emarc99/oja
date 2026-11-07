import { google } from "@ai-sdk/google";
import { Output, generateText } from "ai";
import { z } from "zod";

const MODELS = (process.env.GEMINI_MODELS ?? "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.6-flash")
  .split(",")
  .map((m) => m.trim());

// Shared call settings: minimal thinking keeps a checkout under a couple of seconds.
function settings(modelId: string) {
  return {
    model: google(modelId),
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" as const } } },
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(12_000),
  };
}

async function withModels<T>(run: (call: ReturnType<typeof settings>) => Promise<T>) {
  let lastError: unknown;
  for (const id of MODELS) {
    try {
      return await run(settings(id));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const saleSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("Short item name"),
      quantity: z.number().describe("How many"),
      unitPriceNgn: z.number().describe("Price of one unit in naira"),
    }),
  ),
  totalNgn: z.number().describe("Your own sum of quantity × unit price"),
});

export type Sale = z.infer<typeof saleSchema>;

export async function readSale(note: string): Promise<Sale> {
  return withModels(async (call) => {
    const { output } = await generateText({
      ...call,
      output: Output.object({ schema: saleSchema }),
      system:
        "You turn a Nigerian market trader's sale note into invoice lines. Notes mix English, Pidgin and Yoruba. " +
        "'48k' means 48000 naira, '2 bag' means quantity 2, 'each' means unit price. Only include items the note mentions. " +
        "If a price is for the whole line, divide by quantity for the unit price.",
      prompt: note,
    });
    return output;
  });
}

export async function writeMemo(facts: Record<string, number>) {
  const text = await withModels(async (call) => {
    const res = await generateText({
      ...call,
      system:
        "You write a three-sentence note to someone deciding whether to fund a market trader's advance. " +
        "Sentence one: how the shop sells. Sentence two: its score (out of 100) and the most it can borrow. " +
        "Sentence three: the honest risk, such as a short history or customer wallets the owner funded; mention a zero only if it reassures. " +
        "Use only the facts given and copy every number exactly as written. Add no other numbers, dates or percentages. Plain, warm words, no hype.",
      prompt: JSON.stringify(facts),
    });
    return res.text.trim();
  });

  const allowed = [...Object.values(facts), 100];
  const claims = text.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) ?? [];
  const unverified = claims.filter((claim) => {
    const n = Number(claim.replace(/,/g, ""));
    return !allowed.some((v) => Math.abs(v - n) < 0.005);
  });
  return { text, claims: claims.length, unverified };
}
