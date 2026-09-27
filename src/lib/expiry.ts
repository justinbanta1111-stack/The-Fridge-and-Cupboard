/**
 * Gentle fridge expiration tracking. Local-first, works for guests.
 * Nothing here touches the scanning or voice pipelines.
 */

const KEY = "tfc_expiry_items_v1";

export type ExpiryItem = {
  id: string;
  name: string;
  /** ISO date (yyyy-mm-dd) the item is best by. */
  bestBy: string;
  addedAt: number;
};

export type ExpiryStatus = "fresh" | "soon" | "today" | "past";

/** Rough best-by windows (days) so we can suggest a date for common foods. */
const SHELF_LIFE: Array<[RegExp, number]> = [
  [/spinach|lettuce|arugula|greens|herb|basil|cilantro|berr|raspberr|strawberr/i, 4],
  [/fish|salmon|shrimp|seafood|ground beef|ground turkey|chicken|pork chop/i, 2],
  [/milk|cream|yogurt|leftover/i, 5],
  [/tomato|cucumber|pepper|zucchini|mushroom|avocado|banana|grape/i, 6],
  [/beef|steak|bacon|deli|ham|tofu|hummus|salsa/i, 7],
  [/cheese|butter|egg|apple|orange|lemon|lime|broccoli|cauliflower|celery/i, 14],
  [/carrot|potato|onion|garlic|squash|cabbage|beet/i, 21],
];

export function suggestBestBy(name: string, from: Date = new Date()): string {
  const days = SHELF_LIFE.find(([re]) => re.test(name))?.[1] ?? 7;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysUntil(bestBy: string): number {
  const [y, m, d] = bestBy.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function statusOf(bestBy: string): ExpiryStatus {
  const days = daysUntil(bestBy);
  if (days < 0) return "past";
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  return "fresh";
}

export function friendlyWindow(bestBy: string): string {
  const days = daysUntil(bestBy);
  if (days < -1) return `${Math.abs(days)} days past its best`;
  if (days === -1) return "a day past its best";
  if (days === 0) return "best used today";
  if (days === 1) return "best used tomorrow";
  return `about ${days} days left`;
}

function read(): ExpiryItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ExpiryItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: ExpiryItem[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export function getExpiryItems(): ExpiryItem[] {
  return read().sort((a, b) => daysUntil(a.bestBy) - daysUntil(b.bestBy));
}

/** Items that deserve a gentle nudge: past, today, or within 3 days. */
export function getExpiringSoon(): ExpiryItem[] {
  return getExpiryItems().filter((i) => statusOf(i.bestBy) !== "fresh");
}

export function addExpiryItem(name: string, bestBy?: string): ExpiryItem[] {
  const clean = name.trim();
  if (!clean) return getExpiryItems();
  const items = read().filter((i) => i.name.toLowerCase() !== clean.toLowerCase());
  items.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: clean,
    bestBy: bestBy || suggestBestBy(clean),
    addedAt: Date.now(),
  });
  write(items);
  return getExpiryItems();
}

export function updateExpiryDate(id: string, bestBy: string): ExpiryItem[] {
  write(read().map((i) => (i.id === id ? { ...i, bestBy } : i)));
  return getExpiryItems();
}

export function removeExpiryItem(id: string): ExpiryItem[] {
  write(read().filter((i) => i.id !== id));
  return getExpiryItems();
}

/** Adds tracking for scanned items without touching ones already tracked. */
export function trackScannedItems(names: string[]): ExpiryItem[] {
  const items = read();
  const known = new Set(items.map((i) => i.name.toLowerCase()));
  for (const raw of names.slice(0, 25)) {
    const clean = raw.trim();
    if (!clean || known.has(clean.toLowerCase())) continue;
    known.add(clean.toLowerCase());
    items.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: clean,
      bestBy: suggestBestBy(clean),
      addedAt: Date.now(),
    });
  }
  write(items);
  return getExpiryItems();
}
