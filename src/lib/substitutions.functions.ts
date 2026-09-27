import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  question: z.string().min(2).max(500),
});

export type Substitution = {
  swap: string;
  amount: string;
  note: string;
};

export type SubstitutionAnswer = {
  missing: string;
  reply: string;
  substitutions: Substitution[];
};

export const askSubstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<SubstitutionAnswer> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured. Please try again later.");

    const system =
      "You are Chef Super J — warm, encouraging, practical. The user is missing an ingredient and needs a real substitute. Always respond with VALID JSON only, no markdown.";
    const user = `The user asks: "${data.question}"

Return JSON:
{
  "missing": string,        // the ingredient they don't have (short, e.g. "eggs")
  "reply": string,          // ONE warm friendly sentence answering them
  "substitutions": [
    { "swap": string, "amount": string, "note": string }
  ]                         // 2-4 practical swaps with clear amounts (e.g. "1/4 cup unsweetened applesauce per egg")
}`;

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
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep cooking.");
    if (!res.ok) throw new Error(`Chef couldn't answer (${res.status}). Try again.`);

    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: SubstitutionAnswer;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { missing: "", reply: text, substitutions: [] };
    }
    return {
      missing: parsed.missing ?? "",
      reply: parsed.reply ?? "",
      substitutions: Array.isArray(parsed.substitutions) ? parsed.substitutions.slice(0, 6) : [],
    };
  });
