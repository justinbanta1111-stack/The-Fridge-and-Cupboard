import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXPERIENCE_RULES } from "@/lib/chef-experiences-prompt";
import { HUMOR_RULES } from "@/lib/chef-humor-prompt";
import { DRINK_PAIRING_RULES } from "@/lib/drink-pairing-prompt";
import { CELEBRATION_RULES, seasonalOccasionHint } from "@/lib/celebrations-prompt";

const MODEL = "google/gemini-3-flash-preview";

const VibeInput = z.object({
  vibe: z.string().min(2).max(60),
  items: z.array(z.string().min(1).max(80)).max(40).default([]),
  useFirst: z.array(z.string().min(1).max(80)).max(10).default([]),
  restrictions: z.array(z.string().max(60)).max(20).default([]),
});

const VibeMeal = z.object({
  title: z.string().describe("Short appetizing meal name, no markdown"),
  timeMinutes: z.number().int().min(5).max(180),
  why: z.string().describe("One warm spoken sentence — why this fits the night and what it uses up"),
  uses: z.array(z.string()).max(6).describe("Ingredients of theirs it uses"),
  chefTouch: z.string().describe("One small touch that makes it look or taste better"),
});

const VibeShape = z.object({
  intro: z.string().describe("One short, fun, spoken chef line reacting to the chosen vibe. Plain text."),
  meals: z.array(VibeMeal).length(3),
  win: z.string().describe("One short playful win or score line, e.g. 'Pantry rescue: 9/10'"),
});

export type NightVibeResult = z.infer<typeof VibeShape>;

export const nightVibeMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VibeInput.parse(input))
  .handler(async ({ data }): Promise<NightVibeResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Please try again later.");

    const system = [
      "You are Chef Super J — a warm, funny, experienced chef standing in the user's kitchen.",
      "They just told you what kind of night they want. Give exactly three meal ideas that truly fit that vibe, built from the food they already have.",
      "Plain spoken text, contractions, no markdown, no emojis. Keep every line short.",
      "Prefer ingredients that need using up first. Don't require specialty shopping.",
      ...EXPERIENCE_RULES,
      ...DRINK_PAIRING_RULES,
      ...CELEBRATION_RULES,
      seasonalOccasionHint(),
      data.restrictions.length ? `DIETARY (respect silently): ${data.restrictions.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = [
      `Tonight's vibe: ${data.vibe}.`,
      `On hand: ${data.items.slice(0, 30).join(", ") || "(nothing scanned — use common pantry staples)"}.`,
      data.useFirst.length ? `Use first: ${data.useFirst.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { output } = await generateText({
      model: createLovableAiGatewayProvider(key)(MODEL),
      output: Output.object({ schema: VibeShape }),
      temperature: 1,
      maxRetries: 1,
      system,
      prompt,
    });
    return output;
  });

const FixInput = z.object({
  problem: z.string().min(3).max(300),
  items: z.array(z.string().min(1).max(80)).max(40).default([]),
});

const FixShape = z.object({
  reassurance: z.string().describe("One short, calm, encouraging spoken line. Nothing dramatic."),
  fixes: z
    .array(
      z.object({
        step: z.string().describe("The fix, in one short instruction"),
        why: z.string().describe("One short sentence on why it works"),
      }),
    )
    .min(2)
    .max(4)
    .describe("Ordered most-likely-to-work first"),
  prevention: z.string().describe("One short sentence on avoiding it next time"),
});

export type FixMyMealResult = z.infer<typeof FixShape>;

export const fixMyMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FixInput.parse(input))
  .handler(async ({ data }): Promise<FixMyMealResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Please try again later.");

    const system = [
      "You are Chef Super J rescuing a dish that's going wrong right now. The user is standing at the stove.",
      "Be fast, calm and practical. Use ingredients a normal kitchen already has.",
      "Order the fixes by what's most likely to work. Plain spoken text, no markdown, no emojis.",
      "Never scold. Food safety first if the problem involves undercooked meat or spoilage.",
      ...HUMOR_RULES,
    ].join("\n");

    const prompt = [
      `Problem: ${data.problem}`,
      data.items.length ? `They likely have: ${data.items.slice(0, 25).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { output } = await generateText({
      model: createLovableAiGatewayProvider(key)(MODEL),
      output: Output.object({ schema: FixShape }),
      maxRetries: 1,
      system,
      prompt,
    });
    return output;
  });

const FancyInput = z.object({
  dish: z.string().min(2).max(120),
  items: z.array(z.string().min(1).max(80)).max(40).default([]),
});

const FancyShape = z.object({
  intro: z.string().describe("One short spoken line about how easy this upgrade is"),
  upgrades: z
    .array(
      z.object({
        label: z.string().describe("Two or three words, e.g. 'Pan sauce' or 'Fresh herbs'"),
        how: z.string().describe("One short instruction using what they have"),
      }),
    )
    .min(3)
    .max(5),
  plating: z.string().describe("One short restaurant-style plating tip"),
});

export type MakeItFancyResult = z.infer<typeof FancyShape>;

export const makeItFancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FancyInput.parse(input))
  .handler(async ({ data }): Promise<MakeItFancyResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Please try again later.");

    const system = [
      "You are Chef Super J making an ordinary home dinner look and taste restaurant-worthy — with almost no extra work.",
      "Suggest small, fast upgrades: a quick pan sauce, fresh herbs, citrus zest, flaky salt, crunch, a finishing cheese or fat, a swipe on the plate, height, a wiped rim.",
      "Nothing fussy, nothing that adds a new recipe. Plain spoken text, no markdown, no emojis.",
      ...HUMOR_RULES,
    ].join("\n");

    const prompt = [
      `Dish: ${data.dish}`,
      data.items.length ? `They likely have: ${data.items.slice(0, 25).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { output } = await generateText({
      model: createLovableAiGatewayProvider(key)(MODEL),
      output: Output.object({ schema: FancyShape }),
      maxRetries: 1,
      system,
      prompt,
    });
    return output;
  });
