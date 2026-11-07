import { google } from "@ai-sdk/google";
import { Output, generateText } from "ai";
import { z } from "zod";

const MODELS = (process.env.GEMINI_MODELS ?? "gemini-3.8-flash,gemini-3.7-flash").split(",").map((m) => m.trim());

async function withModels<T>(run: (modelId: string) => Promise<T>) {
  let lastError: unknown;
  for (const id of MODELS) {
    try {
      return await run(id);
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
  return withModels(async (modelId) => {
    const { output } = await generateText({
      model: google(modelId),
      output: Output.object({ schema: saleSchema }),
      system:
        "You turn a Nigerian market trader's sale note into invoice lines. Notes mix English, Pidgin and Yoruba. " +
        "'48k' means 48000 naira, '2 bag' means quantity 2, 'each' means unit price. Only include items the note mentions. " +
        "If a price is for the whole line, divide by quantity for the unit price.",
      prompt: note,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return output;
  });
}

export async function writeMemo(facts: Record<string, number>) {
  const text = await withModels(async (modelId) => {
    const res = await generateText({
      model: google(modelId),
      system:
        "You write a three-sentence note to a small lender about a market trader's on-chain sales record. " +
        "Use only the facts given, copy every number exactly as written, and add no other numbers, dates or percentages. Plain words, no hype.",
      prompt: JSON.stringify(facts),
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return res.text.trim();
  });

  const allowed = Object.values(facts);
  const claims = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  const unverified = claims.filter((claim) => {
    const n = Number(claim.replace(/,/g, ""));
    return !allowed.some((v) => Math.abs(v - n) < 0.005);
  });
  return { text, claims: claims.length, unverified };
}
