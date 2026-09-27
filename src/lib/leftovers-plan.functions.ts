import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { languageName } from "@/lib/i18n/languages";

export type LeftoverIdea = {
  title: string;
  time: string;
  how: string;
};

export type LeftoverPlan = {
  headline: string;
  ideas: LeftoverIdea[];
};

/**
 * A short "what I can make" plan for ONE item that needs using up.
 * Purely additive — nothing else in the app depends on it.
 */
export const planLeftoverItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        item: z.string().min(1).max(80),
        urgency: z.enum(["red", "orange", "yellow", "green"]).optional(),
        reason: z.string().max(120).optional(),
        alsoHave: z.array(z.string().min(1).max(80)).max(20).optional(),
        restrictions: z.array(z.string().max(60)).max(20).optional(),
        language: z.string().min(2).max(12).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<LeftoverPlan> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const shape = z.object({
      headline: z
        .string()
        .describe("One short spoken sentence from the chef about using this item up. Plain text."),
      ideas: z
        .array(
          z.object({
            title: z.string().describe("Short dish name, no markdown"),
            time: z.string().describe("Rough time, e.g. '15 min'"),
            how: z.string().describe("One sentence on how to make it, using what they already have"),
          }),
        )
        .length(3)
        .describe("Three quick things they can make with this item, easiest first."),
    });

    const system = [
      "You are Chef Super J — a warm, experienced human chef helping someone use up food before it goes bad.",
      "Sound spoken and casual. Use contractions. No markdown, no lists, no emojis, no headings.",
      "Give exactly three realistic things they can make that CENTER on the named item.",
      "Lean on the other food they already have. Never send them shopping for more than one common staple.",
      "Keep each 'how' to one clear sentence. Keep the headline to one short sentence.",
      data.restrictions?.length
        ? `DIETARY (respect silently): ${data.restrictions.join(", ")}.`
        : "",
      data.language && !data.language.toLowerCase().startsWith("en")
        ? `LANGUAGE: write entirely in ${languageName(data.language)} (locale ${data.language}).`
        : "LANGUAGE: write in English.",
    ]
      .filter(Boolean)
      .join("\n");

    const userLines = [
      `Item that needs using up: ${data.item}.`,
      data.reason ? `Why now: ${data.reason}.` : "",
      data.urgency === "red" ? "It needs to be cooked today." : "",
      data.alsoHave?.length ? `Also in their kitchen: ${data.alsoHave.slice(0, 15).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { output } = await generateText({
        model: createLovableAiGatewayProvider(key)("google/gemini-3.1-flash-lite"),
        output: Output.object({ schema: shape }),
        timeout: { totalMs: 12_000 },
        maxRetries: 1,
        temperature: 1,
        system,
        messages: [{ role: "user", content: userLines }],
      });
      return output;
    } catch {
      const item = data.item;
      return {
        headline: `Let's get that ${item} used up tonight.`,
        ideas: [
          { title: `Quick ${item} skillet`, time: "15 min", how: `Sear the ${item} hot and fast, then finish with whatever aromatics you've got.` },
          { title: `${item} fried rice or grain bowl`, time: "20 min", how: `Chop the ${item} small and fold it through a hot pan of rice or grains.` },
          { title: `${item} soup`, time: "30 min", how: `Simmer the ${item} with stock and any tired vegetables, then season well.` },
        ],
      };
    }
  });
