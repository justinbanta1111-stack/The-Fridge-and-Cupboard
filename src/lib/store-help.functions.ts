import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  imageDataUrl: z.string().min(10),
  cookingFor: z.string().max(300).default(""),
  haveAtHome: z.array(z.string()).max(60).default([]),
  useUpSoon: z.array(z.string()).max(20).default([]),
  kitchenSummary: z.string().max(400).default(""),
  dietary: z.array(z.string()).max(30).default([]),
});

const PickSchema = z.object({
  name: z.string(),
  whyBest: z.string(),
  valueNote: z.string(),
  healthNote: z.string(),
  ingredientNote: z.string(),
});

const OutputSchema = z.object({
  topPick: PickSchema,
  runnerUp: PickSchema.nullable().optional(),
  skip: z.array(z.object({ name: z.string(), reason: z.string() })).default([]),
  useItTonight: z.string(),
  summary: z.string(),
});

export type StoreHelpResult = z.infer<typeof OutputSchema>;

const SYSTEM = [
  "You are Chef Super J standing next to the shopper in the grocery aisle.",
  "They photographed a shelf (cheese, bread, sauces, meats, produce, etc.) and need help picking ONE item.",
  "Compare only products you can actually see in the photo. Never invent brands or prices you cannot read.",
  "Weigh: what they plan to cook, what they already have at home, best value for the money, healthier choice, simpler/cleaner ingredient lists, and any dietary restriction (restrictions are absolute).",
  "PRIORITY: favor the item that (a) helps use up the food already going bad at home, and (b) completes a real meal with staples they already own.",
  "Never recommend something they already have plenty of at home — call that out in skip instead.",
  "When their kitchen list is known, name at least one specific item from it in whyBest and in useItTonight.",
  "topPick: the single best choice, with short plain-language reasons (max ~18 words each field).",
  "runnerUp: a solid second choice, or null if there is no real alternative in the photo.",
  "skip: up to 3 items on the shelf worth passing on, each with a one-line reason.",
  "useItTonight: one warm sentence on how to use the top pick with what they already have.",
  "summary: one friendly sentence, like a friend leaning over the cart.",
  "Warm, confident, no lecturing, no medical claims.",
].join("\n");

export const recommendStorePick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<StoreHelpResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const context = [
      `Planning to cook: ${data.cookingFor || "not sure yet"}`,
      `Already at home: ${data.haveAtHome.length ? data.haveAtHome.join(", ") : "unknown"}`,
      `Needs using up first (going bad soon): ${data.useUpSoon.length ? data.useUpSoon.join(", ") : "nothing flagged"}`,
      data.kitchenSummary ? `Kitchen notes: ${data.kitchenSummary}` : "",
      `Dietary preferences / restrictions: ${data.dietary.length ? data.dietary.join(", ") : "none"}`,
    ].filter(Boolean).join("\n");

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: OutputSchema }),
        timeout: { totalMs: 40_000 },
        maxRetries: 1,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `Help me choose from this shelf.\n${context}` },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });
      return output;
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      if (/\b429\b|rate.?limit/i.test(raw))
        throw new Error("RATE_LIMITED: Too many scans right now — try again in a minute.");
      if (/\b402\b|credits?/i.test(raw))
        throw new Error("CREDITS_EXHAUSTED: Daily AI credits used up. Try again tomorrow.");
      throw new Error(`Store help failed: ${raw}`);
    }
  });
