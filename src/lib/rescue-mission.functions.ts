import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  items: z.array(z.string()).max(80).default([]),
  leftovers: z.array(z.string()).max(40).default([]),
  expiringSoon: z.array(z.string()).max(40).default([]),
  cuisines: z.array(z.string()).max(8).default([]),
  restrictions: z.array(z.string()).max(8).default([]),
  funnyChef: z.boolean().optional().default(false),
});

const MealSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  timeMinutes: z.number().int().min(5).max(180).optional().default(25),
  usesItems: z.array(z.string()).default([]),
});

const Output_ = z.object({
  hero: z.string().describe("The single ingredient/leftover to rescue tonight"),
  mission: z.string().describe("One short sentence: 'Rescue the spinach tonight.'"),
  chefMessage: z.string().describe("Fun Chef Super J encouragement"),
  meals: z.object({
    fastest: MealSchema,
    healthiest: MealSchema,
    family: MealSchema,
  }),
  estimatedSavingsCents: z.number().int().min(100).max(3000).default(600),
  poundsRescued: z.number().min(0.1).max(3).default(0.5),
});

export type RescueMission = z.infer<typeof Output_>;

export const tonightsRescueMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = [
      "You are Chef Super J running 'Tonight's Rescue Mission' — pick ONE food to save tonight.",
      "Prioritize: leftovers > expiring-soon > then anything that tends to spoil fast.",
      "Pick the single MOST urgent hero ingredient. Then give exactly 3 meal ideas using it (and other items on hand): fastest, healthiest, family-friendly.",
      "Mission line is one short imperative sentence ('Rescue the spinach tonight.').",
      "Chef message: fun, encouraging, under 20 words.",
      data.funnyChef ? "Playful, slightly cheeky tone (PG)." : "Warm, smart, encouraging.",
    ].join(" ");

    const prompt = [
      `Items on hand: ${data.items.join(", ") || "(none scanned)"}`,
      `Leftovers: ${data.leftovers.join(", ") || "(none)"}`,
      `Expiring soon: ${data.expiringSoon.join(", ") || "(none)"}`,
      `Favorite cuisines: ${data.cuisines.join(", ") || "any"}`,
      `Dietary: ${data.restrictions.join(", ") || "none"}`,
    ].join("\n");

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: Output_ }),
      system,
      prompt,
    });

    return output;
  });
