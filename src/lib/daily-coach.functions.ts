import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const CoachInput = z.object({
  goal: z.string().optional().default(""),
  mostUsed: z.array(z.string()).default([]),
  mostWasted: z.array(z.string()).default([]),
  recentItems: z.array(z.string()).default([]),
  skill: z.enum(["beginner", "comfortable", "advanced"]).optional().default("comfortable"),
});

const CoachOutput = z.object({
  encouragement: z.string(),
  improvementTips: z.array(z.string()).min(2).max(5),
  confidenceTips: z.array(z.string()).min(2).max(5),
  todaySuggestion: z.string(),
});

export type CoachAdvice = z.infer<typeof CoachOutput>;

export const coachAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoachInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = [
      "You are Chef Super J acting as a warm, encouraging kitchen coach.",
      "Speak like a real coach: short, kind, useful. Never lecture. Never moralize.",
      "Give 3 improvementTips that target the user's actual waste/use patterns.",
      "Give 3 confidenceTips a beginner can use today (why ingredients work, prep shortcut, substitution).",
      "Keep each tip to one short sentence.",
    ].join(" ");

    const prompt = [
      `Today's goal: ${data.goal || "not set"}.`,
      `Most used ingredients: ${data.mostUsed.join(", ") || "unknown"}.`,
      `Most wasted ingredients: ${data.mostWasted.join(", ") || "none recorded"}.`,
      `In the kitchen right now: ${data.recentItems.slice(0, 20).join(", ") || "unknown"}.`,
      `Cook skill: ${data.skill}.`,
      "Coach the user for today.",
    ].join("\n");

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: CoachOutput }),
      system,
      prompt,
    });

    return output;
  });
