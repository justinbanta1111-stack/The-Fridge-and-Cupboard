import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  items: z.array(z.string().min(1).max(80)).max(60).default([]),
  notes: z.string().max(400).optional(),
});

const Meal = z.object({
  title: z.string(),
  why: z.string().describe("One short sentence on why it's cheap/uses what they have"),
  usesItems: z.array(z.string()).default([]),
  cheapAdds: z.array(z.string()).max(6).default([]).describe("Inexpensive missing ingredients, if any"),
});

const Output_ = z.object({
  encouragement: z.string().describe("One warm, respectful sentence — never pitying"),
  meals: z.array(Meal).min(3).max(6),
  stretchTips: z.array(z.string()).min(3).max(8).describe("Make food and leftovers last longer"),
  useFirst: z.array(z.string()).max(8).default([]).describe("Foods to use before they spoil"),
  storageTips: z.array(z.string()).max(6).default([]).describe("Safe storage so food lasts longer"),
  budgetList: z.array(z.string()).max(12).default([]).describe("Budget-friendly shopping list additions"),
  swaps: z.array(z.string()).max(6).default([]).describe("Cheaper substitutions for pricey ingredients"),
});

export type StretchPlan = z.infer<typeof Output_>;

export const stretchMyGroceries = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = [
      "You are Chef Super J running 'Stretch My Groceries' — a warm, practical budget-cooking helper inside The Fridge & Cupboard.",
      "This feature is for EVERYONE saving money: students, big families, people using SNAP/EBT or food banks, and anyone who hates wasting food. Never mention assistance programs unless the user does. Be respectful, upbeat, never pitying, never judgmental.",
      "Goals: make several meals from the same groceries, make leftovers last, suggest cheap filling ingredients (rice, beans, eggs, oats, pasta, potatoes, frozen veg), reduce waste, prioritize what spoils first, give safe storage tips, and suggest cheaper swaps for expensive items.",
      "Food-bank and pantry items are great ingredients — treat them with the same respect as anything from a store.",
      "Keep every line short and practical. Real dish names, no fluff.",
    ].join(" ");

    const prompt = [
      `Groceries on hand: ${data.items.join(", ") || "(none listed — give a general ultra-budget starter plan)"}`,
      data.notes ? `Notes from the user: ${data.notes}` : "",
    ].join("\n");

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: Output_ }),
      system,
      prompt,
    });

    return output;
  });
