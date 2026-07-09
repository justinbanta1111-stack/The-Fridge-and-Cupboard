import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  mode: z.enum(["freezer-rescue", "grocery-defense", "budget"]),
  haveIngredients: z.array(z.string()).default([]),
  frozenItems: z.array(z.object({ name: z.string(), days: z.number().default(0) })).default([]),
  groceryList: z.array(z.string()).default([]),
  servings: z.number().min(1).max(12).default(2),
  funny: z.boolean().default(false),
});

export type RescueMeal = {
  title: string;
  time_minutes: number;
  why: string;
  steps: string[];
  ingredients_used: string[];
  missing: string[];
  est_cost_cents?: number;
};

export type DefenseResult = {
  alreadyHave: string[];
  stillNeed: string[];
  duplicatesAvoided: number;
  estSavingsCents: number;
  note: string;
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

export const savingsHubAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ meals?: RescueMeal[]; defense?: DefenseResult }> => {
    if (data.mode === "grocery-defense") {
      const have = new Set(data.haveIngredients.map((s) => s.toLowerCase().trim()));
      const already: string[] = [];
      const need: string[] = [];
      for (const item of data.groceryList) {
        const k = item.toLowerCase().trim();
        const matched = [...have].some((h) => h.includes(k) || k.includes(h));
        if (matched) already.push(item);
        else need.push(item);
      }
      const estSavingsCents = already.length * 350;
      return {
        defense: {
          alreadyHave: already,
          stillNeed: need,
          duplicatesAvoided: already.length,
          estSavingsCents,
          note: already.length
            ? `You already have ${already.length} item${already.length === 1 ? "" : "s"} — skip the duplicate buys.`
            : "No overlaps found. Shop on.",
        },
      };
    }

    const tone = data.funny ? "Playful chef puns, light and kind." : "Warm and practical.";
    const sys = `You are Chef Super J. Output JSON only.
Return: { "meals":[{ "title","time_minutes","why","steps":[],"ingredients_used":[],"missing":[],"est_cost_cents" }] }
- Exactly 3 meals. Steps ≤5. Missing ≤2 items.
- ${tone}`;

    let instruction = "";
    if (data.mode === "freezer-rescue") {
      const sorted = [...data.frozenItems].sort((a, b) => b.days - a.days);
      instruction = `Build 3 meals using these frozen items (prioritize OLDEST first): ${JSON.stringify(sorted)}.
Other on-hand: ${data.haveIngredients.join(", ")}. Servings: ${data.servings}.
Each meal must use at least one frozen item. Mention thaw method briefly.`;
    } else {
      instruction = `Budget Mode: keep it CHEAP. Use pantry staples and leftovers first.
On hand: ${data.haveIngredients.join(", ")}. Servings: ${data.servings}.
Each meal under ~$3/serving. Add est_cost_cents per meal (whole meal cost).`;
    }

    const raw = await callGateway(sys, instruction);
    try {
      const parsed = JSON.parse(raw);
      return { meals: Array.isArray(parsed.meals) ? parsed.meals.slice(0, 3) : [] };
    } catch {
      return { meals: [] };
    }
  });
