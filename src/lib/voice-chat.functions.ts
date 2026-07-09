import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ScanItem = {
  name?: unknown;
  freshness?: unknown;
  notes?: unknown;
};

const TurnInput = z.object({
  message: z.string().min(1).max(800),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1).max(2000),
      }),
    )
    .max(40)
    .optional(),
  restrictions: z.array(z.string()).max(20).optional(),
  voicePersonality: z.enum(["calm", "energetic", "friendly", "chef"]).default("chef"),
});

const ReplyShape = z.object({
  reply: z.string().describe("Friendly spoken reply (1-3 sentences, no markdown, no lists)."),
  intent: z
    .enum(["general", "go_scan", "going_bad", "savings", "shopping", "recipes", "read_recipe"])
    .describe("Best matching intent for routing or follow-up actions."),
  recipeTitle: z
    .string()
    .optional()
    .describe("If user wants a recipe read aloud, the title to use."),
  recipeSteps: z
    .array(z.string())
    .max(12)
    .optional()
    .describe("If user wants a recipe read aloud, the ordered step-by-step list."),
});

export type ChefChatReply = z.infer<typeof ReplyShape>;

export const chatWithChef = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TurnInput.parse(input))
  .handler(async ({ data, context }): Promise<ChefChatReply> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabase, userId } = context;

    // Gather a compact user context so Chef can answer "what's going bad",
    // "how much have I saved", "what did I cook last week", etc.
    const [scansRes, savingsRes] = await Promise.all([
      supabase
        .from("fridge_scans")
        .select("items, cuisine, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("savings_events")
        .select("recipe_title, estimated_savings_cents, pounds_rescued, cooked_at")
        .eq("user_id", userId)
        .order("cooked_at", { ascending: false })
        .limit(30),
    ]);

    const scans = scansRes.data ?? [];
    const savings = savingsRes.data ?? [];

    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    let totalCents = 0;
    let monthCents = 0;
    let weekCents = 0;
    let weekMeals = 0;
    let totalPounds = 0;
    const recentMeals: string[] = [];
    for (const s of savings) {
      const t = new Date(s.cooked_at).getTime();
      totalCents += s.estimated_savings_cents;
      totalPounds += Number(s.pounds_rescued ?? 0);
      if (t >= monthStart) monthCents += s.estimated_savings_cents;
      if (t >= now - WEEK) {
        weekCents += s.estimated_savings_cents;
        weekMeals += 1;
        if (recentMeals.length < 8) recentMeals.push(s.recipe_title);
      }
    }

    const seen = new Set<string>();
    const useToday: string[] = [];
    const useThisWeek: string[] = [];
    const forgotten: string[] = [];
    const fresh: string[] = [];
    for (const scan of scans) {
      const items = Array.isArray(scan.items) ? (scan.items as ScanItem[]) : [];
      for (const it of items) {
        const name = (it?.name ?? "").toString().trim();
        if (!name) continue;
        const k = name.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        const f = it?.freshness;
        const notes = (it?.notes ?? "").toString();
        if (f === "questionable" || f === "throw-out") {
          if (useToday.length < 10) useToday.push(name);
        } else if (f === "use-soon") {
          if (useThisWeek.length < 10) useThisWeek.push(name);
        } else if (fresh.length < 12) {
          fresh.push(name);
        }
        if (/easy to forget|forgotten/i.test(notes) && forgotten.length < 8) {
          forgotten.push(name);
        }
      }
    }

    const ctxLines: string[] = [];
    ctxLines.push(
      `USER STATS — saved this month: $${(monthCents / 100).toFixed(2)} · all time: $${(totalCents / 100).toFixed(2)} · pounds rescued: ${totalPounds.toFixed(1)} · meals last 7d: ${weekMeals} ($${(weekCents / 100).toFixed(2)}).`,
    );
    if (recentMeals.length) ctxLines.push(`RECENT MEALS COOKED: ${recentMeals.join(", ")}.`);
    if (useToday.length) ctxLines.push(`USE TODAY: ${useToday.join(", ")}.`);
    if (useThisWeek.length) ctxLines.push(`USE THIS WEEK: ${useThisWeek.join(", ")}.`);
    if (forgotten.length) ctxLines.push(`FORGOTTEN TREASURES: ${forgotten.join(", ")}.`);
    if (fresh.length) ctxLines.push(`FRESH ON HAND: ${fresh.slice(0, 10).join(", ")}.`);
    if (data.restrictions?.length) ctxLines.push(`DIETARY: ${data.restrictions.join(", ")}.`);
    if (scans.length === 0)
      ctxLines.push("NO SCANS YET — encourage the user to scan their fridge or cupboard.");

    const system = [
      "You are Chef Super J — a warm, funny, real human-feeling voice friend inside The Fridge & Cupboard app.",
      "This is a spoken back-and-forth conversation, like talking on the phone with a friend who happens to be a chef. It is NOT a Q&A bot and NOT a scripted loop.",
      "React like a person: acknowledge what the user just said before answering — 'oh nice', 'yeah totally', 'mmm good question', 'ha, I hear you', 'gotcha'. Vary these so nothing feels canned. Skip them when they wouldn't feel natural.",
      "Match length to the moment. Chit-chat = one short sentence. A real cooking question = 2-4 sentences. A recipe walk-through = as long as it needs. Never pad. Never lecture.",
      "No markdown, no bullet points, no headings, no emojis — every word is spoken aloud.",
      `Current voice style: ${data.voicePersonality}. Stay in that energy.`,
      "",
      "DEFAULT FOOD MODE (critical):",
      "Default to normal, everyday recipes with any ingredients — meat, poultry, seafood, dairy, eggs are all fair game. Do NOT default to Lenten, fasting, vegan, or vegetarian meals. Only cook Lenten / fasting / plant-based when the user explicitly asks for it in this conversation OR their DIETARY line below lists 'Lenten' / 'Orthodox fasting' / 'Vegan' / 'Vegetarian'. If none of those apply, assume normal recipes.",
      "",
      "MEAL-IN-PROGRESS MEMORY (critical):",
      "Treat the conversation as ONE evolving meal plan, not isolated questions. Silently keep track of: the main dish(es) the user has named, any sides/salsas/sauces/drinks they add, ingredients they say they have, spice level, dietary notes, servings, and any constraints (time, kids, picky eaters).",
      "When the user adds something new ('also pico de gallo', 'and rice', 'make it mild', 'I have chicken and limes'), attach it to the SAME meal in progress — do not restart, do not treat it as a brand-new request, do not re-ask what they're cooking. Confirm briefly ('nice, pico too — got it') and fold it into the plan.",
      "When they ask 'how do I make all of that' or 'put it together' or 'give me the recipe', combine every dish and constraint they've mentioned into ONE cohesive walk-through: for each dish, set intent='read_recipe' style recipeSteps merged in a sensible cooking order (prep sides while the main cooks, etc.). Use recipeTitle like 'Chicken tacos with pico de gallo' when several dishes are combined. Keep each step ≤ 20 words, 5-12 steps total for the whole meal.",
      "Never ask the user to repeat something they already told you earlier in this conversation. Refer back naturally ('using those tomatoes and cilantro you mentioned').",
      "If information is missing that actually matters (protein, spice level, servings, time), ask ONE short follow-up — not a list. Otherwise just cook.",
      "",
      "Remember the conversation. Refer back to things the user already told you. Do not repeat yourself between turns.",
      "Do NOT end every turn with a question or an offer. Only ask a follow-up when it genuinely moves the conversation forward.",
      "Do NOT repeat the user's words back to them verbatim.",
      "Use the user's real kitchen context when it's relevant. 'What's going bad' → name USE TODAY first, then USE THIS WEEK. 'How much have I saved' → USER STATS numbers. 'What did I cook last week' → RECENT MEALS COOKED.",
      "For a single-dish recipe request, set intent='read_recipe', provide recipeTitle and 5-8 short imperative recipeSteps (each ≤ 20 words), and in the spoken reply offer to walk them through it hands-free — once, not every turn.",
      "If they go off-topic, chat briefly like a friend, then gently bring it back to their kitchen.",
      "Be warmly encouraging on smart moves — 'nice save', 'good combo', 'smart' — but not every turn, and never during step-by-step cooking.",
      "CONTEXT:",
      ...ctxLines,
    ].join("\n");


    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const h of data.history ?? []) {
      messages.push({ role: h.role, content: h.text });
    }
    messages.push({ role: "user", content: data.message });

    try {
      const { output } = await generateText({
        model: createLovableAiGatewayProvider(key)("google/gemini-3.1-flash-lite"),
        output: Output.object({ schema: ReplyShape }),
        timeout: { totalMs: 12_000 },
        maxRetries: 0,
        system,
        messages,
      });
      return output;
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Unknown error";
      if (/\b429\b|rate.?limit/i.test(raw)) {
        return {
          reply: "I'm getting a lot of questions right now. Give me about a minute and ask again.",
          intent: "general",
        };
      }
      if (/\b402\b|credits?|payment.?required/i.test(raw)) {
        return {
          reply: "My voice credits ran out for today. Try again tomorrow or upgrade for more.",
          intent: "general",
        };
      }
      throw new Error(raw);
    }
  });
