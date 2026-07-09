import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  mode: z.enum([
    "three-ways",
    "mystery",
    "kid-saver",
    "craving",
    "leftover-remix",
    "surprise",
  ]),
  item: z.string().optional(),
  haveIngredients: z.array(z.string()).default([]),
  expiring: z.array(z.string()).default([]),
  leftovers: z.array(z.string()).default([]),
  craving: z.string().optional(),
  flavor: z.string().optional(),
  kidType: z.enum(["dinner", "hidden-veggie", "lunch", "snack", "breakfast"]).optional(),
  funny: z.boolean().default(false),
});

export type FunMeal = {
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

type Data = z.infer<typeof Input>;
function instruction(data: Data): string {
  switch (data.mode) {
    case "three-ways":
      return `Give 3 totally different meal ideas using "${data.item}" (e.g. tacos / soup / pasta style variety). Each meal must feel distinct.`;
    case "mystery":
      return `"${data.item}" is an uncommon ingredient. Show 3 fun, easy meals that use it as a hero or accent. Be exploratory and encouraging.`;
    case "kid-saver":
      return `Generate 3 kid-friendly ${data.kidType ?? "dinner"} ideas. Mild flavors, fun shapes/names. ${data.kidType === "hidden-veggie" ? "Hide vegetables cleverly." : ""}`;
    case "craving":
      return `User is craving "${data.craving}". Build 3 meals that satisfy that craving from on-hand ingredients.`;
    case "leftover-remix":
      return `Take leftover "${data.item}" and remix it 3 different ways in "${data.flavor}" flavor profile. Make it feel brand new.`;
    case "surprise":
    default:
      return `Surprise the user! Pick 3 creative, fun random meals from their ingredients. Mix cheap / fast / comfort / creative vibes. Make it entertaining.`;
  }
}

export const funMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ meals: FunMeal[] }> => {
    const sys = `You are Chef Super J — warm, fast, fun. Output JSON only.
Rules:
- Always return exactly 3 short meals.
- Prioritize leftovers, then expiring, then on-hand.
- Keep steps minimal (≤5 each). "missing" ≤2 essential items.
- "why" = one short sentence. "encouragement" = 1 warm line.
- ${data.funny ? "Be playful, witty, light food puns. Stay kind." : "Warm and practical."}
- JSON shape: { "meals":[{ "title","time_minutes","why","steps":[],"ingredients_used":[],"missing":[],"encouragement" }] }`;

    const ctx = {
      have: data.haveIngredients,
      expiring: data.expiring,
      leftovers: data.leftovers,
    };
    const usr = `${instruction(data)}\nContext: ${JSON.stringify(ctx)}`;

    const raw = await callGateway(sys, usr);
    try {
      const parsed = JSON.parse(raw);
      const meals = Array.isArray(parsed.meals) ? parsed.meals.slice(0, 3) : [];
      return { meals };
    } catch {
      return { meals: [] };
    }
  });
