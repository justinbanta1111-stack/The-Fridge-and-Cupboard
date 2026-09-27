/**
 * Grounds Chef's spoken answers in the real recipe database
 * (`DISHES` in src/lib/seo/content.ts) instead of invented recipes.
 *
 * Pure data, no network: given what the user just said (plus recent turns),
 * find the dishes they're actually talking about and render the exact
 * ingredients, amounts, times, oven temps, steps and a shopping list
 * that Chef can read out loud verbatim.
 */

import { DISHES, type Dish } from "@/lib/seo/content";

/** Words that never help identify a dish. */
const NOISE = new Set([
  "the", "a", "an", "and", "or", "for", "with", "some", "make", "making", "makes", "made",
  "recipe", "recipes", "cook", "cooking", "how", "do", "i", "you", "me", "my", "we", "us",
  "want", "like", "would", "can", "could", "give", "tell", "show", "need", "please", "what",
  "is", "are", "of", "to", "it", "that", "this", "got", "have", "has", "food", "dish", "meal",
  "dinner", "lunch", "breakfast", "tonight", "today", "list", "shopping", "grocery", "buy",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !NOISE.has(w));
}

function dishTokens(dish: Dish): string[] {
  return tokens(`${dish.name} ${dish.slug.replace(/-/g, " ")}`);
}

/** Score how strongly a dish matches the user's words. */
function score(dish: Dish, said: string, words: Set<string>): number {
  const name = dish.name.toLowerCase();
  if (said.includes(name)) return 100 + name.length;
  const dt = dishTokens(dish);
  if (!dt.length) return 0;
  let hits = 0;
  for (const t of dt) if (words.has(t)) hits += 1;
  if (!hits) return 0;
  // Every word of the dish name present, in any order, is a strong match.
  const full = hits === dt.length ? 40 : 0;
  return full + hits * 10;
}

/**
 * The dishes the user is most likely asking about right now.
 * Looks at the current message first, then falls back to recent turns so
 * "give me the shopping list" still resolves to the dish just discussed.
 */
export function findDishes(
  message: string,
  history: Array<{ role: string; text: string }> = [],
  limit = 2,
): Dish[] {
  const pick = (text: string): Dish[] => {
    const said = text.toLowerCase();
    const words = new Set(tokens(text));
    return DISHES.map((dish) => ({ dish, s: score(dish, said, words) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.dish);
  };

  const direct = pick(message);
  if (direct.length) return direct;

  const recent = history.slice(-6).reverse();
  for (const turn of recent) {
    const found = pick(turn.text);
    if (found.length) return found.slice(0, 1);
  }
  return [];
}

function dishBlock(dish: Dish): string[] {
  const total = dish.prepMinutes + dish.cookMinutes;
  return [
    `DISH: ${dish.name}`,
    `Summary: ${dish.summary}`,
    `Cuisine: ${dish.cuisine} · Serves ${dish.servings} · Prep ${dish.prepMinutes} min · Cook ${dish.cookMinutes} min · Total about ${total} min${dish.ovenTemp ? ` · Oven ${dish.ovenTemp}` : ""}`,
    "Ingredients (exact, read these amounts — do not change them):",
    ...dish.ingredients.map((i) => `- ${i}`),
    "Steps (in this order, do not invent new ones):",
    ...dish.steps.map((s, i) => `${i + 1}. ${s}`),
    ...(dish.tips.length ? ["Chef tips:", ...dish.tips.map((t) => `- ${t}`)] : []),
    "",
  ];
}

/**
 * Prompt block with the real recipes matched to this turn, plus the rules
 * that keep Chef reading from them instead of improvising.
 */
export function recipeDatabaseLines(
  message: string,
  history: Array<{ role: string; text: string }> = [],
): string[] {
  const matches = findDishes(message, history);
  const lines: string[] = [
    "",
    "REAL RECIPE DATABASE (authoritative — this app's own tested recipes):",
    `The app has ${DISHES.length} complete recipes with real amounts, oven temperatures, timings and steps.`,
  ];

  if (!matches.length) {
    lines.push(
      "No database recipe matched this turn. If they ask for a specific dish by name and it isn't listed below, cook it from your own knowledge with real amounts and timings — never vague hand-waving.",
    );
    return lines;
  }

  lines.push(
    "The recipes below match what they're asking about. Use THESE exact ingredients, amounts, temperatures and steps — do not invent different ones, and do not round or change quantities.",
    "",
  );
  for (const dish of matches) lines.push(...dishBlock(dish));

  lines.push(
    "WHEN THEY ASK FOR THE FULL RECIPE:",
    "Read it properly — name the dish, how long it takes and how many it serves, then the ingredients with their real amounts, then the steps in order. Speak it naturally, no bullet points or markdown. Set intent='read_recipe', recipeTitle to the dish name, and recipeSteps to the steps above (shortened to ≤20 words each if needed).",
    "",
    "WHEN THEY ASK FOR A SHOPPING LIST (or 'what do I need to buy'):",
    "Set intent='shopping'. Go through the ingredient list above and say only what they still need: skip anything in their scanned food or anything they've said they already have, and skip basic staples like salt, pepper, water and oil unless they've said they're out.",
    "Say each item with its amount, grouped naturally the way a store is laid out — produce, then meat or seafood, then dairy, then pantry. Keep it spoken and short, then offer to add it to their grocery list in the app.",
    "If they already have everything, just tell them so and start cooking with them instead.",
  );
  return lines;
}
