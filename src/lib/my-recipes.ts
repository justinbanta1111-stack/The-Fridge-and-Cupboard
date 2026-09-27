/**
 * Local-first personal recipe book. Guests and signed-in users alike.
 */

const KEY = "tfc_my_recipes_v1";

export type MyRecipe = {
  id: string;
  title: string;
  ingredients: string[];
  steps?: string;
  at: number;
};

function read(): MyRecipe[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as MyRecipe[]) : [];
  } catch {
    return [];
  }
}

function write(items: MyRecipe[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export function getMyRecipes(): MyRecipe[] {
  return read().sort((a, b) => b.at - a.at);
}

export function parseIngredients(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function addMyRecipe(title: string, ingredientsRaw: string, steps?: string): MyRecipe[] {
  const clean = title.trim();
  const ingredients = parseIngredients(ingredientsRaw);
  if (!clean || ingredients.length === 0) return getMyRecipes();
  const items = read();
  items.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: clean,
    ingredients,
    steps: steps?.trim() || undefined,
    at: Date.now(),
  });
  write(items);
  return getMyRecipes();
}

export function removeMyRecipe(id: string): MyRecipe[] {
  write(read().filter((r) => r.id !== id));
  return getMyRecipes();
}
