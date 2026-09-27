import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { HUMOR_RULES } from "./chef-humor-prompt";
import { RECIPE_LOCK_RULES } from "./recipe-lock-prompt";

const MODEL = "google/gemini-3-flash-preview";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured. Please try again later.");
  return createLovableAiGatewayProvider(key);
}

/* ------------------------------------------------------------------ */
/* 1. Build the full meal experience for a tapped meal card            */
/* ------------------------------------------------------------------ */

const BuildInput = z.object({
  meal: z.string().trim().min(2).max(120),
  have: z.array(z.string().max(60)).max(60).default([]),
  restrictions: z.array(z.string().max(60)).max(20).default([]),
  servings: z.number().int().min(1).max(20).default(2),
  easier: z.boolean().default(false),
});

const RecipeShape = z.object({
  title: z.string().describe("The dish name, kept exactly as the user chose it."),
  description: z.string().describe("One short, mouth-watering sentence. Plain text."),
  prepMinutes: z.number().describe("Hands-on prep time in minutes."),
  cookMinutes: z.number().describe("Cooking time in minutes."),
  servings: z.number().describe("How many this makes."),
  ingredients: z
    .array(
      z.object({
        item: z.string().describe("Ingredient name, lowercase, no amount."),
        amount: z.string().describe("Exact amount, e.g. '2 large eggs', '1/2 cup milk'."),
        have: z.boolean().describe("True if it appears in what they already have."),
      }),
    )
    .describe("Every ingredient needed, with exact amounts."),
  missing: z.array(z.string()).describe("Ingredient names they do not appear to have."),
  equipment: z.array(z.string()).describe("Pans, bowls and tools needed. Keep it short."),
  substitutions: z
    .array(
      z.object({
        item: z.string().describe("The ingredient that could be swapped."),
        swap: z.string().describe("What to use instead, with the amount."),
        note: z.string().describe("One short sentence on what changes."),
      }),
    )
    .describe("Swaps that use what they already have, or common pantry swaps."),
  steps: z
    .array(z.string())
    .describe(
      "Numbered cooking steps in order. Each step is ONE action with the temperature, timing, pan and doneness signs spelled out.",
    ),
  chefOpener: z
    .string()
    .describe(
      "What Chef Super J says out loud the moment this opens — warm, excited, one or two sentences, ending by asking if they want to make it.",
    ),
});

export type ChefRecipe = z.infer<typeof RecipeShape>;

