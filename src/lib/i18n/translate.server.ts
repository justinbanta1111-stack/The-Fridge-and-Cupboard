import { generateText, Output } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { languageName } from "./languages";

const Shape = z.object({
  translations: z.array(z.string()).describe("Translated strings, same order and count as the input."),
});

/**
 * Translate a batch of short UI / recipe strings into the target language.
 * Falls back to the original English strings whenever the model is unavailable
 * so the interface never renders blank.
 */
export async function translateBatch(texts: string[], target: string): Promise<string[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key || texts.length === 0) return texts;

  const name = languageName(target);
  const system = [
    `You are a professional culinary translator. Translate each numbered line from English into ${name} (locale code ${target}).`,
    "Rules:",
    "- Return exactly the same number of strings, in the same order.",
    "- Translate naturally for a home-cooking app; keep it warm and conversational, not literal.",
    "- Use the cooking vocabulary a native speaker of that region actually uses.",
    "- Keep brand names as-is: 'The Fridge & Cupboard', 'Chef Super J'.",
    "- Preserve numbers, punctuation style, emoji, and any {placeholders} or HTML-like tags exactly.",
    "- Never add commentary, quotes, or numbering to the output strings.",
  ].join("\n");

  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");

  try {
    const { output } = await generateText({
      model: createLovableAiGatewayProvider(key)("google/gemini-3.1-flash-lite"),
      output: Output.object({ schema: Shape }),
      timeout: { totalMs: 20_000 },
      maxRetries: 1,
      system,
      messages: [{ role: "user", content: numbered }],
    });
    const out = output.translations ?? [];
    return texts.map((original, i) => {
      const translated = out[i];
      return typeof translated === "string" && translated.trim() ? translated.trim() : original;
    });
  } catch {
    return texts;
  }
}
