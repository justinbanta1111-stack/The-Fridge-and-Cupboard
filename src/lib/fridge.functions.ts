import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalyzeInput = z.object({
  imageDataUrl: z.string().min(10),
  restrictions: z.array(z.string()).optional(),
  mode: z.enum(["default", "lenten", "fasting", "holiday"]).optional(),
  storage: z.enum(["fridge", "freezer", "pantry", "counter", "delivery-just-arrived"]).optional(),
  packaging: z.enum(["sealed", "opened", "loose", "mixed"]).optional(),
  purchasedDaysAgo: z.number().min(0).max(365).optional(),
  source: z.enum(["grocery-store", "delivery", "farmers-market", "leftovers-from-home", "restaurant-takeout", "other"]).optional(),
});

// Slim schema sent to Gemini — small surface = reliable structured output.
// We expand it into the richer UI shape after the call.
const SlimItem = z.object({
  name: z.string(),
  category: z.string(),
  freshness: z.enum(["fresh", "use-soon", "questionable", "throw-out"]),
  timeLeftLabel: z.string(),
  estimatedAge: z.string(),
  estimatedQuantity: z.string(),
  notes: z.string(),
  unsafe: z.boolean(),
  // 0.0-1.0 — how confident the vision model is that this item is ACTUALLY visible
  // in the photo (not assumed, not "usually in a fridge"). Used to filter hallucinations.
  visualConfidence: z.number().min(0).max(1),
});


const SlimOutput = z.object({
  items: z.array(SlimItem),
  summary: z.string(),
  safetyWarnings: z.array(z.string()),
});


// Public UI shape (kept stable so the scan results page doesn't need changes).
export type FridgeItem = {
  name: string;
  category: string;
  freshness: "fresh" | "use-soon" | "questionable" | "throw-out";
  estimatedAge: string;
  timeLeftMinDays: number;
  timeLeftMaxDays: number;
  timeLeftLabel: string;
  freshnessConfidence: number;
  freshnessReason: string;
  estimatedQuantity: string;
  container: string;
  containerAssumption: string;
  confidence: number;
  matchKeywords: string[];
  notes: string;
  unsafe: boolean;
  unsafeReason: string;
  priorityRank: number;
  useFirst: boolean;
};

export type AnalyzeFridgeResult = {
  items: FridgeItem[];
  summary: string;
  photoQuality: "clear" | "blurry" | "dark" | "obstructed";
  leftoversCount: number;
  urgentCount: number;
  unsafeCount: number;
  chefNote: string;
  priorityOrder: string[];
  safetyWarnings: string[];
};

const URGENCY: Record<FridgeItem["freshness"], number> = {
  "throw-out": 0,
  questionable: 1,
  "use-soon": 2,
  fresh: 3,
};

function expandItem(s: z.infer<typeof SlimItem>, idx: number): FridgeItem {
  const urgent = s.freshness === "use-soon" || s.freshness === "questionable";
  return {
    name: s.name,
    category: s.category || "other",
    freshness: s.freshness,
    estimatedAge: s.estimatedAge || "",
    timeLeftMinDays: s.freshness === "throw-out" ? 0 : s.freshness === "questionable" ? 0 : s.freshness === "use-soon" ? 1 : 5,
    timeLeftMaxDays: s.freshness === "throw-out" ? 0 : s.freshness === "questionable" ? 2 : s.freshness === "use-soon" ? 2 : 10,
    timeLeftLabel: s.timeLeftLabel || "",
    freshnessConfidence: 0.8,
    freshnessReason: s.notes || "",
    estimatedQuantity: s.estimatedQuantity || "unknown",
    container: "",
    containerAssumption: "",
    confidence: typeof s.visualConfidence === "number" ? s.visualConfidence : 0.85,
    matchKeywords: [s.name.toLowerCase()],
    notes: s.notes || "",
    unsafe: !!s.unsafe,
    unsafeReason: s.unsafe ? s.notes || "Looks unsafe — inspect before eating." : "",
    priorityRank: s.unsafe ? 9999 : idx + 1,
    useFirst: !s.unsafe && urgent,
  };
}

function apiErrorMessage(error: unknown) {
  const raw =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "string" && error
        ? error
        : "Unknown API error";
  // Friendly classification for the most common gateway failures.
  if (/\b429\b|rate.?limit|too many/i.test(raw))
    return "RATE_LIMITED: We're getting a lot of scans right now. Wait about a minute and try again.";
  if (/\b402\b|payment.?required|credits?|quota/i.test(raw))
    return "CREDITS_EXHAUSTED: Daily AI credits are used up. Try again tomorrow or upgrade for more.";
  if (/timeout|timed.?out/i.test(raw))
    return "TIMEOUT: The scan took too long. Try a clearer, smaller photo.";
  if (/network|fetch|ECONN|ENOTFOUND/i.test(raw))
    return "NETWORK: Can't reach the scanner. Check your connection and retry.";
  return raw;
}


