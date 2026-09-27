/**
 * Rough calorie data for grocery products.
 *
 * Store Mode uses this to turn "2 × 16 oz box of penne" into "about 8 servings,
 * ~200 cal a serving, ~$0.27 a serving". Values are typical USDA-style averages
 * per ounce (or per fluid ounce for drinks) — estimates for planning, never a
 * nutrition label and never medical advice.
 */

import type { Aisle } from "@/lib/aisles";

type FoodNutrition = {
  /** Calories per ounce (weight) or per fluid ounce (liquids). */
  kcalPerOunce: number;
  /** A normal single serving, in the same unit. */
  servingOunces: number;
  servingLabel: string;
};

/** Keyed by ingredient id from src/lib/ingredients-db.ts. */
const BY_INGREDIENT: Record<string, FoodNutrition> = {
  // Meat & seafood (raw weight)
  "chicken-breast": { kcalPerOunce: 33, servingOunces: 4, servingLabel: "4 oz" },
  "chicken-thigh": { kcalPerOunce: 48, servingOunces: 4, servingLabel: "4 oz" },
  "whole-chicken": { kcalPerOunce: 45, servingOunces: 5, servingLabel: "5 oz" },
  chicken: { kcalPerOunce: 40, servingOunces: 4, servingLabel: "4 oz" },
  "ground-beef": { kcalPerOunce: 71, servingOunces: 4, servingLabel: "4 oz" },
  "ground-turkey": { kcalPerOunce: 42, servingOunces: 4, servingLabel: "4 oz" },
  steak: { kcalPerOunce: 62, servingOunces: 6, servingLabel: "6 oz" },
  beef: { kcalPerOunce: 62, servingOunces: 4, servingLabel: "4 oz" },
  pork: { kcalPerOunce: 60, servingOunces: 4, servingLabel: "4 oz" },
  bacon: { kcalPerOunce: 155, servingOunces: 1, servingLabel: "2 slices" },
  sausage: { kcalPerOunce: 90, servingOunces: 3, servingLabel: "3 oz" },
  turkey: { kcalPerOunce: 40, servingOunces: 4, servingLabel: "4 oz" },
  shrimp: { kcalPerOunce: 30, servingOunces: 4, servingLabel: "4 oz" },
  salmon: { kcalPerOunce: 58, servingOunces: 6, servingLabel: "6 oz" },
  "white-fish": { kcalPerOunce: 26, servingOunces: 6, servingLabel: "6 oz" },
  "canned-tuna": { kcalPerOunce: 33, servingOunces: 2.5, servingLabel: "1/2 can" },

  // Dairy & eggs
  eggs: { kcalPerOunce: 40, servingOunces: 3.5, servingLabel: "2 eggs" },
  milk: { kcalPerOunce: 19, servingOunces: 8, servingLabel: "1 cup" },
  butter: { kcalPerOunce: 204, servingOunces: 0.5, servingLabel: "1 tbsp" },
  "heavy-cream": { kcalPerOunce: 101, servingOunces: 1, servingLabel: "2 tbsp" },
  "sour-cream": { kcalPerOunce: 55, servingOunces: 1, servingLabel: "2 tbsp" },
  "cream-cheese": { kcalPerOunce: 99, servingOunces: 1, servingLabel: "1 oz" },
  yogurt: { kcalPerOunce: 17, servingOunces: 6, servingLabel: "6 oz" },
  cheddar: { kcalPerOunce: 114, servingOunces: 1, servingLabel: "1 oz" },
  mozzarella: { kcalPerOunce: 85, servingOunces: 1, servingLabel: "1 oz" },
  parmesan: { kcalPerOunce: 111, servingOunces: 0.5, servingLabel: "2 tbsp" },

  // Pantry / grains (dry weight)
  pasta: { kcalPerOunce: 100, servingOunces: 2, servingLabel: "2 oz dry" },
  spaghetti: { kcalPerOunce: 100, servingOunces: 2, servingLabel: "2 oz dry" },
  rice: { kcalPerOunce: 103, servingOunces: 2, servingLabel: "2 oz dry" },
  flour: { kcalPerOunce: 103, servingOunces: 1, servingLabel: "1/4 cup" },
  sugar: { kcalPerOunce: 109, servingOunces: 0.5, servingLabel: "1 tbsp" },
  bread: { kcalPerOunce: 75, servingOunces: 1.5, servingLabel: "1 slice" },
  tortillas: { kcalPerOunce: 80, servingOunces: 1.5, servingLabel: "1 tortilla" },
  oats: { kcalPerOunce: 108, servingOunces: 1.4, servingLabel: "1/2 cup dry" },
  "olive-oil": { kcalPerOunce: 240, servingOunces: 0.5, servingLabel: "1 tbsp" },
  beans: { kcalPerOunce: 26, servingOunces: 4.5, servingLabel: "1/2 cup" },
  lentils: { kcalPerOunce: 100, servingOunces: 1.8, servingLabel: "1/4 cup dry" },
  "canned-tomato": { kcalPerOunce: 6, servingOunces: 4, servingLabel: "1/2 cup" },
  "tomato-paste": { kcalPerOunce: 23, servingOunces: 1, servingLabel: "2 tbsp" },
  "peanut-butter": { kcalPerOunce: 167, servingOunces: 1.1, servingLabel: "2 tbsp" },
  breadcrumbs: { kcalPerOunce: 112, servingOunces: 1, servingLabel: "1/4 cup" },
  tortilla: { kcalPerOunce: 80, servingOunces: 1.5, servingLabel: "1 tortilla" },
  honey: { kcalPerOunce: 86, servingOunces: 0.75, servingLabel: "1 tbsp" },
  broth: { kcalPerOunce: 2, servingOunces: 8, servingLabel: "1 cup" },
  "coconut-milk": { kcalPerOunce: 55, servingOunces: 2, servingLabel: "1/4 cup" },
  oil: { kcalPerOunce: 240, servingOunces: 0.5, servingLabel: "1 tbsp" },
  mayo: { kcalPerOunce: 200, servingOunces: 0.5, servingLabel: "1 tbsp" },
  ketchup: { kcalPerOunce: 29, servingOunces: 0.6, servingLabel: "1 tbsp" },
  mustard: { kcalPerOunce: 17, servingOunces: 0.2, servingLabel: "1 tsp" },
  "soy-sauce": { kcalPerOunce: 10, servingOunces: 0.5, servingLabel: "1 tbsp" },
  nuts: { kcalPerOunce: 170, servingOunces: 1, servingLabel: "1 oz" },
  chocolate: { kcalPerOunce: 150, servingOunces: 1, servingLabel: "1 oz" },
  tofu: { kcalPerOunce: 22, servingOunces: 3, servingLabel: "3 oz" },
  feta: { kcalPerOunce: 75, servingOunces: 1, servingLabel: "1 oz" },
  cheese: { kcalPerOunce: 110, servingOunces: 1, servingLabel: "1 oz" },
  "frozen-vegetables": { kcalPerOunce: 10, servingOunces: 3, servingLabel: "1 cup" },
  "frozen-fruit": { kcalPerOunce: 16, servingOunces: 4.9, servingLabel: "1 cup" },

  // Produce
  potato: { kcalPerOunce: 22, servingOunces: 5.3, servingLabel: "1 medium" },
  "sweet-potato": { kcalPerOunce: 24, servingOunces: 4.6, servingLabel: "1 medium" },
  onion: { kcalPerOunce: 11, servingOunces: 4, servingLabel: "1 medium" },
  garlic: { kcalPerOunce: 42, servingOunces: 0.1, servingLabel: "1 clove" },
  "green-onion": { kcalPerOunce: 9, servingOunces: 0.5, servingLabel: "2 tbsp" },
  shallot: { kcalPerOunce: 20, servingOunces: 1, servingLabel: "1 shallot" },
  carrot: { kcalPerOunce: 12, servingOunces: 3, servingLabel: "1 medium" },
  celery: { kcalPerOunce: 5, servingOunces: 1.4, servingLabel: "1 stalk" },
  "bell-pepper": { kcalPerOunce: 6, servingOunces: 4.2, servingLabel: "1 pepper" },
  "chili-pepper": { kcalPerOunce: 11, servingOunces: 0.5, servingLabel: "1 chili" },
  apple: { kcalPerOunce: 15, servingOunces: 6.4, servingLabel: "1 apple" },
  banana: { kcalPerOunce: 25, servingOunces: 4.2, servingLabel: "1 banana" },
  orange: { kcalPerOunce: 13, servingOunces: 4.6, servingLabel: "1 orange" },
  pear: { kcalPerOunce: 16, servingOunces: 6, servingLabel: "1 pear" },
  grapes: { kcalPerOunce: 20, servingOunces: 3.2, servingLabel: "1 cup" },
  berries: { kcalPerOunce: 16, servingOunces: 5, servingLabel: "1 cup" },
  pineapple: { kcalPerOunce: 14, servingOunces: 5.8, servingLabel: "1 cup" },
  lemon: { kcalPerOunce: 8, servingOunces: 2, servingLabel: "1 lemon" },
  lime: { kcalPerOunce: 9, servingOunces: 2, servingLabel: "1 lime" },
  broccoli: { kcalPerOunce: 10, servingOunces: 3, servingLabel: "1 cup" },
  cauliflower: { kcalPerOunce: 7, servingOunces: 3.5, servingLabel: "1 cup" },
  spinach: { kcalPerOunce: 7, servingOunces: 1, servingLabel: "1 cup" },
  kale: { kcalPerOunce: 14, servingOunces: 0.7, servingLabel: "1 cup" },
  lettuce: { kcalPerOunce: 4, servingOunces: 2, servingLabel: "2 cups" },
  cabbage: { kcalPerOunce: 7, servingOunces: 3, servingLabel: "1 cup" },
  cucumber: { kcalPerOunce: 4, servingOunces: 3.5, servingLabel: "1 cup" },
  zucchini: { kcalPerOunce: 5, servingOunces: 4.2, servingLabel: "1 cup" },
  squash: { kcalPerOunce: 12, servingOunces: 7.2, servingLabel: "1 cup" },
  mushroom: { kcalPerOunce: 6, servingOunces: 2.5, servingLabel: "1 cup" },
  corn: { kcalPerOunce: 24, servingOunces: 3, servingLabel: "1 ear" },
  peas: { kcalPerOunce: 23, servingOunces: 2.8, servingLabel: "1/2 cup" },
  "green-beans": { kcalPerOunce: 9, servingOunces: 3.9, servingLabel: "1 cup" },
  asparagus: { kcalPerOunce: 6, servingOunces: 4.7, servingLabel: "1 cup" },
  eggplant: { kcalPerOunce: 7, servingOunces: 2.9, servingLabel: "1 cup" },
  beet: { kcalPerOunce: 12, servingOunces: 4.8, servingLabel: "1 cup" },
  "brussels-sprouts": { kcalPerOunce: 12, servingOunces: 3, servingLabel: "1 cup" },
  ginger: { kcalPerOunce: 23, servingOunces: 0.2, servingLabel: "1 tsp" },
  tomato: { kcalPerOunce: 5, servingOunces: 4.3, servingLabel: "1 tomato" },
  avocado: { kcalPerOunce: 45, servingOunces: 2.4, servingLabel: "1/2 avocado" },
};

