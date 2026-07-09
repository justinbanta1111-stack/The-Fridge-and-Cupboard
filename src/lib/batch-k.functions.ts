import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  mode: z.enum(["meal-wheel", "mom-easy", "global-flavor"]),
  items: z.array(z.string().min(1)).max(60).optional().default([]),
  // For mom-easy: picky | lunchbox | snacks | breakfast | dinner20 | budget
  // For global-flavor: a country name
  variant: z.string().max(40).optional(),
});

type Idea = {
  title: string;
  tagline: string;
  steps: string[];
  time_minutes: number;
};

async function callGateway(system: string, user: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured. Please try again later.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Chef is busy — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) throw new Error(`Chef couldn't think of one (${res.status}).`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "{}";
  return typeof text === "string" ? text : JSON.stringify(text);
}

function parseJson<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]) as T; } catch { /* */ } }
    return null;
  }
}

export const batchKIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<Idea> => {
    const itemsLine = data.items.length ? `Ingredients on hand: ${data.items.slice(0, 60).join(", ")}.` : "Assume a typical stocked kitchen.";
    let user = "";
    if (data.mode === "meal-wheel") {
      user = `Spin the meal wheel! Pick ONE fun theme at random (Taco Night, Pasta Rescue, Breakfast for Dinner, Soup Night, Stir Fry, Rice Bowls, Sheet-Pan Night, Sandwich Bar) and build a doable recipe from what's around. ${itemsLine}`;
    } else if (data.mode === "mom-easy") {
      const v = data.variant ?? "dinner20";
      const map: Record<string, string> = {
        picky: "kid-friendly picky-eater meal (mild flavors, familiar shapes)",
        lunchbox: "lunchbox idea that packs well and tastes good cold or room temp",
        snacks: "fast after-school snack",
        breakfast: "easy family breakfast",
        dinner20: "20-minute family dinner",
        budget: "budget-friendly family meal under $8 total",
        leftovers: "kid-friendly meal using leftovers already in the fridge",
        "hidden-veggie": "kid-friendly meal with vegetables hidden in familiar dishes",
      };
      user = `Make it easy for Mom: suggest ONE ${map[v] ?? map.dinner20}. Use common household ingredients. ${itemsLine}`;
    } else {
      const country = data.variant || "Italy";
      user = `Global Flavor Night — tonight's country is ${country}. Suggest ONE authentic-ish home-cook meal in that style using what's on hand. ${itemsLine}`;
    }
    const system = "You are Chef Super J — warm, fast, practical. Always respond with VALID JSON only. Format: {\"title\": string, \"tagline\": string (one short hype sentence), \"steps\": string[] (4-6 short steps), \"time_minutes\": number}.";
    const raw = await callGateway(system, user);
    const parsed = parseJson<Idea>(raw);
    if (!parsed?.title || !Array.isArray(parsed.steps)) throw new Error("Chef's idea got lost. Try again.");
    return {
      title: String(parsed.title).slice(0, 120),
      tagline: String(parsed.tagline ?? "").slice(0, 200),
      steps: parsed.steps.slice(0, 8).map((s) => String(s).slice(0, 240)),
      time_minutes: Number.isFinite(parsed.time_minutes) ? Math.max(5, Math.min(120, Math.round(parsed.time_minutes))) : 25,
    };
  });