function buildAnalyzeSystem(opts: {
  restrictions?: string[];
  mode?: string;
  storage?: string;
  packaging?: string;
  purchasedDaysAgo?: number;
  source?: string;
}) {
  const ctx: string[] = [];
  if (opts.storage) ctx.push(`Storage location: ${opts.storage}.`);
  if (opts.packaging) ctx.push(`Packaging: ${opts.packaging}.`);
  if (opts.source) ctx.push(`Source: ${opts.source}.`);
  if (typeof opts.purchasedDaysAgo === "number") ctx.push(`Acquired ~${opts.purchasedDaysAgo} day(s) ago.`);
  const restrictLine =
    opts.restrictions && opts.restrictions.length
      ? `User dietary restrictions to honor in notes: ${opts.restrictions.join(", ")}.`
      : "";
  const modeLine =
    opts.mode === "lenten" ? "MODE: Lenten — flag meat, poultry, dairy, eggs."
    : opts.mode === "fasting" ? "MODE: Orthodox fast — flag meat, fish with backbone, dairy, eggs, oil."
    : opts.mode === "holiday" ? "MODE: Holiday leftovers — watch for turkey, ham, stuffing, mashed potatoes, cranberry, gravy, casseroles, pie."
    : "";

  const isPantry = opts.storage === "pantry";
  const scopeLine = isPantry
    ? "SCOPE: This is a CUPBOARD / PANTRY photo. Only list pantry / cupboard / shelf-stable items you can actually see. Do NOT list refrigerated items (fresh meat, milk, eggs, fresh produce) unless they are clearly visible in this photo."
    : "SCOPE: This is a REFRIGERATOR photo. Only list items you can actually see inside the fridge in this photo. Do NOT list pantry / cupboard / shelf-stable goods unless they are clearly visible in this photo.";

  return [
    "You are Chef Super J's fridge & cupboard inspector — a STRICT vision model. Your #1 rule: only report what you can ACTUALLY SEE in the photo. Accuracy over quantity. It is better to miss one item than invent one.",
    ctx.length ? `Context: ${ctx.join(" ")}` : "",
    scopeLine,
    "",
    "ANTI-HALLUCINATION RULES (read carefully):",
    "- DO NOT assume common staples are present. Never auto-add spinach, eggs, milk, butter, cream, garlic, onions, cheese, lettuce, or any other 'typical' item unless you can clearly see it in THIS photo.",
    "- DO NOT guess what's inside an opaque container, drawer, or behind another item. If you can't see it, don't list it.",
    "- DO NOT pad the list. An empty or short list is correct when the photo only shows a few items.",
    "- If an item is partially visible or ambiguous, set visualConfidence below 0.6 and start notes with 'I might see this — can you confirm?'.",
    "- Items with visualConfidence below 0.4 will be discarded — only include something if you are reasonably sure it is visible.",
    "",
    "IDENTIFY only items that are clearly visible — leftovers (tupperware, foil, takeout), produce, dairy, eggs, meat, seafood, condiments, jars, bottles, spices, herbs, pantry goods, frozen, beverages.",
    "Name items specifically (e.g. 'leftover roast chicken', 'Roma tomato', 'block of cheddar') rather than 'food in container'. If you can only see a generic container with no label or visible contents, skip it.",
    "",
    isPantry
      ? [
          "PANTRY/CUPBOARD MODE — only list what is visible on these shelves:",
          "- Spices & herbs: name the spice when readable (e.g. 'ground cumin', 'smoked paprika', 'oregano'). If a jar is unlabeled, say 'unlabeled spice jar' with low visualConfidence.",
          "- Oils & vinegars, sauces & condiments, canned goods, dry goods (pasta, rice, lentils, oats), baking staples, broths, cereals, nuts — ONLY when actually visible.",
          "- FORGOTTEN ITEMS: items pushed to the back of the shelf, behind taller items, dusty jars — flag in 'notes' with 'Easy to forget — use it!'.",
          "- Suggest in 'notes' one practical way to use the item tonight.",
        ].join("\n")
      : "",
    "",
    "For EACH item return:",
    "- name: specific, human-friendly, based ONLY on what is visible.",
    "- category: one short word like 'leftover', 'produce', 'dairy', 'meat', 'seafood', 'condiment', 'beverage', 'frozen', 'pantry', 'spice', 'herb', 'baking', 'canned', 'grain', 'baked', 'other'.",
    "- freshness: 'fresh' | 'use-soon' | 'questionable' | 'throw-out'.",
    "- timeLeftLabel: short phrase like '1-2 days left', 'about a week', 'months — pantry'.",
    "- estimatedAge: best visual guess like 'just bought', '2-3 days', 'unclear' if you can't tell.",
    "- estimatedQuantity: '1 cup', 'half a jar', 'unknown' if you can't tell.",
    "- notes: <= 18 words. If unsure of the item, start with 'I might see this — can you confirm?'.",
    "- unsafe: true ONLY if there is visible evidence of risk (mold, slime, bulging can, broken seal). Don't guess.",
    "- visualConfidence: 0.0-1.0. Be honest. Clearly visible labeled item = 0.9+. Partially visible / shape only = 0.4-0.6. Assumption = below 0.4 (and then DON'T include it).",
    "",
    "Top-level: summary (one sentence describing what you actually see) and safetyWarnings (one short warning per unsafe item, empty array if none).",
    "",
    "Order items by urgency: unsafe last, then leftovers, then use-soon, then forgotten pantry items, then fresh.",
    "FINAL CHECK before answering: re-read your list and remove any item you cannot point to in the photo.",
    modeLine,
    restrictLine,
  ].filter(Boolean).join("\n");
}


