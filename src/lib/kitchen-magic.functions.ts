import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const QuickInput = z.object({
  mode: z.enum(["dinner-fast", "taste-match"]),
  haveIngredients: z.array(z.string()).default([]),
  expiring: z.array(z.string()).default([]),
  leftovers: z.array(z.string()).default([]),
  minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]).optional(),
  taste: z.string().optional(),
  funny: z.boolean().default(false),
});

export type QuickMeal = {
  title: string;
  time_minutes: number;
  why: string;
  steps: string[];
  ingredients_used: string[];
  missing: string[];
  encouragement: string;
};

async function callGateway(system: string, user: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Chef is busy. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) throw new Error(`Chef couldn't respond (${res.status}).`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "{}";
}

export const quickMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuickInput.parse(d))
  .handler(async ({ data }): Promise<{ meals: QuickMeal[] }> => {
    const sys = `You are Chef Super J. Generate 3 short meal ideas as JSON.
Rules:
- Prioritize leftovers first, then expiring items, then other on-hand ingredients.
- Keep steps minimal. For 5 minutes: ≤3 steps, ≤3 ingredients. 10 min: ≤4 steps. 15 min: ≤6 steps.
- "missing" must be ≤2 items and only essentials.
- "why" = one short sentence on why this meal fits.
- "encouragement" = 1 short warm line. ${data.funny ? "Be playful and witty (e.g. food puns, light jokes). Keep it kind." : "Warm and practical."}
- Output JSON: { "meals": [{ "title", "time_minutes", "why", "steps":[], "ingredients_used":[], "missing":[], "encouragement" }] }`;

    const ctx = {
      have: data.haveIngredients,
      expiring: data.expiring,
      leftovers: data.leftovers,
      minutes: data.minutes,
      taste: data.taste,
      mode: data.mode,
    };
    const usr =
      data.mode === "dinner-fast"
        ? `I need dinner in ${data.minutes ?? 15} minutes. Use what I have. Context: ${JSON.stringify(ctx)}`
        : `I'm craving "${data.taste ?? "comfort"}". Build meals from what I have. Context: ${JSON.stringify(ctx)}`;

    const raw = await callGateway(sys, usr);
    try {
      const parsed = JSON.parse(raw);
      const meals = Array.isArray(parsed.meals) ? parsed.meals.slice(0, 3) : [];
      return { meals };
    } catch {
      return { meals: [] };
    }
  });
