import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Recipe + ingredient ideas for detected items, grouped by meal style
 * (American, Italian, Mexican, ...). Purely additive.
 */

const Input = z.object({
  items: z.array(z.string().min(1)).min(1).max(40),
  styles: z.array(z.string().min(1)).min(1).max(8),
  diet: z.string().max(200).optional(),
});

export type StyleIdea = {
  title: string;
  uses: string[];
  need: string[];
  why: string;
  time_minutes: number;
};

export type StyleGroup = {
  style: string;
  ideas: StyleIdea[];
};

async function callGateway(system: string, user: string): Promise<string> {
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
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Chef is busy — too many requests. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep cooking.");
  if (!res.ok) throw new Error(`Chef couldn't think of ideas (${res.status}). Try again.`);

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "{}";
  return typeof text === "string" ? text : JSON.stringify(text);
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);
const list = (v: unknown, max: number, len: number) =>
  (Array.isArray(v) ? v : []).slice(0, max).map((x) => str(x, len)).filter(Boolean);

export const styleIdeasForItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<{ groups: StyleGroup[] }> => {
    const system =
      "You are Chef Super J — 30 years in professional kitchens. Warm, practical, no fluff. You build real meals out of the food someone already has. Always respond with VALID JSON only. No markdown.";

    const diet = data.diet ? `\nDietary needs to respect: ${data.diet}.` : "";
    const user = `Detected food items: ${data.items.join(", ")}.
Meal styles to cover: ${data.styles.join(", ")}.${diet}

For EACH meal style, give 3 recipe ideas built mainly from the detected items.
For each idea list which detected items it uses, and the few extra ingredients still needed (empty array if none).
Respond as JSON: {"groups":[{"style": string, "ideas":[{"title": string, "uses": string[], "need": string[], "why": string (one short sentence), "time_minutes": number}]}]}`;

    const raw = await callGateway(system, user);
    const parsed = safeParse<{ groups: StyleGroup[] }>(raw);
    if (!parsed || !Array.isArray(parsed.groups) || parsed.groups.length === 0) {
      throw new Error("Chef couldn't put a menu together. Try again.");
    }

    return {
      groups: parsed.groups.slice(0, 8).map((g) => ({
        style: str(g.style, 40),
        ideas: (Array.isArray(g.ideas) ? g.ideas : []).slice(0, 4).map((i) => ({
          title: str(i.title, 120),
          uses: list(i.uses, 12, 60),
          need: list(i.need, 12, 60),
          why: str(i.why, 200),
          time_minutes: Number.isFinite(i.time_minutes)
            ? Math.max(5, Math.min(180, Math.round(i.time_minutes)))
            : 30,
        })).filter((i) => i.title),
      })).filter((g) => g.style && g.ideas.length > 0),
    };
  });