/** Fallbacks when the exact food isn't in the table. */
const BY_AISLE: Record<string, FoodNutrition> = {
  meat: { kcalPerOunce: 50, servingOunces: 4, servingLabel: "4 oz" },
  dairy: { kcalPerOunce: 40, servingOunces: 4, servingLabel: "4 oz" },
  produce: { kcalPerOunce: 12, servingOunces: 4, servingLabel: "1 cup" },
  pantry: { kcalPerOunce: 90, servingOunces: 2, servingLabel: "2 oz" },
  bakery: { kcalPerOunce: 80, servingOunces: 1.5, servingLabel: "1 slice" },
  frozen: { kcalPerOunce: 35, servingOunces: 4, servingLabel: "4 oz" },
  drinks: { kcalPerOunce: 12, servingOunces: 8, servingLabel: "1 cup" },
};

export type ProductNutrition = {
  /** Whole servings the package(s) hold. */
  servings: number;
  caloriesPerServing: number;
  servingLabel: string;
  /** Total calories across everything scanned. */
  totalCalories: number;
};

/**
 * Estimated servings and calories for a resolved product.
 * Returns null when we can't tell the size or the food.
 */
export function productNutrition(args: {
  ingredientId?: string | undefined;
  aisle?: Aisle | undefined;
  totalOunces: number | null;
  totalFluidOunces: number | null;
}): ProductNutrition | null {
  const data =
    (args.ingredientId ? BY_INGREDIENT[args.ingredientId] : undefined) ??
    (args.aisle ? BY_AISLE[args.aisle] : undefined);
  if (!data) return null;

  const amount = args.totalOunces ?? args.totalFluidOunces;
  if (amount === null || amount <= 0) return null;

  const servings = Math.max(1, Math.round(amount / data.servingOunces));
  const caloriesPerServing = Math.round(data.kcalPerOunce * data.servingOunces);
  return {
    servings,
    caloriesPerServing,
    servingLabel: data.servingLabel,
    totalCalories: Math.round(caloriesPerServing * servings),
  };
}