export const analyzeFridge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }): Promise<AnalyzeFridgeResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: SlimOutput }),
        timeout: { totalMs: 45_000 },
        maxRetries: 1,
        messages: [
          {
            role: "system",
            content: buildAnalyzeSystem({
              restrictions: data.restrictions,
              mode: data.mode,
              storage: data.storage,
              packaging: data.packaging,
              purchasedDaysAgo: data.purchasedDaysAgo,
              source: data.source,
            }),
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Inspect this photo. Identify every visible food item and return the structured result." },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });

      // Filter out hallucinations: drop anything the vision model wasn't reasonably
      // confident is actually visible. Accuracy over quantity.
      const MIN_CONFIDENCE = 0.4;
      const filteredSlim = output.items.filter(
        (it) => (typeof it.visualConfidence === "number" ? it.visualConfidence : 1) >= MIN_CONFIDENCE,
      );

      // Sort: safe first (leftover → use-soon → fresh), unsafe last.
      const sortedSlim = [...filteredSlim].sort((a, b) => {
        if (a.unsafe !== b.unsafe) return a.unsafe ? 1 : -1;
        const la = a.category?.toLowerCase() === "leftover" ? 0 : 1;
        const lb = b.category?.toLowerCase() === "leftover" ? 0 : 1;
        if (la !== lb) return la - lb;
        return (URGENCY[a.freshness] ?? 9) - (URGENCY[b.freshness] ?? 9);
      });


      const items = sortedSlim.map(expandItem);
      if (items.length === 0) {
        throw new Error("NO_ITEMS: We couldn't spot any food in that photo. Try better lighting, less clutter, or a closer shot.");
      }
      const leftoversCount = items.filter((i) => i.category.toLowerCase() === "leftover").length;
      const urgentCount = items.filter((i) => i.freshness === "use-soon" || i.freshness === "questionable").length;
      const unsafeCount = items.filter((i) => i.unsafe).length;


      return {
        items,
        summary: output.summary,
        photoQuality: "clear",
        leftoversCount,
        urgentCount,
        unsafeCount,
        chefNote: "",
        priorityOrder: items.filter((i) => !i.unsafe).map((i) => i.name),
        safetyWarnings: output.safetyWarnings ?? [],
      };
    } catch (error) {
      console.error("analyzeFridge API error", error);
      const msg = apiErrorMessage(error);
      // Don't double-wrap our own classified prefixes.
      if (/^(NO_ITEMS|RATE_LIMITED|CREDITS_EXHAUSTED|TIMEOUT|NETWORK):/.test(msg)) {
        throw new Error(msg);
      }
      throw new Error(`Scanner API connection failed: ${msg}`);
    }
  });


const RecipesInput = z.object({
  items: z.array(z.string()).min(1),
  cuisine: z.string().min(1),
  restrictions: z.array(z.string()).optional(),
  mode: z.enum(["default", "lenten", "fasting", "holiday"]).optional(),
});

