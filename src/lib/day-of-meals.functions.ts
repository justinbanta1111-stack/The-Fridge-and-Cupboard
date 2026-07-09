import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const GOALS = [
  "save-money",
  "use-leftovers",
  "eat-healthier",
  "high-protein",
  "comfort-food",
  "quick-meals",
  "weight-gain",
  "weight-loss",
  "recovery",
  "family-meals",
  "fasting",
] as const;
export type DayGoal = (typeof GOALS)[number];

export const TIME_LIMITS = ["under-10", "under-20", "under-30", "no-limit"] as const;
export type DayTime = (typeof TIME_LIMITS)[number];

const Input = z.object({
  goal: z.enum(GOALS).default("save-money"),
  time: z.enum(TIME_LIMITS).default("under-30"),
  haveIngredients: z.array(z.string()).default([]),
  expiringSoon: z.array(z.string()).default([]),
  leftovers: z.array(z.string()).default([]),
  swapSlot: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  swapAway: z.string().optional(),
  familyCount: z.number().int().min(1).max(12).default(1),
  history: z
    .object({
      loved: z.array(z.string()).default([]),
      avoid: z.array(z.string()).default([]),
    })
    .default({ loved: [], avoid: [] }),
});

export type Meal = {
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  why: string;
  time_minutes: number;
  uses: string[];
  missing: string[];
  steps: string[];
};

export type DayPlan = {
  headline: string;
  goal: DayGoal;
  meals: Meal[];
  grocery_gap: string[];
  estimated_savings?: string;
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

const SYSTEM = `You are Chef Super J building "My Day of Meals" — a full day of food (breakfast, lunch, dinner, plus one snack option) using what the user ALREADY HAS.

Priority order, always:
1. Foods listed as "expiringSoon" — use these FIRST.
2. "leftovers" — repurpose creatively (do not just reheat the same plate three times).
3. "haveIngredients" — fridge + cupboard items already scanned.
4. Keep grocery_gap tiny (at most 3 items across the whole day, often 0).

Goal shapes the menu:
- save-money: zero waste, lean on staples, no specialty buys.
- use-leftovers: every meal must reuse something.
- eat-healthier: veg-forward, whole foods, low added sugar.
- high-protein: 25g+ protein per main meal.
- comfort-food: warm, soft, familiar.
- quick-meals: every meal under the time limit.
- weight-gain: calorie-dense, healthy fats, larger portions.
- weight-loss: lower calorie, high volume, lean protein, fiber.
- recovery: gentle, easy to digest, hydrating.
- family-meals: scalable, kid-friendly, one base dish.
- fasting: Orthodox Lent — no meat, no dairy, no eggs.

Time limit applies to EACH meal:
- under-10: ≤ 10 min hands-on, ≤ 4 ingredients.
- under-20: ≤ 20 min.
- under-30: ≤ 30 min.
- no-limit: no constraint.

If "swapSlot" is set, return only that one meal in meals[] (a replacement), different from "swapAway". Otherwise return all four (breakfast, lunch, dinner, snack).

Avoid history.avoid foods. Favor history.loved when it fits the goal.

Return STRICT JSON:
{
  "headline": string,                  // e.g. "Here's your food plan for today"
  "goal": string,
  "meals": [
    {
      "slot": "breakfast" | "lunch" | "dinner" | "snack",
      "title": string,
      "why": string,                   // 1 sentence; mention which expiring/leftover/have items it rescues
      "time_minutes": number,
      "uses": string[],                // ingredients from haveIngredients/leftovers/expiringSoon
      "missing": string[],             // ingredients NOT in the user's lists
      "steps": string[]                // 3-6 short steps
    }
  ],
  "grocery_gap": string[],             // deduped union of all missing items, max 3
  "estimated_savings": string,         // short phrase, e.g. "~$8 saved by using leftovers"
  "encouragement": string              // 1 warm line
}`;

export const buildDayOfMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<DayPlan> => {
    const raw = await callGateway(SYSTEM, JSON.stringify(data));
    let parsed: DayPlan;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : ({} as DayPlan);
    }
    const meals = (parsed.meals ?? []).map((m) => ({
      slot: m.slot,
      title: m.title ?? "Meal",
      why: m.why ?? "",
      time_minutes: Number(m.time_minutes) || 15,
      uses: Array.isArray(m.uses) ? m.uses : [],
      missing: Array.isArray(m.missing) ? m.missing : [],
      steps: Array.isArray(m.steps) ? m.steps : [],
    }));
    return {
      headline: parsed.headline ?? "Here's your food plan for today.",
      goal: data.goal,
      meals,
      grocery_gap: (parsed.grocery_gap ?? []).slice(0, 3),
      estimated_savings: parsed.estimated_savings,
      encouragement: parsed.encouragement ?? "Small steps. Good food.",
    };
  });
