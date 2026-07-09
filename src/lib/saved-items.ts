// Local-first saved items store. Works for guests (localStorage) and signed-in
// users alike. Sync to Supabase can be layered on later via a `saved_items` table
// without changing this API.

export type SavedCategory =
  | "recipes"
  | "leftovers"
  | "quick"
  | "family"
  | "senior"
  | "mom"
  | "healthy"
  | "comfort"
  | "pantry"
  | "fridge-scan"
  | "tips"
  | "other";

export const CATEGORY_LABELS: Record<SavedCategory, string> = {
  recipes: "Recipes",
  leftovers: "Leftovers",
  quick: "Quick Meals",
  family: "Family Meals",
  senior: "Senior Meals",
  mom: "Mom Meals",
  healthy: "Healthy Meals",
  comfort: "Comfort Meals",
  pantry: "Pantry Ideas",
  "fridge-scan": "Fridge Scans",
  tips: "Tips",
  other: "Other",
};

export const CATEGORY_ORDER: SavedCategory[] = [
  "recipes",
  "leftovers",
  "quick",
  "family",
  "senior",
  "mom",
  "healthy",
  "comfort",
  "pantry",
  "fridge-scan",
  "tips",
  "other",
];

export type SavedItem = {
  /** Stable id — usually a slug derived from title + category. */
  id: string;
  category: SavedCategory;
  title: string;
  subtitle?: string;
  /** Optional source URL or internal route. */
  href?: string;
  /** Optional ingredients list — used for "you still have ingredients" matching. */
  ingredients?: string[];
  tags?: string[];
  /** ms epoch. */
  savedAt: number;
  /** Cooking history. */
  cookedCount: number;
  lastCookedAt?: number;
};

const KEY = "tfc.saved-items.v1";
const EVENT = "tfc:saved-items:change";

function safeRead(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedItem[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(items: SavedItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* quota or private mode */
  }
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function makeSavedId(category: SavedCategory, title: string) {
  return `${category}:${slugify(title)}`;
}

export function listSaved(): SavedItem[] {
  return safeRead().sort((a, b) => b.savedAt - a.savedAt);
}

export function listSavedByCategory(category: SavedCategory): SavedItem[] {
  return listSaved().filter((i) => i.category === category);
}

export function isSaved(id: string): boolean {
  return safeRead().some((i) => i.id === id);
}

export function saveItem(input: Omit<SavedItem, "savedAt" | "cookedCount" | "id"> & { id?: string }): SavedItem {
  const id = input.id ?? makeSavedId(input.category, input.title);
  const items = safeRead();
  const existing = items.find((i) => i.id === id);
  if (existing) return existing; // no duplicates
  const item: SavedItem = {
    ...input,
    id,
    savedAt: Date.now(),
    cookedCount: 0,
  };
  items.push(item);
  safeWrite(items);
  return item;
}

export function removeSaved(id: string) {
  const items = safeRead().filter((i) => i.id !== id);
  safeWrite(items);
}

export function toggleSaved(input: Omit<SavedItem, "savedAt" | "cookedCount" | "id"> & { id?: string }): boolean {
  const id = input.id ?? makeSavedId(input.category, input.title);
  if (isSaved(id)) {
    removeSaved(id);
    return false;
  }
  saveItem({ ...input, id });
  return true;
}

export function recordCooked(id: string) {
  const items = safeRead();
  const next = items.map((i) =>
    i.id === id ? { ...i, cookedCount: i.cookedCount + 1, lastCookedAt: Date.now() } : i,
  );
  safeWrite(next);
}

export function topCooked(limit = 5): SavedItem[] {
  return safeRead()
    .filter((i) => i.cookedCount > 0)
    .sort((a, b) => b.cookedCount - a.cookedCount || (b.lastCookedAt ?? 0) - (a.lastCookedAt ?? 0))
    .slice(0, limit);
}

export function subscribeSaved(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) cb();
  });
  return () => {
    window.removeEventListener(EVENT, handler);
  };
}

export const SAVED_CHANGE_EVENT = EVENT;