const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  usesFromFridge: z.array(z.string()),
  alsoNeed: z.array(z.string()),
  steps: z.array(z.string()),
  timeMinutes: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  matchConfidence: z.number(),
  chefTip: z.string(),
  // Smart Meal Completion
  completion: z.enum(["make-now", "almost-there", "quick-store-run"]).optional(),
  estimatedAddedCost: z.number().optional(), // USD total for alsoNeed items
  shortAdditionNote: z.string().optional(),  // e.g. "Just add cilantro"
});

const RecipesOutput = z.object({
  recipes: z.array(RecipeSchema).min(4).max(6),
});

function modeGuidance(mode?: string) {
  if (mode === "lenten")
    return "LENTEN MODE: no meat, poultry, dairy, eggs. Build flavor from mushrooms, beans, lentils, grains, roasted vegetables, miso, citrus, herbs.";
  if (mode === "fasting")
    return "ORTHODOX FAST MODE: no meat, fish with backbone, dairy, eggs, or oil unless the day permits. Lean on shellfish (when allowed), beans, grains, vegetables, tahini, olives.";
  if (mode === "holiday")
    return "HOLIDAY LEFTOVER MODE: assume turkey/ham/stuffing/mashed potatoes/cranberry/gravy. Transform them — sliders, pot pie, shepherd's pie, fried rice with stuffing, croquettes, soup.";
  return "";
}

export const suggestRecipes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RecipesInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: RecipesOutput }),
      messages: [
        {
          role: "system",
          content: [
            "You are Chef Super J — a leftover-loving home cook who rescues fridges and saves money.",
            "Suggest 4-6 realistic recipes. Cover a SPREAD of completion tiers so the user always has options:",
            "  • At least 1-2 'make-now' recipes — alsoNeed is EMPTY (assume basic pantry: oil, salt, pepper, garlic, onion, flour, eggs unless restricted). estimatedAddedCost = 0.",
            "  • At least 2 'almost-there' recipes — alsoNeed has 1-3 CHEAP common ingredients (each under ~$3, e.g. cilantro, a lemon, an onion, sour cream, tortillas, oregano, broccoli, teriyaki sauce). estimatedAddedCost = realistic USD total (usually $1-$8).",
            "  • Optionally 1 'quick-store-run' recipe — alsoNeed has 2-4 items still totaling under ~$12, all available at any corner store.",
            "Never suggest a recipe that needs 5+ extra ingredients or expensive proteins the user doesn't have.",
            "shortAdditionNote: one short friendly line like 'Just add cilantro' or 'Just add a lemon & sour cream'. Empty string for make-now recipes.",
            "Prioritize using items going bad first (earlier in the inventory list) and leftovers.",
            "Keep steps short and practical (5-7 steps).",
            "STRICTLY honor dietary restrictions — never suggest a recipe that violates them.",
            "matchConfidence (0.0-1.0): how well this recipe matches the inventory. make-now = 0.85+. almost-there = 0.65-0.85. quick-store-run = 0.5-0.7.",
            "chefTip: one short, professional technique tip from Chef Super J.",
            modeGuidance(data.mode),
          ]
            .filter(Boolean)
            .join("\n"),
        },
        {
          role: "user",
          content: `Cuisine / vibe: ${data.cuisine}${data.restrictions && data.restrictions.length ? `\nDietary restrictions (MUST honor): ${data.restrictions.join(", ")}` : ""}\n\nFridge inventory (use as much as possible, prioritize earlier items — they're going bad first):\n${data.items.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}`,
        },
      ],
    });

    return output;
  });

// ---------- Leftover Transformer ----------
const TransformInput = z.object({
  leftovers: z.array(z.string()).min(1),
  pantry: z.array(z.string()).optional(),
  restrictions: z.array(z.string()).optional(),
  mode: z.enum(["default", "lenten", "fasting", "holiday"]).optional(),
});

const TransformedRecipeSchema = z.object({
  title: z.string(),
  hook: z.string(),
  transformation: z.string(),
  usesLeftovers: z.array(z.string()),
  alsoNeed: z.array(z.string()),
  steps: z.array(z.string()),
  timeMinutes: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  chefTip: z.string(),
});

const TransformOutput = z.object({
  recipes: z.array(TransformedRecipeSchema).min(3).max(4),
});

