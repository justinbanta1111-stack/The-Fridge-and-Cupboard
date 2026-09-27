/**
 * Consolidates ingredient lines across several recipes into one shopping list:
 * strips prep words, merges duplicates, adds up quantities where the units
 * match, and remembers which recipes each line came from.
 */

import { haveInKitchen } from "@/lib/shopping-list";

export type ConsolidatedLine = {
  /** Clean ingredient name, e.g. "olive oil". */
  name: string;
  /** Combined amount, e.g. "3 cups" or "2 x" — empty when nothing was parseable. */
  amount: string;
  /** Recipe titles that need it. */
  recipes: string[];
  /** True when it looks like it's already in the kitchen. */
  have: boolean;
};

export type RecipeIngredients = { title: string; ingredients: string[] };

const UNIT_WORDS = [
  "cups", "cup", "tbsp", "tablespoons", "tablespoon", "tsp", "teaspoons", "teaspoon",
  "g", "grams", "gram", "kg", "oz", "ounces", "ounce", "lb", "lbs", "pounds", "pound",
  "ml", "l", "liters", "litres", "cloves", "clove", "cans", "can", "slices", "slice",
  "handful", "handfuls", "bunch", "bunches", "sprigs", "sprig", "pinch", "pinches",
];

const NOISE = /\b(chopped|diced|minced|sliced|grated|shredded|fresh|freshly|ground|large|small|medium|ripe|optional|to taste|finely|roughly|thinly|peeled|cooked|drained|rinsed|room temperature|plus more)\b/gi;

const FRACTIONS: Record<string, number> = {
  "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125,
};

function parseAmount(raw: string): { qty: number | null; unit: string; rest: string } {
  let text = raw.trim();
  let qty: number | null = null;

  const frac = Object.keys(FRACTIONS).find((f) => text.startsWith(f));
  if (frac) {
    qty = FRACTIONS[frac]!;
    text = text.slice(frac.length).trim();
  } else {
    const m = text.match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?\s*/);
    if (m) {
      const a = Number(m[1]);
      const b = m[2] ? Number(m[2]) : null;
      qty = b ? a / b : a;
      text = text.slice(m[0].length).trim();
    }
  }

  let unit = "";
  const unitMatch = text.match(/^([a-zA-Z]+)\b/);
  if (unitMatch && UNIT_WORDS.includes(unitMatch[1]!.toLowerCase())) {
    unit = unitMatch[1]!.toLowerCase();
    text = text.slice(unitMatch[0].length).trim();
  }

  return { qty, unit, rest: text.replace(/^of\s+/i, "").trim() };
}

function cleanName(raw: string): string {
  return raw
    .replace(NOISE, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[,;].*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-•*\s]+/, "")
    .toLowerCase();
}

function normalizeKey(name: string): string {
  const n = name.toLowerCase().trim();
  return n.endsWith("es") && n.length > 4 ? n.slice(0, -2) : n.endsWith("s") ? n.slice(0, -1) : n;
}

function pretty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/**
 * Merges every recipe's ingredients into one deduped list, flagging anything
 * the kitchen already has so the user only buys what's actually missing.
 */
export function consolidateIngredients(
  recipes: RecipeIngredients[],
  kitchen: string[] = [],
): ConsolidatedLine[] {
  const map = new Map<
    string,
    { name: string; unitTotals: Map<string, number>; countless: number; recipes: Set<string> }
  >();

  for (const recipe of recipes) {
    for (const line of recipe.ingredients) {
      const { qty, unit, rest } = parseAmount(line);
      const name = cleanName(rest || line);
      if (!name || name.length < 2) continue;
      const key = normalizeKey(name);
      const entry =
        map.get(key) ??
        { name, unitTotals: new Map<string, number>(), countless: 0, recipes: new Set<string>() };
      if (qty !== null) {
        const u = unit || "";
        entry.unitTotals.set(u, (entry.unitTotals.get(u) ?? 0) + qty);
      } else {
        entry.countless += 1;
      }
      entry.recipes.add(recipe.title);
      map.set(key, entry);
    }
  }

  return [...map.values()]
    .map((e) => {
      const parts = [...e.unitTotals.entries()].map(([u, total]) =>
        u ? `${pretty(total)} ${u}` : pretty(total),
      );
      return {
        name: e.name,
        amount: parts.join(" + "),
        recipes: [...e.recipes],
        have: haveInKitchen(e.name, kitchen),
      };
    })
    .sort((a, b) => Number(a.have) - Number(b.have) || b.recipes.length - a.recipes.length || a.name.localeCompare(b.name));
}
