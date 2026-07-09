import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function callJson(system: string, user: string): Promise<any> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
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
  if (res.status === 429) throw new Error("Chef is busy. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) throw new Error(`Chef stalled (${res.status}).`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return typeof text === "string" ? JSON.parse(text) : text;
  } catch {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* */ }
    }
    throw new Error("Chef's reply was garbled. Try again.");
  }
}

const Items = z.object({
  items: z.array(z.string().min(1)).min(1).max(50),
  servings: z.number().int().min(1).max(200).optional(),
});

export const budgetMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Items.parse(input))
  .handler(async ({ data }): Promise<{
    meals: { title: string; cost_per_serving: string; uses: string[]; why_cheap: string; needs_shopping: boolean }[];
  }> => {
    const system = "You are Chef Super J — frugal, smart, kind. Always respond with VALID JSON only. No markdown.";
    const user = `Pantry/fridge items: ${data.items.join(", ")}.
Suggest 3 cheap meals using mostly these items. Estimate US cost per serving in dollars (e.g. "$1.40").
Respond as JSON: {"meals":[{"title":string,"cost_per_serving":string,"uses":string[] (items used),"why_cheap":string (one sentence),"needs_shopping":boolean (false if 100% from list)}]}.`;
    const parsed = await callJson(system, user);
    const meals = Array.isArray(parsed?.meals) ? parsed.meals.slice(0, 4) : [];
    if (!meals.length) throw new Error("No budget ideas. Add more items.");
    return {
      meals: meals.map((m: any) => ({
        title: String(m.title ?? "").slice(0, 120),
        cost_per_serving: String(m.cost_per_serving ?? "").slice(0, 24),
        uses: Array.isArray(m.uses) ? m.uses.slice(0, 8).map((u: any) => String(u).slice(0, 60)) : [],
        why_cheap: String(m.why_cheap ?? "").slice(0, 200),
        needs_shopping: Boolean(m.needs_shopping),
      })),
    };
  });

const EmergencyInput = z.object({
  items: z.array(z.string().min(1)).min(1).max(8),
});

export const emergencyMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EmergencyInput.parse(input))
  .handler(async ({ data }): Promise<{ title: string; steps: string[]; time_minutes: number; pep_talk: string }> => {
    const system = "You are Chef Super J. The cook has barely anything. Be encouraging, fast, real. Always respond with VALID JSON only.";
    const user = `Only ingredients: ${data.items.join(", ")}. Plus assume basic salt, pepper, oil, water.
Give ONE meal they can make right now in under 20 minutes.
Respond as JSON: {"title":string,"steps":string[] (3-5 steps),"time_minutes":number,"pep_talk":string (one warm sentence)}.`;
    const parsed = await callJson(system, user);
    if (!parsed?.title) throw new Error("Chef's brain blanked. Try again.");
    return {
      title: String(parsed.title).slice(0, 120),
      steps: (Array.isArray(parsed.steps) ? parsed.steps : []).slice(0, 6).map((s: any) => String(s).slice(0, 240)),
      time_minutes: Number.isFinite(parsed.time_minutes) ? Math.max(5, Math.min(60, Math.round(parsed.time_minutes))) : 15,
      pep_talk: String(parsed.pep_talk ?? "").slice(0, 200),
    };
  });

const FlavorInput = z.object({
  ingredient: z.string().min(1).max(80),
});

export const flavorPairings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FlavorInput.parse(input))
  .handler(async ({ data }): Promise<{ pairings: { name: string; type: string; why: string }[] }> => {
    const system = "You are Chef Super J. You know flavor science cold. Always respond with VALID JSON only.";
    const user = `Ingredient: ${data.ingredient}.
List 6 great pairings — herbs, spices, oils, sauces, acids, seasonings. Mix types.
Respond as JSON: {"pairings":[{"name":string,"type":string (herb|spice|oil|sauce|acid|seasoning|aromatic),"why":string (one short sentence)}]}.`;
    const parsed = await callJson(system, user);
    const pairings = Array.isArray(parsed?.pairings) ? parsed.pairings.slice(0, 8) : [];
    if (!pairings.length) throw new Error("No pairings found.");
    return {
      pairings: pairings.map((p: any) => ({
        name: String(p.name ?? "").slice(0, 60),
        type: String(p.type ?? "").slice(0, 24),
        why: String(p.why ?? "").slice(0, 200),
      })),
    };
  });

const PrepInput = z.object({
  items: z.array(z.string().min(1)).min(1).max(40),
  people: z.number().int().min(1).max(20).optional(),
  days: z.number().int().min(2).max(7).optional(),
});

export const mealPrepPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PrepInput.parse(input))
  .handler(async ({ data }): Promise<{
    batches: { title: string; makes_servings: number; freezer_friendly: boolean; steps: string[] }[];
    weekly_tip: string;
  }> => {
    const system = "You are Chef Super J. Master of batch cooking and freezer meals. Always respond with VALID JSON only.";
    const people = data.people ?? 4;
    const days = data.days ?? 5;
    const user = `Plan ${days} days of meal prep for ${people} people from: ${data.items.join(", ")}.
Give 3 batch recipes that cover most meals, with leftover plan ideas.
Respond as JSON: {"batches":[{"title":string,"makes_servings":number,"freezer_friendly":boolean,"steps":string[] (3-5 steps)}],"weekly_tip":string (one sentence)}.`;
    const parsed = await callJson(system, user);
    const batches = Array.isArray(parsed?.batches) ? parsed.batches.slice(0, 4) : [];
    if (!batches.length) throw new Error("Couldn't plan prep. Try again.");
    return {
      batches: batches.map((b: any) => ({
        title: String(b.title ?? "").slice(0, 120),
        makes_servings: Number.isFinite(b.makes_servings) ? Math.max(1, Math.round(b.makes_servings)) : people * 2,
        freezer_friendly: Boolean(b.freezer_friendly),
        steps: (Array.isArray(b.steps) ? b.steps : []).slice(0, 6).map((s: any) => String(s).slice(0, 240)),
      })),
      weekly_tip: String(parsed.weekly_tip ?? "").slice(0, 240),
    };
  });

const LeftoverInput = z.object({
  meal: z.string().min(2).max(120),
});

export const leftoverTransform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LeftoverInput.parse(input))
  .handler(async ({ data }): Promise<{ transforms: { new_meal: string; how: string; bonus_items: string[] }[] }> => {
    const system = "You are Chef Super J. You turn leftovers into brand new meals. Always respond with VALID JSON only.";
    const user = `Leftover meal/ingredient: ${data.meal}.
Give 3 totally different new meals you can make from it.
Respond as JSON: {"transforms":[{"new_meal":string,"how":string (1-2 sentences),"bonus_items":string[] (extra pantry items needed, may be empty)}]}.`;
    const parsed = await callJson(system, user);
    const tr = Array.isArray(parsed?.transforms) ? parsed.transforms.slice(0, 4) : [];
    if (!tr.length) throw new Error("No transforms found. Try a different leftover.");
    return {
      transforms: tr.map((t: any) => ({
        new_meal: String(t.new_meal ?? "").slice(0, 120),
        how: String(t.how ?? "").slice(0, 280),
        bonus_items: Array.isArray(t.bonus_items) ? t.bonus_items.slice(0, 6).map((b: any) => String(b).slice(0, 60)) : [],
      })),
    };
  });
