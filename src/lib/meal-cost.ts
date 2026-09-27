/**
 * What a dish costs to put on the table — the whole recipe, what's left to buy
 * after your kitchen is counted, and the cost per serving so meals can be
 * compared against each other.
 */

import type { Dish } from "@/lib/seo/content";
import { estimateTotal } from "@/lib/grocery-prices";

export type MealCost = {
  /** Every ingredient, as if you owned nothing. */
  full: number;
  /** Only the lines you still need to buy. */
  toBuy: number;
  /** Full cost divided by servings. */
  perServing: number;
  /** True when at least one line had to be guessed. */
  anyGuessed: boolean;
};

export function dishCost(dish: Dish, missing?: string[]): MealCost {
  const all = estimateTotal(dish.ingredients);
  const buy = missing ? estimateTotal(missing) : all;
  const servings = dish.servings > 0 ? dish.servings : 1;
  return {
    full: all.total,
    toBuy: buy.total,
    perServing: Math.round((all.total / servings) * 100) / 100,
    anyGuessed: all.anyGuessed || buy.anyGuessed,
  };
}
