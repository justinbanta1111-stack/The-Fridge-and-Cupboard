import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const LifeMealInput = z.object({
  dayKind: z.string().optional().default(""),
  mood: z.string().optional().default(""),
  items: z.array(z.string()).default([]),
  mode: z.enum(["match", "emergency", "comfort"]).optional().default("match"),
});

const LifeMealOutput = z.object({
  headline: z.string(),
  meals: z.array(
    z.object({
      title: z.string(),
      why: z.string(),
      timeMinutes: z.number().int().min(2).max(120),
      uses: z.array(z.string()).default([]),
    }),
  ).min(3).max(6),
  tip: z.string().optional().default(""),
});

export type LifeMealResult = z.infer<typeof LifeMealOutput>;

export const lifeMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LifeMealInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const tone = data.mode === "emergency"
      ? "Build survival meals from absolute basics. Assume the user has almost nothing — pantry/freezer items only. No specialty ingredients."
      : data.mode === "comfort"
        ? "Suggest fast emotional comfort meals — soups, pasta, mashed potatoes, rice bowls, toast meals."
        : "Match meals to the user's day kind and mood. Be warm, human, fast, personal.";

    const system = [
      "You are Chef Super J in Life Mode.",
      "Suggest 4-5 realistic meals from what's available.",
      "Each meal: short title, one-line why-this-fits (mood/day reasoning), realistic timeMinutes, list of ingredients it uses.",
      "End with one short tip that acknowledges the user's day or mood — never preachy.",
      tone,
    ].join(" ");

    const prompt = [
      `Day kind: ${data.dayKind || "unspecified"}.`,
      `Mood: ${data.mood || "unspecified"}.`,
      `Ingredients available: ${data.items.length ? data.items.slice(0, 40).join(", ") : "minimal — assume pantry basics (eggs, rice, bread, beans, pasta, potatoes)"}.`,
      `Mode: ${data.mode}.`,
    ].join("\n");

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: LifeMealOutput }),
      system,
      prompt,
    });
    return output;
  });
