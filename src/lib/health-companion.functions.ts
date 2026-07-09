import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  mode: z.string(), // health category slug or "comfort" / "emergency" / "family"
  symptoms: z.array(z.string()).default([]),
  cravings: z.array(z.string()).default([]),
  energy: z.enum(["very-low", "low", "medium", "good"]).default("medium"),
  budget: z.boolean().default(false),
  haveIngredients: z.array(z.string()).default([]),
  missingOk: z.boolean().default(true),
  familyCount: z.number().int().min(1).max(12).default(1),
  familyTogether: z.boolean().default(false),
  history: z
    .object({
      worked: z.array(z.string()).default([]),
      rejected: z.array(z.string()).default([]),
      tolerated: z.array(z.string()).default([]),
      disliked: z.array(z.string()).default([]),
      comfortFavorites: z.array(z.string()).default([]),
      preferredPrepMinutes: z.number().optional(),
    })
    .default({ worked: [], rejected: [], tolerated: [], disliked: [], comfortFavorites: [] }),
  checkIn: z
    .object({
      feeling: z.string().optional(),
      appetite: z.string().optional(),
      energy: z.string().optional(),
      hydration: z.string().optional(),
    })
    .optional(),
  speed: z.enum(["5-minute", "15-minute", "30-minute", "no-rush", "normal"]).default("normal"),
});

export type HealthPlan = {
  title: string;
  why: string;
  time_minutes: number;
  steps: string[];
  ingredients_have: string[];
  ingredients_missing: string[];
  swaps: { missing: string; use_instead: string }[];
  family_adjustment?: string;
  encouragement: string;
  estimated_savings?: string;
  grocery_gap: string[];
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

export const healthCompanionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<HealthPlan> => {
    const sys = `You are Chef Super J's gentle Health Companion. You design ONE meal that fits the user's symptoms, energy, budget, and what they actually have.

Rules:
- Be warm, supportive, never preachy. One short encouragement line.
- Honor symptoms: nausea → bland/ginger/cold; mouth sores → soft, no acid/spice; swallowing trouble → pureed/soft; metallic taste → cold, citrus, plastic utensils tip; low appetite → small calorie-dense; constipation → fiber + fluids; diarrhea → BRAT (banana, rice, applesauce, toast); fatigue → 1-pot, minimal steps; dehydration → broths, watery fruit.
- Energy level limits steps: very-low ≤ 3 steps, low ≤ 5, medium ≤ 7, good no limit.
- Speed modes: "5-minute" ≤ 5 min and ≤ 3 ingredients, soft and calorie-dense; "15-minute" ≤ 15 min; "30-minute" ≤ 30 min; "no-rush" can be slow-cooked / batch-friendly; "normal" no constraint.
- Mix CRAVINGS with symptoms: warm/cold/salty/sweet/bland/crunchy/soft. Cravings shape texture & temperature; symptoms still constrain safety.
- Use ingredients the user HAS first. List any MISSING ingredients separately and propose smart SWAPS (softer / easier-to-digest / higher-calorie alternatives).
- grocery_gap: at most 2 items. Never overwhelm. If user has everything, return [].
- If familyCount > 1, add a family_adjustment describing how to scale the same base meal for the whole family while keeping the patient's portion gentle.
- If familyTogether=true, design ONE shared base meal everyone eats, and use family_adjustment to describe the gentle modification for the recovering person (softer, milder, smaller portion).
- Avoid foods listed in history.rejected and history.disliked. Lean toward history.worked, history.tolerated, and history.comfortFavorites. If preferredPrepMinutes is set, aim near that time.
- Use checkIn if present: low appetite → smaller calorie-dense; low energy → fewer steps; low hydration → add broth / watery fruit.
- If budget=true, estimate savings (e.g. "~$6 saved by using leftovers").

Return STRICT JSON matching this TypeScript type:
{
  title: string,
  why: string,
  time_minutes: number,
  steps: string[],
  ingredients_have: string[],
  ingredients_missing: string[],
  swaps: { missing: string, use_instead: string }[],
  family_adjustment?: string,
  encouragement: string,
  estimated_savings?: string,
  grocery_gap: string[]
}`;

    const user = JSON.stringify(data);
    const raw = await callGateway(sys, user);
    let parsed: HealthPlan;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : ({} as HealthPlan);
    }
    return {
      title: parsed.title ?? "Gentle bowl",
      why: parsed.why ?? "",
      time_minutes: parsed.time_minutes ?? 10,
      steps: parsed.steps ?? [],
      ingredients_have: parsed.ingredients_have ?? [],
      ingredients_missing: parsed.ingredients_missing ?? [],
      swaps: parsed.swaps ?? [],
      family_adjustment: parsed.family_adjustment,
      encouragement: parsed.encouragement ?? "You're doing great. One bite at a time.",
      estimated_savings: parsed.estimated_savings,
      grocery_gap: (parsed.grocery_gap ?? []).slice(0, 2),
    };
  });