export const transformLeftovers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TransformInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: TransformOutput }),
      messages: [
        {
          role: "system",
          content: [
            "You are Chef Super J, a leftover-transformation specialist.",
            "Take the user's leftovers and TRANSFORM them so nobody recognizes them as leftovers — tacos, frittatas, fried rice, savory pies, hand pies, stuffed peppers, soups, grain bowls, ramen, sliders, sheet-pan hash, shepherd's pie, croquettes, quesadillas, stratas.",
            "Each recipe needs: a strong 'hook' (why it's exciting), a one-line 'transformation' explaining what the leftover becomes, 5-7 short steps, and one Chef Super J pro technique tip.",
            "STRICTLY honor dietary restrictions.",
            "Keep extra ingredients minimal — assume basic pantry staples.",
            modeGuidance(data.mode),
          ]
            .filter(Boolean)
            .join("\n"),
        },
        {
          role: "user",
          content: `Leftovers to transform:\n${data.leftovers.map((i) => `- ${i}`).join("\n")}${data.pantry && data.pantry.length ? `\n\nAlso available:\n${data.pantry.map((i) => `- ${i}`).join("\n")}` : ""}${data.restrictions && data.restrictions.length ? `\n\nMust honor: ${data.restrictions.join(", ")}` : ""}`,
        },
      ],
    });

    return output;
  });

// ---------- Chef Rescue: scenario-driven emergency cooking ----------
const RescueInput = z.object({
  scenario: z.enum(["broke", "kids-fast", "only-these", "surprise", "custom"]),
  items: z.array(z.string()).default([]),
  customRequest: z.string().max(400).optional(),
  restrictions: z.array(z.string()).optional(),
  servings: z.number().min(1).max(12).optional(),
});

const RescueRecipe = z.object({
  title: z.string(),
  hook: z.string(),
  usesFromFridge: z.array(z.string()),
  alsoNeed: z.array(z.string()),
  steps: z.array(z.string()),
  timeMinutes: z.number(),
  estimatedCost: z.number(),
  feeds: z.string(),
  chefTip: z.string(),
});

const RescueOutput = z.object({
  headline: z.string(),
  encouragement: z.string(),
  recipes: z.array(RescueRecipe).min(2).max(4),
});

function scenarioGuidance(scenario: string, customRequest?: string) {
  switch (scenario) {
    case "broke":
      return "EMERGENCY: user is broke. Zero or near-zero extra spend. alsoNeed must be empty or pantry staples. Stretch protein, use rice/beans/eggs/pasta. Feeds 2-4 cheap. estimatedCost = 0 unless truly unavoidable.";
    case "kids-fast":
      return "EMERGENCY: feed kids FAST. Under 15 minutes. Kid-friendly flavors (mild, familiar). No raw onion, no spicy. Quesadillas, pasta, scrambles, sandwiches, nuggets-from-leftovers. Keep steps tiny.";
    case "only-these":
      return "STRICT: user listed the ONLY ingredients they have. Do not assume anything else beyond water, salt, pepper, oil. alsoNeed should be EMPTY. Be creative within the limits.";
    case "surprise":
      return "SURPRISE MODE: pick something unexpected and fun from their inventory — global flavors, fusion, a chef's secret. Make it feel like a treat. Variety across the recipes.";
    case "custom":
      return `CUSTOM REQUEST from user: "${(customRequest ?? "").slice(0, 400)}". Honor it precisely while using what they have.`;
    default:
      return "";
  }
}

export const rescueCook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RescueInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const itemList = data.items.length
      ? data.items.map((i, idx) => `${idx + 1}. ${i}`).join("\n")
      : "(none provided — work from the custom request or basic pantry only)";

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: RescueOutput }),
      timeout: { totalMs: 25_000 },
      maxRetries: 1,
      messages: [
        {
          role: "system",
          content: [
            "You are Chef Super J in EMERGENCY rescue mode — warm, funny, encouraging, real-world practical.",
            "Output 2-4 recipes the user can actually cook RIGHT NOW with what they have.",
            "headline: short punchy line (e.g. 'You're not broke — you're resourceful.').",
            "encouragement: one warm sentence in Chef Super J's voice.",
            "Each recipe: tight hook, 4-7 short imperative steps (<= 18 words each), realistic timeMinutes, estimatedCost in USD (0 if nothing to buy), feeds like '2 adults' or '4 kids', one chef tip.",
            "STRICTLY honor dietary restrictions.",
            scenarioGuidance(data.scenario, data.customRequest),
          ].join("\n"),
        },
        {
          role: "user",
          content: `What they have:\n${itemList}${data.restrictions?.length ? `\n\nDietary (MUST honor): ${data.restrictions.join(", ")}` : ""}${data.servings ? `\n\nTarget servings: ${data.servings}` : ""}${data.customRequest && data.scenario !== "custom" ? `\n\nExtra context: ${data.customRequest}` : ""}`,
        },
      ],
    });

    return output;
  });
