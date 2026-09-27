import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { languageName } from "@/lib/i18n/languages";

export const COOK_METHODS = [
  "any",
  "stovetop",
  "oven",
  "air-fryer",
  "slow-cooker",
  "microwave",
  "no-cook",
] as const;

export type CookMethod = (typeof COOK_METHODS)[number];

export type LeftoverRecipe = {
  title: string;
  method: string;
  time: string;
  servings: string;
  blurb: string;
  uses: string[];
  alsoNeed: string[];
  steps: string[];
  chefTip: string;
};

export type LeftoverMealBuild = {
  headline: string;
  recipes: LeftoverRecipe[];
};

const Input = z.object({
  items: z.array(z.string().min(1).max(80)).min(1).max(12),
  alsoHave: z.array(z.string().min(1).max(80)).max(25).optional(),
  method: z.enum(COOK_METHODS).default("any"),
  maxMinutes: z.number().int().min(5).max(180).default(30),
  servings: z.number().int().min(1).max(12).default(2),
  restrictions: z.array(z.string().max(60)).max(20).optional(),
  language: z.string().min(2).max(12).optional(),
});

/**
 * Leftovers-first meal builder: takes the items that need using up and returns
 * three full step-by-step recipes, each with a different cooking option.
 * Purely additive — nothing else depends on it.
 */
export const buildLeftoverMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LeftoverMealBuild> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Please try again later.");

    const shape = z.object({
      headline: z
        .string()
        .describe("One short spoken sentence from the chef about what to rescue first. Plain text."),
      recipes: z
        .array(
          z.object({
            title: z.string().describe("Short appetising dish name, no markdown"),
            method: z
              .string()
              .describe("The cooking option used, e.g. 'Stovetop', 'Oven', 'Air fryer', 'No-cook'"),
            time: z.string().describe("Total time, e.g. '25 min'"),
            servings: z.string().describe("How many it feeds, e.g. 'Serves 2'"),
            blurb: z.string().describe("One sentence on why this rescues the food that's going first."),
            uses: z
              .array(z.string())
              .describe("Which of their soon-to-expire items this recipe uses up."),
            alsoNeed: z
              .array(z.string())
              .describe("Common staples they'd also need. Keep it to a couple of basics, or empty."),
            steps: z
              .array(z.string())
              .describe(
                "Six to nine numbered-free steps, each one clear spoken sentence with real temps, times and cues. No markdown.",
              ),
            chefTip: z.string().describe("One short practical tip or leftover-storage note."),
          }),
        )
        .length(3)
        .describe("Three different ways to cook, easiest first."),
    });

    const system = [
      "You are Chef Super J — a warm, experienced human chef helping someone cook the food that's about to go bad.",
      "Sound spoken and casual. Use contractions. No markdown, no emojis, no headings, no step numbers inside the text.",
      "Every recipe must CENTER on the items that need using up. Prioritise the most urgent ones.",
      "Steps must be genuinely followable hands-free: one action each, with pan heat, temperature, timing and a doneness cue.",
      "Never send them shopping for more than two common staples.",
      data.method !== "any"
        ? `COOKING OPTION: all three recipes must use the ${data.method.replace("-", " ")}, varied in style.`
        : "COOKING OPTION: use three different cooking methods across the three recipes.",
      `TIME: keep each recipe at or under about ${data.maxMinutes} minutes.`,
      `SERVINGS: cook for ${data.servings}.`,
      data.restrictions?.length ? `DIETARY (respect silently): ${data.restrictions.join(", ")}.` : "",
      data.language && !data.language.toLowerCase().startsWith("en")
        ? `LANGUAGE: write entirely in ${languageName(data.language)} (locale ${data.language}).`
        : "LANGUAGE: write in English.",
    ]
      .filter(Boolean)
      .join("\n");

    const userLines = [
      `Needs using up first: ${data.items.join(", ")}.`,
      data.alsoHave?.length ? `Also in their kitchen: ${data.alsoHave.slice(0, 20).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { output } = await generateText({
        model: createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview"),
        output: Output.object({ schema: shape }),
        timeout: { totalMs: 28_000 },
        maxRetries: 1,
        temperature: 1,
        system,
        messages: [{ role: "user", content: userLines }],
      });
      return {
        headline: output.headline,
        recipes: output.recipes.map((r) => ({
          ...r,
          uses: r.uses.slice(0, 12),
          alsoNeed: r.alsoNeed.slice(0, 6),
          steps: r.steps.filter((s) => s.trim()).slice(0, 12),
        })),
      };
    } catch {
      const first = data.items[0] ?? "your leftovers";
      const rest = data.items.slice(1, 4).join(", ") || "whatever else is open";
      const base = (method: string, time: string, steps: string[]): LeftoverRecipe => ({
        title: `${method} ${first} rescue`,
        method,
        time,
        servings: `Serves ${data.servings}`,
        blurb: `Built around the ${first} that needs cooking first.`,
        uses: data.items.slice(0, 5),
        alsoNeed: ["olive oil", "salt and pepper"],
        steps,
        chefTip: "Cool leftovers fast and they'll keep another three days in the fridge.",
      });
      return {
        headline: `Let's get that ${first} cooked tonight.`,
        recipes: [
          base("Stovetop", "20 min", [
            `Chop the ${first} into bite-size pieces and pat it dry.`,
            "Heat a wide pan over medium-high with a good glug of oil until it shimmers.",
            `Sear the ${first} in one layer for three to four minutes without moving it.`,
            `Add ${rest}, stir, and cook another three minutes until everything softens.`,
            "Season with salt, pepper, and a splash of water to loosen the pan.",
            "Taste, adjust the salt, and serve straight from the pan while it's hot.",
          ]),
          base("Oven", "30 min", [
            "Heat the oven to 425°F and slide a sheet pan in to warm up.",
            `Toss the ${first} with oil, salt, and pepper in a bowl.`,
            `Add ${rest} to the bowl and toss again so everything is lightly coated.`,
            "Spread it all on the hot pan in a single layer so it roasts instead of steams.",
            "Roast twenty minutes, turning once halfway, until the edges are browned.",
            "Finish with a squeeze of acid or a handful of herbs and serve.",
          ]),
          base("Soup pot", "30 min", [
            `Sweat onion or whatever aromatic you have in oil for three minutes.`,
            `Add the ${first} and ${rest} and stir for a minute to wake them up.`,
            "Pour in enough stock or water to just cover everything.",
            "Simmer gently for twenty minutes until the vegetables are tender.",
            "Season well, then blend a ladleful and stir it back in to thicken.",
            "Serve hot with bread or rice to stretch it further.",
          ]),
        ],
      };
    }
  });
