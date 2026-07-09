import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SENIOR_FILTERS = [
  "Soft Bite Meals",
  "One Pot Meals",
  "Low Energy Meals",
  "Brain Support Meals",
  "Heart Healthy Meals",
  "Low Sodium Meals",
  "High Protein Meals",
  "Hydration Support Meals",
  "Easy Reheat Meals",
  "Recovery Meals",
] as const;

export const SENIOR_CATEGORIES = [
  "Breakfast for Seniors",
  "Light Lunches",
  "Simple Dinners",
  "Recovery Foods",
  "Easy Soups",
  "Gentle Snacks",
  "Protein Boost Meals",
] as const;

export const SENIOR_PRIORITY_INGREDIENTS = [
  "eggs", "soup", "broth", "potato", "carrot", "oatmeal", "oats", "yogurt",
  "salmon", "rice", "banana", "blueberry", "berries", "spinach", "sweet potato",
  "zucchini", "squash", "leftover", "chicken", "tofu", "lentil", "avocado",
];

const Input = z.object({
  items: z.array(z.string()).default([]),
  filters: z.array(z.string()).default([]),
  category: z.string().optional(),
  audience: z.enum(["self", "parent", "recovery", "caregiver"]).optional(),
});

const Meal = z.object({
  title: z.string(),
  why: z.string(),
  texture: z.enum(["soft", "tender", "regular"]),
  effort: z.enum(["very-low", "low", "medium"]),
  timeMinutes: z.number(),
  usesItems: z.array(z.string()),
  alsoNeed: z.array(z.string()),
  steps: z.array(z.string()).min(3).max(7),
  benefits: z.array(z.string()), // e.g. "brain support", "heart healthy", "hydration"
  reheatFriendly: z.boolean(),
  caregiverNote: z.string(),
});

const SeniorMealsOutput = z.object({
  headline: z.string(),
  meals: z.array(Meal).min(3).max(6),
  hydrationReminder: z.string(),
});

export const suggestSeniorMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const audienceLine =
      data.audience === "parent"
        ? "The cook is preparing meals for an aging parent (Mom or Dad)."
        : data.audience === "recovery"
        ? "The eater is recovering from illness/surgery — gentle, soothing, nutrient-dense food."
        : data.audience === "caregiver"
        ? "The cook is a caregiver making simple meals for a senior."
        : "The eater is a senior cooking for themselves with limited energy.";

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: SeniorMealsOutput }),
      messages: [
        {
          role: "system",
          content: [
            "You are Chef Super J — warm, patient, and an expert at gentle, senior-friendly cooking.",
            "Suggest 3-5 senior-friendly meals. Prioritize: soft textures, easy chewing, easy digestion, few ingredients (≤6), low effort, simple cleanup, reheat-friendly, high nutrition.",
            "Favor: eggs, soups, broths, potatoes, carrots, oatmeal, yogurt, salmon, rice, bananas, berries, spinach, sweet potatoes, cooked soft vegetables, leftovers.",
            "Avoid: hard-to-chew foods, deep frying, complex techniques, heavy spices, lots of dishes.",
            "Each meal must include WHY it helps (brain support, heart healthy, hydration, recovery, low sodium, high protein, gentle digestion, etc).",
            "Steps must be very short, kind, and easy to follow — 3-6 steps max.",
            "alsoNeed: keep to 0-3 cheap, common pantry items.",
            "caregiverNote: one warm, practical tip for the caregiver or the senior themselves.",
            audienceLine,
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            data.items.length
              ? `Ingredients on hand:\n${data.items.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}`
              : "No scan yet — suggest meals using common senior-friendly staples (eggs, oats, yogurt, broth, rice, bananas, spinach, sweet potatoes, salmon).",
            data.filters.length ? `Filters: ${data.filters.join(", ")}` : "",
            data.category ? `Category: ${data.category}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });

    return output;
  });

export type SeniorMealsResult = z.infer<typeof SeniorMealsOutput>;
