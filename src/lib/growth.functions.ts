import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  mode: z.enum([
    "grocery-list",
    "week-of-meals",
    "party",
    "holiday-leftovers",
    "bulk-cook",
    "substitutions",
    "local-food",
    "pantry-challenge",
  ]),
  haveIngredients: z.array(z.string()).default([]),
  expiring: z.array(z.string()).default([]),
  leftovers: z.array(z.string()).default([]),
  familyCount: z.number().int().min(1).max(50).default(2),
  variant: z.enum(["cheapest", "healthiest", "fastest"]).optional(),
  partyType: z.string().optional(),
  partyGuests: z.number().int().min(1).max(500).optional(),
  holiday: z.string().optional(),
  bulkType: z.enum(["freezer", "lunch", "family"]).optional(),
  missing: z.array(z.string()).default([]),
  region: z.string().optional(),
  season: z.string().optional(),
  days: z.number().int().min(1).max(14).default(7),
  funny: z.boolean().default(false),
});

export type Meal = {
  title: string;
  time_minutes?: number;
  ingredients_used?: string[];
  missing?: string[];
  note?: string;
};

export type GrowthResult = {
  title?: string;
  summary?: string;
  groceryList?: { item: string; qty?: string; estCents: number; note?: string }[];
  estimatedCostCents?: number;
  estimatedSavingsCents?: number;
  days?: { day: string; breakfast?: Meal; lunch?: Meal; dinner?: Meal; snack?: Meal }[];
  meals?: Meal[];
  prepPlan?: { step: string; time?: string }[];
  storage?: { item: string; method: string; days: number }[];
  substitutions?: { missing: string; cheaper?: string; healthier?: string; easier?: string; note?: string }[];
  notes?: string[];
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

type GrowthMode = z.infer<typeof Input>["mode"];
function systemFor(mode: GrowthMode, funny: boolean): string {
  const tone = funny ? "Light, witty, food-pun friendly but kind." : "Warm, practical, no fluff.";
  const common = `You are Chef Super J. ${tone} Output strict JSON only.`;
  switch (mode) {
    case "grocery-list":
      return `${common}
Build a SHORT grocery list of ONLY items the user lacks. Skip anything already on-hand.
Variants: cheapest = generic brands, frozen ok, bulk. healthiest = whole foods, lean protein, produce-heavy. fastest = prepped, ready-to-eat, minimal cook.
Estimate US grocery prices in cents per item. Cap list at ~12 items.
JSON: { "title", "summary", "groceryList":[{"item","qty","estCents","note"}], "estimatedCostCents", "notes":[] }`;
    case "week-of-meals":
      return `${common}
Plan 7 days. Build leftovers from one meal into the next. Prioritize expiring items first.
Scale to family size. ≤ 3 missing items total for the whole week.
JSON: { "title","summary","days":[{"day","breakfast":{...},"lunch":{...},"dinner":{...},"snack":{...}}], "estimatedSavingsCents","notes":[] }`;
    case "party":
      return `${common}
Plan a group meal. Scale portions to guest count. Output shopping + prep plan.
JSON: { "title","summary","meals":[{"title","note"}], "groceryList":[{"item","qty","estCents"}], "estimatedCostCents", "prepPlan":[{"step","time"}], "notes":[] }`;
    case "holiday-leftovers":
      return `${common}
Transform classic holiday leftovers into NEW meals (no repeats of the original). 6 ideas max.
JSON: { "title","meals":[{"title","time_minutes","ingredients_used":[],"note"}], "notes":[] }`;
    case "bulk-cook":
      return `${common}
Build a single bulk-cook session that yields multiple meals (freezer / lunch / family).
Include storage method + days each meal keeps.
JSON: { "title","summary","meals":[{"title","note"}], "prepPlan":[{"step","time"}], "storage":[{"item","method","days"}], "notes":[] }`;
    case "substitutions":
      return `${common}
For each missing ingredient suggest CHEAPER, HEALTHIER, and EASIER substitutes the user likely already has.
JSON: { "title","substitutions":[{"missing","cheaper","healthier","easier","note"}] }`;
    case "local-food":
      return `${common}
Build meals around in-season / regional ingredients (Alaska fish, berries, wild game, garden produce, etc.).
Use what user has plus suggested local additions.
JSON: { "title","summary","meals":[{"title","ingredients_used":[],"note"}], "notes":[] }`;
    case "pantry-challenge":
      return `${common}
Challenge: 3 days of meals with ONLY existing ingredients (no shopping).
Be realistic. Repeat staples ok. Show estimated money saved vs grocery run.
JSON: { "title","summary","days":[{"day","breakfast":{...},"lunch":{...},"dinner":{...}}], "estimatedSavingsCents","notes":[] }`;
    default:
      return common;
  }
}

export const growthAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<GrowthResult> => {
    const sys = systemFor(data.mode, data.funny);
    const usr = `Context: ${JSON.stringify({
      mode: data.mode,
      have: data.haveIngredients,
      expiring: data.expiring,
      leftovers: data.leftovers,
      familyCount: data.familyCount,
      variant: data.variant,
      partyType: data.partyType,
      partyGuests: data.partyGuests,
      holiday: data.holiday,
      bulkType: data.bulkType,
      missing: data.missing,
      region: data.region,
      season: data.season,
      days: data.days,
    })}`;
    const raw = await callGateway(sys, usr);
    try {
      return JSON.parse(raw) as GrowthResult;
    } catch {
      return { notes: ["Couldn't parse response, try again."] };
    }
  });
