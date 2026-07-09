import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

// ---------- Recipe card OCR + organize ----------
const CardInput = z.object({
  imageDataUrl: z.string().min(20), // data:image/...;base64,...
});

const CardOutput = z.object({
  title: z.string(),
  source: z.enum(["grandma", "grandpa", "mom", "dad", "family", "church", "passed-down", "handwritten", "other"]).default("handwritten"),
  ingredients: z.string().default(""),
  instructions: z.string().default(""),
  notes: z.string().default(""),
});

export type LegacyCardResult = z.infer<typeof CardOutput>;

export const readRecipeCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CardInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      messages: [
        {
          role: "system",
          content:
            "You read handwritten, printed, or family recipe cards. Transcribe carefully, preserving original measurements and the writer's voice. Organize into title, ingredients (one per line), instructions (numbered steps), and notes (anything personal — names, stories, dates).",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this family recipe card. Return structured JSON. If you can't tell the title, name it after a key ingredient." },
            { type: "image_url", image_url: { url: data.imageDataUrl } } as any,
          ],
        },
      ],
      output: Output.object({ schema: CardOutput }),
    });
    return output;
  });

// ---------- Legacy Meal Builder ("What reminds you of home?") ----------
const RebuildInput = z.object({
  memory: z.string().min(2), // "Mom's chicken soup"
  items: z.array(z.string()).default([]),
});

const RebuildOutput = z.object({
  headline: z.string(),
  meals: z
    .array(
      z.object({
        title: z.string(),
        why: z.string(),
        ingredients: z.array(z.string()).default([]),
        steps: z.array(z.string()).default([]),
      }),
    )
    .min(1)
    .max(4),
  emotionalNote: z.string().default(""),
});

export type LegacyRebuildResult = z.infer<typeof RebuildOutput>;

export const rebuildMemoryMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RebuildInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: RebuildOutput }),
      prompt: `A user is trying to recreate a meal that reminds them of home or someone they love.

Memory: "${data.memory}"
Available ingredients: ${data.items.length ? data.items.join(", ") : "(unknown — assume common pantry)"}

Help them rebuild a similar dish using what they have. Be warm and emotional but practical. Suggest 2-3 honest variations. Include a short emotional note acknowledging why this meal matters.`,
    });
    return output;
  });
