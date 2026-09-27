import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { languageName } from "@/lib/i18n/languages";

const InsightInput = z.object({
  food: z.string().min(1).max(120),
  question: z.string().max(300).optional(),
  language: z.string().min(2).max(12).optional(),
});

const InsightShape = z.object({
  summary: z
    .string()
    .describe("Two or three warm, plain-language sentences about this food overall. Balanced, never alarmist."),
  nutrition: z
    .array(z.string())
    .min(2)
    .max(6)
    .describe("Short plain lines about notable nutrients — vitamins, minerals, protein, fiber, fats, carbs, sugar, sodium."),
  benefits: z.array(z.string()).min(1).max(5).describe("Short lines on common benefits."),
  considerations: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Short, calm lines on downsides, portion size, moderation, or common dietary considerations."),
  portion: z.string().describe("One short sentence on a typical, sensible portion."),
  sources: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe(
      "Credible general reference sources for this food's nutrition information (e.g., USDA FoodData Central, NIH Office of Dietary Supplements, FDA Nutrition Facts). Only well-known public sources; no fabricated URLs."
    ),
});

export type FoodInsight = z.infer<typeof InsightShape>;

/**
 * Background "Food Insights" capability: general food & nutrition information
 * on request only. Never medical advice, never shown automatically after a scan.
 */
export const getFoodInsights = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InsightInput.parse(input))
  .handler(async ({ data }): Promise<FoodInsight> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const system = [
      "You are Chef Super J sharing general food and nutrition information — friendly, balanced, easy to understand.",
      "Plain conversational language. No markdown, no emojis, no headings inside the text.",
      "Be accurate and even-handed: real benefits, real considerations, no scare tactics, no hype, no moralizing about food.",
      "Talk about typical amounts and portions rather than absolutes.",
      "HEALTH SAFETY: this is general food information, not medical advice. Never diagnose, never tell anyone to start or stop medication, never make unsupported medical claims.",
      "If the answer depends heavily on a medical condition, medication, allergy or individual situation, say plainly that individual circumstances change the answer and suggest checking with a doctor or registered dietitian.",
      data.language && !data.language.toLowerCase().startsWith("en")
        ? `LANGUAGE: write entirely in ${languageName(data.language)} (locale ${data.language}).`
        : "LANGUAGE: write in English.",
    ].join("\n");

    const prompt = [
      `Food or ingredient: ${data.food}.`,
      data.question ? `They specifically asked: ${data.question}` : "Give them a useful general overview.",
    ].join("\n");

    const { output } = await generateText({
      model: createLovableAiGatewayProvider(key)("google/gemini-3.1-flash-lite"),
      output: Output.object({ schema: InsightShape }),
      timeout: { totalMs: 15_000 },
      maxRetries: 1,
      system,
      prompt,
    });

    return output;
  });
