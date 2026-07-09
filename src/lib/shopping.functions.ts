import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AnalyzeShoppingInput = z.object({
  imageDataUrl: z.string().min(10),
});

const ShoppingCategory = z.enum([
  "produce",
  "dairy",
  "meat",
  "seafood",
  "pantry",
  "frozen",
  "snacks",
  "beverages",
  "bakery",
  "other",
]);

const ShoppingItem = z.object({
  name: z.string(),
  category: ShoppingCategory,
  brand: z.string().optional().default(""),
  matchKeywords: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

const ShoppingOutput = z.object({
  items: z.array(ShoppingItem),
  summary: z.string(),
});

export type ShoppingScanItem = z.infer<typeof ShoppingItem>;
export type ShoppingScanResult = z.infer<typeof ShoppingOutput>;

const SYSTEM = [
  "You are a smart shopping assistant. The user is in a grocery store and just took a photo of a product, ingredient, label, or section of a shelf.",
  "Identify every distinct food/grocery PRODUCT visible. Be specific (e.g. 'fresh mozzarella ball', 'whole milk gallon', 'sliced sourdough bread').",
  "For each item return:",
  "- name: short, specific, lowercase singular when possible (e.g. 'mozzarella', 'roma tomatoes', 'olive oil').",
  "- category: one of produce | dairy | meat | seafood | pantry | frozen | snacks | beverages | bakery | other.",
  "- brand: if a brand is clearly readable, include it. Otherwise empty string.",
  "- matchKeywords: 1-5 lowercase keywords a pantry list might use to match this item (e.g. for 'fresh mozzarella ball': ['mozzarella','cheese']).",
  "- notes: <= 14 words. A practical pairing hint or a 'good with X' tip.",
  "Top-level: summary — one short sentence describing what's in the photo.",
  "Never invent items you cannot see. Skip non-food objects.",
].join("\n");

export const analyzeShoppingPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeShoppingInput.parse(input))
  .handler(async ({ data }): Promise<ShoppingScanResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: ShoppingOutput }),
        timeout: { totalMs: 35_000 },
        maxRetries: 1,
        messages: [
          {
            role: "system",
            content: SYSTEM,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify every grocery product in this photo and return the structured result.",
              },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });
      return output;
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
      if (/\b429\b|rate.?limit/i.test(raw))
        throw new Error("RATE_LIMITED: Too many scans right now — try again in a minute.");
      if (/\b402\b|credits?/i.test(raw))
        throw new Error("CREDITS_EXHAUSTED: Daily AI credits used up. Try again tomorrow.");
      throw new Error(`Shopping scan failed: ${raw}`);
    }
  });
