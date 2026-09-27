import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { languageName } from "@/lib/i18n/languages";
import { EXPERIENCE_RULES } from "@/lib/chef-experiences-prompt";

const ReactInput = z.object({
  items: z.array(z.string().min(1).max(80)).min(1).max(40),
  useFirst: z.array(z.string().min(1).max(80)).max(10).optional(),
  storage: z.string().max(40).optional(),
  restrictions: z.array(z.string()).max(20).optional(),
  language: z.string().min(2).max(12).optional(),
});

const PlanItem = z.object({
  when: z.string().describe("'Cook first', 'Cook second' or 'Cook last'"),
  title: z.string().describe("Short meal name, no markdown"),
  why: z.string().describe("One short spoken sentence: what it uses up and why now"),
});

const ReactShape = z.object({
  reaction: z
    .string()
    .describe(
      "Two or three short spoken sentences reacting to the food, like a chef standing beside the user. Plain text only.",
    ),
  plan: z
    .array(PlanItem)
    .length(3)
    .describe("Exactly three meal options in cooking order: first, second, last."),
  question: z
    .string()
    .describe("One short, natural follow-up question that moves the cooking decision forward."),
});


export type ChefScanReaction = z.infer<typeof ReactShape>;

/**
 * A warm, human first reaction to what the user just showed the chef.
 * Purely additive: scan results, recipes and the voice system are untouched.
 */
export const reactToScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReactInput.parse(input))
  .handler(async ({ data }): Promise<ChefScanReaction> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const system = [
      "You are Chef Super J — an experienced, warm, real human chef who is standing right next to the user, looking at the same food they just showed you.",
      "You just glanced at what they have. React the way a real chef would: quick, confident, encouraging, specific.",
      "Sound spoken and casual. Always use contractions. No markdown, no lists, no emojis, no headings.",
      "Be SPECIFIC about their actual food — name one or two real items, and say which one you'd cook first and why (freshness, or it makes the best meal).",
      "Give a sense of possibility: how many good meals are realistically here, or the strongest direction.",
      "Keep the reaction short — two or three sentences max. Never dump a full recipe there.",
      "Then give EXACTLY THREE meal options in cooking order in the 'plan' field: 'Cook first', 'Cook second', 'Cook last'. First uses whatever needs using up soonest; last uses the longest-lasting food. Each one: a short meal name and one spoken sentence saying what it uses up and why it's timed that way. Same warm chef tone, contractions, no markdown.",
      "Respect their constraints (time, diet, dislikes) silently in all three options.",
      "Vary your wording every single time. Never sound scripted, templated or repetitive. Do not start with the same phrase you would obviously default to.",
      "Never scold the user about what they don't have. Never mention that you are an AI or that a scan happened.",
      ...EXPERIENCE_RULES,
      "End with ONE short natural question that helps them decide — for example whether they want something quick, healthy, or comforting, or which ingredient they want to build around. Put that question in the 'question' field, not in 'reaction'.",

      data.language && !data.language.toLowerCase().startsWith("en")
        ? `LANGUAGE: write entirely in ${languageName(data.language)} (locale ${data.language}).`
        : "LANGUAGE: write in English.",
      data.restrictions?.length ? `DIETARY (respect silently): ${data.restrictions.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const userLines = [
      data.storage ? `They just showed you their ${data.storage}.` : "They just showed you their food.",
      `What's there: ${data.items.slice(0, 25).join(", ")}.`,
      data.useFirst?.length ? `Should be used first: ${data.useFirst.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { output } = await generateText({
        model: createLovableAiGatewayProvider(key)("google/gemini-3.1-flash-lite"),
        output: Output.object({ schema: ReactShape }),
        timeout: { totalMs: 12_000 },
        maxRetries: 1,
        temperature: 1,
        system,
        messages: [{ role: "user", content: userLines }],
      });
      return output;
    } catch {
      // Never block the scan results on this — fall back quietly.
      const first = data.useFirst?.[0] ?? data.items[0];
      const second = data.items[1] ?? first;
      const third = data.items[2] ?? second;
      return {
        reaction: `Alright, there's a real meal in here — I'd start with that ${first}.`,
        plan: [
          { when: "Cook first", title: `Simple ${first} skillet`, why: `That ${first} won't wait, so let's use it tonight.` },
          { when: "Cook second", title: `${second} rice bowl`, why: `The ${second} holds another day, so it's next up.` },
          { when: "Cook last", title: `Hearty ${third} bake`, why: `The ${third} keeps longest, so save it for later in the week.` },
        ],
        question: "Want something quick, something healthy, or proper comfort food?",
      };

    }
  });
