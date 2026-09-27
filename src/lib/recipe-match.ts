/**
 * Matches what the user actually has (typed or scanned) against the real
 * recipe library in `src/lib/seo/content.ts` — real dishes with real
 * quantities, oven temperatures and step-by-step instructions.
 *
 * Pure data, no network. Used as the dependable backbone under the AI ideas:
 * even offline or when the model is slow, the user gets cookable recipes.
 */

import { DISHES, type Dish } from "@/lib/seo/content";
import { resolveAll, resolveIngredient } from "@/lib/ingredients-db";

export type DishMatch = {
  dish: Dish;
  /** Ingredient lines the user already has something for. */
  have: string[];
  /** Ingredient lines they still need to buy. */
  missing: string[];
  /** 0-1 share of the recipe already covered. */
  coverage: number;
};

/** Cupboard staples nearly every kitchen has — not counted as "missing". */
const STAPLES =
  /\b(salt|pepper|water|oil|olive oil|neutral oil|butter|sugar|flour|baking soda|baking powder|vanilla|herbs?|spice|seasoning|string|paper towels?)\b/i;

const STOP =
  /\b(cup|cups|tbsp|tsp|teaspoon|tablespoon|ounce|oz|pound|lb|lbs|g|kg|ml|l|large|small|medium|fresh|freshly|chopped|diced|sliced|minced|grated|shredded|halved|softened|melted|ripe|very|whole|about|plus|optional|to|taste|of|or|and|a|an|the|your|you|already|have|any|each|can|cans|jar|package|pinch|handful|inch|thick|thin)\b/gi;

function words(line: string): string[] {
  return line
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z\s-]/g, " ")
    .replace(STOP, " ")
    .split(/\s+/)
    .map((w) => w.replace(/(ies)$/, "y").replace(/s$/, ""))
    .filter((w) => w.length > 2);
}

function userTokens(items: string[]): Set<string> {
  const set = new Set<string>();
  for (const raw of items) {
    for (const w of words(raw.replace(/^USE FIRST:\s*/i, ""))) set.add(w);
  }
  return set;
}

function lineIsCovered(line: string, have: Set<string>): boolean {
  const ws = words(line);
  if (ws.length === 0) return true;
  return ws.some((w) => have.has(w) || [...have].some((h) => h.includes(w) || w.includes(h)));
}

/**
 * Rank real recipes by how much of each one the user can already cook.
 * Only returns dishes with at least one genuine ingredient match.
 */
export function matchDishes(items: string[], limit = 6): DishMatch[] {
  // Canonical ingredient ids come first: a scanned "shredded sharp cheddar"
  // and a recipe's "1 cup grated cheddar" are the same real ingredient.
  const haveIds = resolveAll(items);
  const have = userTokens(items);
  if (haveIds.size === 0 && have.size === 0) return [];

  const scored: DishMatch[] = [];
  for (const dish of DISHES) {
    const hits: string[] = [];
    const gaps: string[] = [];
    let realHits = 0;

    for (const line of dish.ingredients) {
      const known = resolveIngredient(line);
      const staple = known?.staple === true || STAPLES.test(line);
      const covered = known
        ? haveIds.has(known.id) || (staple && haveIds.size > 0)
        : lineIsCovered(line, have);
      if (covered) {
        hits.push(line);
        if (!staple) realHits += 1;
      } else if (staple) {
        hits.push(line);
      } else {
        gaps.push(line);
      }
    }

    if (realHits === 0) continue;
    scored.push({
      dish,
      have: hits,
      missing: gaps,
      coverage: hits.length / dish.ingredients.length,
    });
  }

  return scored
    .sort((a, b) => b.coverage - a.coverage || a.missing.length - b.missing.length)
    .slice(0, limit);
}

export function totalMinutes(dish: Dish): number {
  return dish.prepMinutes + dish.cookMinutes;
}
