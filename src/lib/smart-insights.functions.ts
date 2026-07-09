import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const HiddenPotentialInput = z.object({
  items: z.array(z.string()).min(1).max(60),
  funnyChef: z.boolean().optional().default(false),
});

const HiddenPotentialOutput = z.object({
  headline: z.string(),
  meals: z.array(
    z.object({
      title: z.string(),
      tagline: z.string(),
      usesItems: z.array(z.string()).default([]),
      missingOne: z.string().optional().default(""),
    }),
  ).min(3).max(8),
});

export type HiddenPotentialResult = z.infer<typeof HiddenPotentialOutput>;

export const hiddenPotential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HiddenPotentialInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = [
      "You are Chef Super J — finding hidden potential in a fridge and pantry.",
      "Return 5-7 surprising but realistic meal directions you can build from these ingredients.",
      "Each meal: short title, one-line tagline, list the 2-4 items it uses, and OPTIONALLY one extra item that would unlock it (if missing).",
      data.funnyChef
        ? "Use playful, slightly cheeky chef phrases (PG-13, never mean)."
        : "Keep tone warm, smart, encouraging.",
    ].join(" ");

    const prompt = `Ingredients on hand: ${data.items.join(", ")}.\nFind hidden potential — creative but doable combinations.`;

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: HiddenPotentialOutput }),
      system,
      prompt,
    });

    return output;
  });
