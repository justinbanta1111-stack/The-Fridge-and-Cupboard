import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SurpriseInput = z.object({
  diet: z.string().optional(),
  mood: z.string().optional(),
}).optional();

const TreasureInput = z.object({
  items: z.array(z.string().min(1)).min(2).max(40),
});

type RecipeIdea = {
  title: string;
  why: string;
  steps: string[];
  time_minutes: number;
};

type TreasureFind = {
  combo: string[];
  dish: string;
  twist: string;
};

async function callGateway(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured. Please try again later.");

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
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Chef is busy — too many requests. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep cooking.");
  if (!res.ok) throw new Error(`Chef couldn't think of one (${res.status}). Try again.`);

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "{}";
  return typeof text === "string" ? text : JSON.stringify(text);
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // try to extract first {...} block
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch { /* ignore */ }
    }
    return null;
  }
}

export const surpriseMeRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SurpriseInput.parse(input))
  .handler(async ({ data }): Promise<RecipeIdea> => {
    const diet = data?.diet ? ` Dietary note: ${data.diet}.` : "";
    const mood = data?.mood ? ` Mood: ${data.mood}.` : "";
    const system = "You are Chef Super J — 30 years pro kitchens, brain tumor survivor, Army Reserve, firefighter. Warm, encouraging, practical. You help people use what they already have. Always respond with VALID JSON only. No markdown.";
    const user = `Suggest ONE surprise recipe idea a typical home cook can make right now from common pantry/fridge items. Keep it doable in 30 minutes.${diet}${mood}
Respond as JSON: {"title": string, "why": string (1 short sentence), "steps": string[] (4-6 short steps), "time_minutes": number}.`;

    const raw = await callGateway(system, user);
    const parsed = safeParseJson<RecipeIdea>(raw);
    if (!parsed || !parsed.title || !Array.isArray(parsed.steps)) {
      throw new Error("Chef's idea got lost in translation. Try again.");
    }
    return {
      title: String(parsed.title).slice(0, 120),
      why: String(parsed.why ?? "").slice(0, 240),
      steps: parsed.steps.slice(0, 8).map((s) => String(s).slice(0, 240)),
      time_minutes: Number.isFinite(parsed.time_minutes) ? Math.max(5, Math.min(120, Math.round(parsed.time_minutes))) : 30,
    };
  });

export const pantryTreasureHunt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TreasureInput.parse(input))
  .handler(async ({ data }): Promise<{ finds: TreasureFind[] }> => {
    const system = "You are Chef Super J. You find hidden gems in ordinary pantries — surprising flavor combos and dishes people overlook. Warm, fun, practical. Always respond with VALID JSON only. No markdown.";
    const user = `Here are items in the user's kitchen: ${data.items.slice(0, 40).join(", ")}.
Find 3 "treasure" combos — unexpected pairings or overlooked dishes hiding in this pantry.
Respond as JSON: {"finds": [{"combo": string[] (2-4 items from the list), "dish": string, "twist": string (one sentence — why it's special)}]}.`;

    const raw = await callGateway(system, user);
    const parsed = safeParseJson<{ finds: TreasureFind[] }>(raw);
    if (!parsed || !Array.isArray(parsed.finds) || parsed.finds.length === 0) {
      throw new Error("No treasure today. Try scanning more items first.");
    }
    return {
      finds: parsed.finds.slice(0, 3).map((f) => ({
        combo: (Array.isArray(f.combo) ? f.combo : []).slice(0, 4).map((c) => String(c).slice(0, 60)),
        dish: String(f.dish ?? "").slice(0, 120),
        twist: String(f.twist ?? "").slice(0, 240),
      })),
    };
  });

const SubInput = z.object({
  ingredient: z.string().min(1).max(80),
  context: z.string().max(120).optional(),
});

export const ingredientSubstitute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubInput.parse(input))
  .handler(async ({ data }): Promise<{ subs: { name: string; ratio: string; note: string }[] }> => {
    const system = "You are Chef Super J. You suggest practical ingredient substitutions a home cook can pull off with common pantry items. Always respond with VALID JSON only. No markdown.";
    const ctx = data.context ? ` They're making: ${data.context}.` : "";
    const user = `The cook is out of: ${data.ingredient}.${ctx}
Give 3 substitutions ranked best to acceptable.
Respond as JSON: {"subs": [{"name": string (the substitute), "ratio": string (e.g. "1:1" or "use 3/4 of the amount"), "note": string (one short sentence — when to use it or what changes)}]}.`;

    const raw = await callGateway(system, user);
    const parsed = safeParseJson<{ subs: { name: string; ratio: string; note: string }[] }>(raw);
    if (!parsed || !Array.isArray(parsed.subs) || parsed.subs.length === 0) {
      throw new Error("Chef couldn't find a good swap. Try rephrasing.");
    }
    return {
      subs: parsed.subs.slice(0, 4).map((s) => ({
        name: String(s.name ?? "").slice(0, 80),
        ratio: String(s.ratio ?? "1:1").slice(0, 60),
        note: String(s.note ?? "").slice(0, 200),
      })),
    };
  });

const AskInput = z.object({
  question: z.string().min(2).max(400),
});

async function callGatewayText(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured. Please try again later.");

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
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Chef is busy — too many requests. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep cooking.");
  if (!res.ok) throw new Error(`Chef couldn't answer (${res.status}). Try again.`);

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  return typeof text === "string" ? text.trim() : "";
}

export const askChefSuperJ = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }): Promise<{ answer: string }> => {
    const system = `You are Chef Super J — Chef Justin Banta. 30 years in professional kitchens including The Plaza Hotel NYC, Executive Chef of three high-end kitchens, Army Reserve, firefighter, brain tumor survivor. Warm, direct, encouraging. Talk like a chef who actually wants people to succeed — not a textbook.

Rules:
- Answer ONLY cooking, food, kitchen, nutrition, food safety, food preservation, or meal-planning questions.
- If the question is off-topic (politics, medical advice, personal life), kindly say it's outside the kitchen and offer to help with food instead.
- Keep answers practical and actionable. 2-5 short paragraphs max. Use plain text, no markdown headers.
- When safety matters (raw meat, cross-contamination, hot oil), mention it.
- Don't pretend to be an AI or apologize. You're Chef Super J.`;

    const answer = await callGatewayText(system, data.question);
    if (!answer) throw new Error("Chef didn't have an answer this time. Try rephrasing.");
    return { answer: answer.slice(0, 2400) };
  });

