import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { HUMOR_RULES } from "./chef-humor-prompt";
import { RECIPE_LOCK_RULES } from "./recipe-lock-prompt";

const Input = z.object({
  question: z.string().min(2).max(400),
  title: z.string().max(160).default(""),
  steps: z.array(z.string().max(400)).max(30).default([]),
  stepIndex: z.number().int().min(0).max(29).default(0),
  scale: z.number().min(0.25).max(8).default(1),
  restrictions: z.array(z.string().max(60)).max(20).default([]),
});

const Shape = z.object({
  answer: z
    .string()
    .describe(
      "One or two short spoken sentences answering them right now, mid-cook. Plain text, contractions, no markdown, no lists.",
    ),
  scale: z
    .number()
    .describe(
      "The new batch multiplier if they asked to double, halve or change servings (e.g. 2, 0.5). Otherwise repeat the current multiplier unchanged.",
    ),
  restateStep: z
    .boolean()
    .describe("True only if the current step should be read again after the answer (e.g. quantities changed)."),
  advance: z
    .boolean()
    .describe(
      "Almost always false. True ONLY if they explicitly said they finished this step and are ready for the next one. Never true just because the answer is complete.",
    ),
});

export type CookStepHelp = z.infer<typeof Shape>;

/**
 * Answers a question asked out loud in the middle of a step, and handles
 * quantity/serving tweaks. Navigation ("next", "back", "repeat") is handled
 * locally in the UI — this only runs for real questions.
 */
export const cookStepHelp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<CookStepHelp> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Please try again later.");

    const system = [
      "You are Chef Super J standing beside someone who is cooking RIGHT NOW, hands busy, listening — not reading.",
      "Answer only what they asked, in short spoken sentences. Lead with the answer. No markdown, no lists, no headings, no emojis. Use contractions.",
      "Keep it brief by default, but never skip a temperature, measurement, timing, container or doneness sign they need to do the step right — say those out loud even if it takes a few more sentences.",
      "You know the whole recipe, so you can answer about upcoming steps, substitutions, doneness, timing, temperature, pan size, and what to do while waiting.",
      "If they ask to double, halve, or cook for a different number of people, work out the new amounts for the CURRENT step and say them plainly, and set the new multiplier.",
      "If something is going wrong (too salty, too thin, burning, sticking), give the fastest fix first.",
      "Mention food safety only when it genuinely matters (raw meat, hot oil, undercooked poultry).",
      "Never re-read the whole recipe. Never ask more than one short follow-up question, and only if you truly can't answer without it.",
      "They can interrupt you at any moment with any question. Answer it, then hand the kitchen straight back to them at the step they were on. Never move them forward yourself.",
      "Give ONE instruction at a time. Never stack two steps into one answer, never read ahead, never rush them.",
      "Many people cooking with you are still learning. Be patient, plain-spoken and encouraging.",
      ...RECIPE_LOCK_RULES,
      ...HUMOR_RULES,
    ].join("\n");

    const numbered = data.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const prompt = [
      data.title ? `LOCKED RECIPE (do not change): ${data.title}` : "",
      data.restrictions.length
        ? `ACTIVE RESTRICTIONS (never violate): ${data.restrictions.join(", ")}.`
        : "",
      `Full steps:\n${numbered || "(none provided)"}`,
      `They are on step ${data.stepIndex + 1}: ${data.steps[data.stepIndex] ?? "(unknown)"}`,
      `Current batch multiplier: ${data.scale}x`,
      `They just said: "${data.question}"`,
    ]
      .filter(Boolean)
      .join("\n");

    const { output } = await generateText({
      model: createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview"),
      output: Output.object({ schema: Shape }),
      maxRetries: 1,
      system,
      prompt,
    });

    const nextScale = Number.isFinite(output.scale) ? Math.min(8, Math.max(0.25, output.scale)) : data.scale;
    return { ...output, scale: nextScale };
  });
