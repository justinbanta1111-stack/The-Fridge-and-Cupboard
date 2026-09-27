/**
 * Recipes the user has picked to cook. Local-first (works for guests), used by
 * the one-tap shopping plan to consolidate ingredients across recipes.
 * Purely additive — nothing else depends on it.
 */

const KEY = "tfc_recipe_cart_v1";

export type CartRecipe = {
  id: string;
  title: string;
  /** Free-text ingredient lines, e.g. "2 cups rice". */
  ingredients: string[];
  note?: string;
  at: number;
};

function read(): CartRecipe[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as CartRecipe[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartRecipe[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

export function recipeKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 60);
}

export function getRecipeCart(): CartRecipe[] {
  return read().sort((a, b) => b.at - a.at);
}

export function isRecipeChosen(title: string): boolean {
  const id = recipeKey(title);
  return read().some((r) => r.id === id);
}

export function addRecipeToCart(
  title: string,
  ingredients: string[],
  note?: string,
): CartRecipe[] {
  const clean = title.trim();
  if (!clean) return getRecipeCart();
  const id = recipeKey(clean);
  const items = read().filter((r) => r.id !== id);
  items.push({
    id,
    title: clean,
    ingredients: ingredients.map((i) => i.trim()).filter(Boolean).slice(0, 40),
    note: note?.trim() || undefined,
    at: Date.now(),
  });
  write(items);
  return getRecipeCart();
}

export function removeRecipeFromCart(id: string): CartRecipe[] {
  write(read().filter((r) => r.id !== id));
  return getRecipeCart();
}

export function toggleRecipeInCart(
  title: string,
  ingredients: string[],
  note?: string,
): CartRecipe[] {
  return isRecipeChosen(title)
    ? removeRecipeFromCart(recipeKey(title))
    : addRecipeToCart(title, ingredients, note);
}

export function clearRecipeCart(): CartRecipe[] {
  write([]);
  return [];
}