export const buildMealExperience = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BuildInput.parse(input))
  .handler(async ({ data }): Promise<ChefRecipe> => {
    const system = [
      "You are Chef Super J, writing the recipe for a dish someone just tapped in their kitchen app.",
      "Be exact and practical: real amounts, real temperatures, real timings, real pan sizes, real doneness signs.",
      "Steps are spoken out loud later, so each step is ONE clear action in plain conversational language, no markdown.",
      data.easier
        ? "Make this the EASY version: fewer ingredients, fewer steps, fewer pans, nothing fussy."
        : "",
      ...RECIPE_LOCK_RULES,
      ...HUMOR_RULES,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = [
      `Dish: ${data.meal}`,
      `Servings: ${data.servings}`,
      data.have.length
        ? `They already have: ${data.have.slice(0, 60).join(", ")}`
        : "They did not list what they have.",
      data.restrictions.length
        ? `NEVER violate these restrictions: ${data.restrictions.join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { output } = await generateText({
      model: gateway()(MODEL),
      output: Output.object({ schema: RecipeShape }),
      maxRetries: 1,
      system,
      prompt,
    });
    return output;
  });

/* ------------------------------------------------------------------ */
/* 2. One conversational turn while looking at / cooking the recipe    */
/* ------------------------------------------------------------------ */

const TurnInput = z.object({
  message: z.string().trim().min(1).max(600),
  title: z.string().max(160).default(""),
  steps: z.array(z.string().max(500)).max(30).default([]),
  stepIndex: z.number().int().min(0).max(29).default(0),
  cooking: z.boolean().default(false),
  restrictions: z.array(z.string().max(60)).max(20).default([]),
  memory: z.array(z.string().max(200)).max(30).default([]),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1200) }))
    .max(40)
    .default([]),
  detail: z.enum(["brief", "normal", "detailed"]).default("normal"),
});

const TurnShape = z.object({
  reply: z
    .string()
    .describe("What Chef says out loud right now. Plain spoken text, contractions, no markdown or lists."),
  action: z
    .enum(["none", "start_cooking", "next_step", "previous_step", "repeat_step", "finish"])
    .describe(
      "What the app should do. 'start_cooking' only when they agreed to cook. 'next_step' ONLY when they said they finished the step.",
    ),
  remember: z
    .array(z.string())
    .describe(
      "Short new facts worth remembering for the rest of this cook, e.g. 'no eggs — using flax egg', 'dislikes onions'. Empty if nothing new.",
    ),
  detail: z
    .enum(["brief", "normal", "detailed"])
    .describe("How much explaining they want from now on. Repeat the current setting unless they asked for more or less."),
  suggestions: z
    .array(z.string())
    .describe("Two to four very short tappable replies for them, e.g. 'What's next?', 'Make a substitution'."),
});

export type ChefTurn = z.infer<typeof TurnShape>;

export const chefKitchenTurn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TurnInput.parse(input))
  .handler(async ({ data }): Promise<ChefTurn> => {
    const system = [
      "You are Chef Super J standing beside someone in their kitchen. You are talking, not writing.",
      "Sound like a real person: warm, mellow, confident, a little playful. Short spoken sentences, contractions, no markdown, no lists, no emojis.",
      "Never repeat a welcome or greeting. Never repeat their words back to them. Never restate the whole recipe.",
      "Give ONE instruction at a time, then stop and let them work. Never stack two steps.",
      "Answer whatever they ask — ingredients, swaps, amounts, heat, timing, whether it's done — then hand them back to the exact step they were on.",
      "Be proactive at the right moments: while something heats or rests, suggest the next small prep, or tell them what it should look, smell or sound like. Don't overtalk.",
      "If something went wrong (too salty, too thick, burned, sauce broke, wrong order), fix it in real time instead of saying it's ruined.",
      data.detail === "brief"
        ? "They want you concise. Keep answers to one short sentence unless a number is needed."
        : data.detail === "detailed"
          ? "They want more detail. Explain the why and what to look for, still in spoken sentences."
          : "Match their level: explain more for a beginner, less for someone who clearly knows their way around.",
      ...RECIPE_LOCK_RULES,
      ...HUMOR_RULES,
    ].join("\n");

    const numbered = data.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const context = [
      data.title ? `LOCKED RECIPE (never change it): ${data.title}` : "",
      data.restrictions.length
        ? `ACTIVE RESTRICTIONS (never violate): ${data.restrictions.join(", ")}.`
        : "",
      numbered ? `Full steps:\n${numbered}` : "",
      data.cooking
        ? `They are cooking, currently on step ${data.stepIndex + 1}: ${data.steps[data.stepIndex] ?? "(unknown)"}`
        : "They are looking at the recipe and have not started cooking yet.",
      data.memory.length ? `Already established this session: ${data.memory.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const transcript = data.history
      .slice(-24)
      .map((m) => `${m.role === "user" ? "Them" : "You"}: ${m.content}`)
      .join("\n");

    const { output } = await generateText({
      model: gateway()(MODEL),
      output: Output.object({ schema: TurnShape }),
      maxRetries: 1,
      system,
      prompt: [context, transcript ? `Conversation so far:\n${transcript}` : "", `They just said: "${data.message}"`]
        .filter(Boolean)
        .join("\n\n"),
    });
    return output;
  });
