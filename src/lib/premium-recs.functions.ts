import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  diets: z.array(z.string()).max(20).default([]),
  allergies: z.array(z.string()).max(20).default([]),
  cuisines: z.array(z.string()).max(20).default([]),
  goals: z.array(z.string()).max(20).default([]),
  household: z.number().int().min(1).max(20).default(2),
  budgetPerMeal: z.number().min(0).max(200).optional(),
  notes: z.string().max(500).optional(),
  pantryItems: z.array(z.string()).max(80).optional(),
});

const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  cuisine: z.string(),
  totalMinutes: z.number(),
  servings: z.number(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  estimatedCostUsd: z.number().optional(),
  nutritionHighlights: z.array(z.string()).optional(),
});

const OutputSchema = z.object({
  ingredientIdeas: z.array(z.object({
    name: z.string(),
    why: z.string(),
    usedIn: z.array(z.string()),
  })),
  quickIdeas: z.array(z.object({
    title: z.string(),
    blurb: z.string(),
    minutes: z.number(),
  })),
  recipes: z.array(RecipeSchema),
  weeklyPlan: z.array(z.object({
    day: z.string(),
    breakfast: z.string(),
    lunch: z.string(),
    dinner: z.string(),
  })),
  summary: z.string(),
});

export type PremiumRecsResult = z.infer<typeof OutputSchema>;

export const generatePremiumRecs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<PremiumRecsResult> => {
    const { supabase, userId } = context;

    // Premium gate
    const { data: hasSub, error: subErr } = await supabase
      .rpc("has_active_subscription", { user_uuid: userId, check_env: "live" });
    const { data: hasSubSandbox } = await supabase
      .rpc("has_active_subscription", { user_uuid: userId, check_env: "sandbox" });
    if (subErr) throw new Error("Subscription check failed");
    if (!hasSub && !hasSubSandbox) {
      throw new Error("PREMIUM_REQUIRED");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `You are Chef Super J. Build a personalized food plan for the user below.

PREFERENCES
- Diets / restrictions: ${data.diets.join(", ") || "none"}
- Allergies (MUST avoid): ${data.allergies.join(", ") || "none"}
- Cuisines liked: ${data.cuisines.join(", ") || "any"}
- Goals: ${data.goals.join(", ") || "general"}
- Household size: ${data.household}
${data.budgetPerMeal ? `- Budget per meal: about $${data.budgetPerMeal}` : ""}
${data.notes ? `- Notes: ${data.notes}` : ""}
${data.pantryItems?.length ? `- Already in pantry/fridge: ${data.pantryItems.join(", ")}` : ""}

DELIVER
1. 8 ingredient ideas to buy this week (smart staples that unlock multiple meals).
2. 6 quick meal ideas (title + 1-2 line blurb + minutes).
3. 4 full recipes with steps, scaled to household size, respecting all restrictions.
4. A 7-day weekly plan (breakfast/lunch/dinner per day, simple labels).
5. A short friendly summary (2-3 sentences) tying it back to their goals.

Strictly avoid allergens. Honor diet rules. Keep tone warm and practical.`;

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: OutputSchema }),
      timeout: { totalMs: 60_000 },
      maxRetries: 1,
      prompt,
    });

    return output;
  });
