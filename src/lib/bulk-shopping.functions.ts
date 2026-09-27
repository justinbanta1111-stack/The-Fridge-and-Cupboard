import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  household: z.number().min(1).max(12).default(2),
  freezerSpace: z.enum(["none", "small", "large"]).default("small"),
  haveAtHome: z.array(z.string()).max(80).default([]),
  useUpSoon: z.array(z.string()).max(20).default([]),
  dietary: z.array(z.string()).max(30).default([]),
  note: z.string().max(300).default(""),
});

const OutputSchema = z.object({
  summary: z.string(),
  buy: z
    .array(
      z.object({
        item: z.string(),
        size: z.string(),
        why: z.string(),
        keeps: z.string(),
        meals: z.array(z.string()).default([]),
        aisle: z.string().default(""),
      }),
    )
    .default([]),
  skip: z
    .array(z.object({ item: z.string(), why: z.string() }))
    .default([]),
  wasteTips: z.array(z.string()).default([]),
});

export type BulkPlan = z.infer<typeof OutputSchema>;

const SYSTEM = [
  "You are Chef Super J helping someone shop a warehouse club (Costco/Sam's) sensibly.",
  "Goal: bulk buys that actually get eaten. Never recommend a quantity likely to spoil for their household size and freezer space.",
  "buy: 5-8 items. size = a realistic warehouse pack size in plain words. keeps = how long it lasts and how to store or portion/freeze it. meals = 2-4 real meals it feeds, favouring what they already have at home. aisle = the store section.",
  "skip: 2-4 tempting bulk items that are a bad idea for THIS household, with a one-line reason.",
  "wasteTips: 3-5 short, specific tips (portion and freeze, date the bags, etc.).",
  "Never invent exact prices. If value matters, speak in relative terms only.",
  "Honor dietary restrictions absolutely. Warm, practical, no lecturing, no medical claims.",
].join("\n");

export const buildBulkPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<BulkPlan> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const context = [
      `Household size: ${data.household} people`,
      `Freezer space: ${data.freezerSpace}`,
      `Already at home: ${data.haveAtHome.length ? data.haveAtHome.join(", ") : "unknown"}`,
      `Needs using up soon: ${data.useUpSoon.length ? data.useUpSoon.join(", ") : "nothing flagged"}`,
      `Dietary preferences / restrictions: ${data.dietary.length ? data.dietary.join(", ") : "none"}`,
      data.note ? `They said: ${data.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: OutputSchema }),
        timeout: { totalMs: 40_000 },
        maxRetries: 1,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Plan my warehouse-club trip.\n${context}` },
        ],
      });
      return output;
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      if (/\b429\b|rate.?limit/i.test(raw))
        throw new Error("RATE_LIMITED: Too many requests right now — try again in a minute.");
      if (/\b402\b|credits?/i.test(raw))
        throw new Error("CREDITS_EXHAUSTED: Daily AI credits used up. Try again tomorrow.");
      throw new Error(`Bulk plan failed: ${raw}`);
    }
  });
