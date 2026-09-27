/**
 * Real meal suggestions — never placeholder titles.
 *
 * Order of truth:
 *  1. The cook's own saved recipes (My Recipes + saved recipe cards)
 *  2. Real library dishes matched against what's actually in the kitchen
 *  3. Real library dishes as a dependable fallback
 */

import { DISHES } from "@/lib/seo/content";
import { matchDishes } from "@/lib/recipe-match";
import { getMyRecipes } from "@/lib/my-recipes";
import { listSavedByCategory } from "@/lib/saved-items";
import { getScanContext } from "@/lib/scan-context";
import { getTopStaples } from "@/lib/memory-kitchen";
import type { MealSuggestion } from "@/components/MealCardGrid";

function dedupe(list: MealSuggestion[], limit: number): MealSuggestion[] {
  const seen = new Set<string>();
  const out: MealSuggestion[] = [];
  for (const m of list) {
    const key = m.name.trim().toLowerCase();
    if (!key || key.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}

/** The cook's own recipes, newest first. */
export function myRecipeSuggestions(limit = 12): MealSuggestion[] {
  const own: MealSuggestion[] = getMyRecipes().map((r) => ({
    name: r.title,
    description: r.ingredients.slice(0, 4).join(", "),
    uses: r.ingredients.slice(0, 6),
  }));
  const saved: MealSuggestion[] = listSavedByCategory("recipes").map((s) => ({
    name: s.title,
    description: s.subtitle,
    uses: s.ingredients?.slice(0, 6),
  }));
  return dedupe([...own, ...saved], limit);
}

/** Real library dishes ranked by what the kitchen already covers. */
export function kitchenMealSuggestions(limit = 9): MealSuggestion[] {
  const items = [...(getScanContext()?.items ?? []), ...getTopStaples()];
  const matched = items.length
    ? matchDishes(items, limit).map(({ dish, have }) => ({
        name: dish.name,
        description: dish.summary,
        minutes: dish.prepMinutes + dish.cookMinutes,
        uses: have.slice(0, 4),
      }))
    : [];
  const fallback = DISHES.map((d) => ({
    name: d.name,
    description: d.summary,
    minutes: d.prepMinutes + d.cookMinutes,
  }));
  return dedupe([...matched, ...fallback], limit);
}

/** Everything together: their recipes first, then real matched dishes. */
export function mealSuggestions(limit = 12): MealSuggestion[] {
  return dedupe([...myRecipeSuggestions(limit), ...kitchenMealSuggestions(limit)], limit);
}
