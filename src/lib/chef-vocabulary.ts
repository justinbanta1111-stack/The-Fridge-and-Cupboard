/**
 * Chef's fridge-item vocabulary.
 *
 * Built from the canonical ingredient database so the words Chef expects to
 * hear are exactly the words the rest of the app can act on: every ingredient
 * name plus the way people actually say it out loud. Paired with the spoken
 * quantity vocabulary below, this lets Chef resolve a misheard phrase onto a
 * real ingredient and a real amount instead of guessing.
 *
 * Pure data, no network, no side effects.
 */

import { INGREDIENTS } from "@/lib/ingredients-db";

/** Every word Chef should recognise as a fridge/cupboard item. */
export const FRIDGE_ITEM_VOCABULARY: string[] = Array.from(
  new Set(
    INGREDIENTS.flatMap((item) => [item.name.toLowerCase(), ...item.aliases.map((a) => a.toLowerCase())]),
  ),
).sort();

/** Canonical name for each spoken variant, e.g. "mince" -> "Ground beef". */
export const VOCABULARY_CANONICAL: Record<string, string> = INGREDIENTS.reduce<Record<string, string>>(
  (map, item) => {
    map[item.name.toLowerCase()] = item.name;
    for (const alias of item.aliases) map[alias.toLowerCase()] = item.name;
    return map;
  },
  {},
);

/** Spoken/slang/misheard variants that map onto a vocabulary word. */
export const SPOKEN_VARIANTS: Record<string, string> = {
  taters: "potatoes",
  maters: "tomatoes",
  "holla peno": "jalapeno",
  "hall of pain": "jalapeno",
  "keen wah": "quinoa",
  "sir racha": "sriracha",
  "wooster sure": "worcestershire sauce",
  salantro: "cilantro",
  "sea lantern": "cilantro",
  nyoki: "gnocchi",
  "no key": "gnocchi",
  tumeric: "turmeric",
  marscapone: "mascarpone",
  "box choy": "bok choy",
  "or so": "orzo",
  "round beef": "ground beef",
  "spaghetti sauce": "marinara",
  "red sauce": "marinara",
  "heavy whipping cream": "heavy cream",
  "lunch meat": "deli turkey",
  "cold cuts": "deli turkey",
};

/** Resolve a heard phrase onto a canonical ingredient name, if it is one. */
export function resolveHeardItem(phrase: string): string | undefined {
  const key = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  const tries = [key, SPOKEN_VARIANTS[key], key.replace(/e?s$/, "")].filter(Boolean) as string[];
  for (const attempt of tries) {
    const hit = VOCABULARY_CANONICAL[attempt] ?? VOCABULARY_CANONICAL[attempt.replace(/e?s$/, "")];
    if (hit) return hit;
  }
  return undefined;
}

/** Spoken amounts mapped to the numbers a recipe actually needs. */
export const QUANTITY_VOCABULARY: Array<[string, string]> = [
  ["a cup and a half", "1.5 cups"],
  ["a half cup", "1/2 cup"],
  ["a quarter cup", "1/4 cup"],
  ["a third of a cup", "1/3 cup"],
  ["two thirds", "2/3"],
  ["three quarters", "3/4"],
  ["a stick of butter", "1/2 cup (4 oz) butter"],
  ["half a stick", "1/4 cup butter"],
  ["a can", "one 14–15 oz can"],
  ["a big can", "one 28 oz can"],
  ["a jar", "one 24 oz jar"],
  ["a box", "one 16 oz box"],
  ["a bag", "one 1 lb bag"],
  ["a bunch", "1 bunch (about 6 oz)"],
  ["a head", "1 whole head"],
  ["a clove", "1 clove"],
  ["a couple", "2"],
  ["a few", "3"],
  ["a handful", "about 1 cup loose"],
  ["a pinch", "about 1/8 teaspoon"],
  ["a dash", "about 1/8 teaspoon"],
  ["a splash", "about 1 tablespoon"],
  ["a drizzle", "about 1 tablespoon"],
  ["a glug", "about 2 tablespoons"],
  ["half a dozen", "6"],
  ["a dozen", "12"],
  ["a pound", "16 oz"],
  ["half a pound", "8 oz"],
  ["a quart", "4 cups"],
  ["a pint", "2 cups"],
  ["a gallon", "16 cups"],
  ["a liter", "about 4.2 cups"],
  ["three fifty", "350°F"],
  ["four hundred", "400°F"],
  ["four twenty five", "425°F"],
  ["one seventy five Celsius", "175°C (350°F)"],
  ["medium heat", "about 350°F on a pan, level 5 of 10"],
  ["a sheet pan", "half sheet, 18x13 inch"],
  ["a nine by thirteen", "9x13 inch baking dish"],
];

function chunk(list: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size).join(", "));
  return out;
}

/**
 * The vocabulary as prompt lines. Kept compact: the item list is the entire
 * set of words the app can act on, so Chef never invents an item name that the
 * pantry, shopping list or recipe matcher cannot resolve.
 */
export const CHEF_VOCABULARY_RULES: string[] = [
  "",
  "FRIDGE AND CUPBOARD VOCABULARY (the words you know):",
  "These are the item words this kitchen uses. When a heard phrase is close to one of them, treat it as that item and use the proper name in your reply. Never invent an item name outside this vocabulary unless the user clearly named something new.",
  ...chunk(FRIDGE_ITEM_VOCABULARY, 40).map((line) => `- ${line}`),
  "",
  "SPOKEN AMOUNTS (always convert before you cook with them):",
  ...QUANTITY_VOCABULARY.map(([said, means]) => `- "${said}" = ${means}`),
  "When the user gives an amount out loud, restate it once in real measurements as you use it ('a stick of butter — so half a cup, going in now') and keep every later step in those real measurements.",
  "If an amount is missing, use the typical amount for a 4-serving recipe and say what you assumed.",
];
