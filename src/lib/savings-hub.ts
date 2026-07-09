// Client-side trackers for Batch C: waste, ingredient history,
// leftover lifespan, savings dashboard, no-shop streaks.
// All data lives in localStorage so the feature works for guests too.

const KEYS = {
  waste: "fc.waste.entries.v1",
  ingredients: "fc.ingredients.usage.v1",
  leftovers: "fc.leftovers.v1",
  savings: "fc.savings.totals.v1",
  streak: "fc.streak.v1",
  budget: "fc.budget.mode.v1",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ===== Waste Tracker =====
export type WasteEntry = {
  id: string;
  name: string;
  costCents: number;
  reason?: "expired" | "spoiled" | "forgot" | "too-much" | "other";
  at: number;
};

export function logWaste(entry: Omit<WasteEntry, "id" | "at"> & { at?: number }) {
  const list = read<WasteEntry[]>(KEYS.waste, []);
  list.unshift({
    id: crypto.randomUUID(),
    at: entry.at ?? Date.now(),
    name: entry.name,
    costCents: Math.max(0, Math.round(entry.costCents)),
    reason: entry.reason,
  });
  write(KEYS.waste, list.slice(0, 500));
  // also feed ingredient history
  bumpIngredient(entry.name, "wasted");
}

export function getWasteEntries(): WasteEntry[] {
  return read<WasteEntry[]>(KEYS.waste, []);
}

export function removeWaste(id: string) {
  write(KEYS.waste, getWasteEntries().filter((w) => w.id !== id));
}

export function wasteTotals() {
  const now = Date.now();
  const week = 7 * 86400_000;
  const month = 30 * 86400_000;
  const entries = getWasteEntries();
  const sum = (arr: WasteEntry[]) =>
    arr.reduce((a, b) => ({ items: a.items + 1, cents: a.cents + b.costCents }), { items: 0, cents: 0 });
  const weekly = sum(entries.filter((e) => now - e.at <= week));
  const monthly = sum(entries.filter((e) => now - e.at <= month));
  const all = sum(entries);
  // top wasted ingredients
  const counts = new Map<string, number>();
  entries.forEach((e) => counts.set(e.name.toLowerCase(), (counts.get(e.name.toLowerCase()) ?? 0) + 1));
  const topWasted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  return { weekly, monthly, all, topWasted };
}

// ===== Ingredient History =====
type IngStat = { name: string; used: number; wasted: number; favorited: number; lastAt: number };

export function bumpIngredient(name: string, kind: "used" | "wasted" | "favorited") {
  const key = name.trim().toLowerCase();
  if (!key) return;
  const all = read<Record<string, IngStat>>(KEYS.ingredients, {});
  const cur = all[key] ?? { name: key, used: 0, wasted: 0, favorited: 0, lastAt: 0 };
  cur[kind] += 1;
  cur.lastAt = Date.now();
  all[key] = cur;
  write(KEYS.ingredients, all);
}

export function bumpIngredients(names: string[]) {
  names.forEach((n) => bumpIngredient(n, "used"));
}

export function getIngredientStats() {
  const all = Object.values(read<Record<string, IngStat>>(KEYS.ingredients, {}));
  const mostUsed = [...all].sort((a, b) => b.used - a.used).slice(0, 8);
  const leastUsed = [...all].filter((i) => i.used > 0).sort((a, b) => a.used - b.used).slice(0, 8);
  const mostWasted = [...all].sort((a, b) => b.wasted - a.wasted).filter((i) => i.wasted > 0).slice(0, 8);
  const favorites = [...all].sort((a, b) => b.favorited - a.favorited).filter((i) => i.favorited > 0).slice(0, 8);
  return { mostUsed, leastUsed, mostWasted, favorites };
}

// ===== Leftover Lifespan =====
export type Leftover = {
  id: string;
  name: string;
  cookedAt: number; // ms
  storage: "fridge" | "freezer";
  notes?: string;
};

export function addLeftover(input: Omit<Leftover, "id">) {
  const list = read<Leftover[]>(KEYS.leftovers, []);
  list.unshift({ ...input, id: crypto.randomUUID() });
  write(KEYS.leftovers, list);
}

export function getLeftovers(): Leftover[] {
  return read<Leftover[]>(KEYS.leftovers, []);
}

export function removeLeftover(id: string) {
  write(KEYS.leftovers, getLeftovers().filter((l) => l.id !== id));
}

export function leftoverStatus(l: Leftover): {
  day: number;
  label: string;
  tone: "fresh" | "use" | "freeze" | "toss";
  message: string;
} {
  const days = Math.floor((Date.now() - l.cookedAt) / 86400_000);
  if (l.storage === "freezer") {
    if (days <= 30) return { day: days, label: `Frozen ${days}d`, tone: "fresh", message: "Good — use within 90 days." };
    if (days <= 90) return { day: days, label: `Frozen ${days}d`, tone: "use", message: "Use soon for best quality." };
    return { day: days, label: `Frozen ${days}d`, tone: "toss", message: "Quality fading — eat soon or toss." };
  }
  if (days <= 1) return { day: days, label: `Day ${days + 1}`, tone: "fresh", message: "Fresh — enjoy anytime." };
  if (days === 2) return { day: days, label: "Day 3", tone: "use", message: "Use now — peak window." };
  if (days === 3) return { day: days, label: "Day 4", tone: "freeze", message: "Freeze now or eat today." };
  return { day: days, label: `Day ${days + 1}`, tone: "toss", message: "Toss soon — past safe window." };
}

// ===== Savings Dashboard (local quick log) =====
type SavingsTotals = {
  moneySavedCents: number;
  foodRescued: number;
  mealsCreated: number;
  leftoversUsed: number;
  wastePreventedItems: number;
};

const SAVINGS_DEFAULT: SavingsTotals = {
  moneySavedCents: 0,
  foodRescued: 0,
  mealsCreated: 0,
  leftoversUsed: 0,
  wastePreventedItems: 0,
};

export function getSavingsTotals(): SavingsTotals {
  return read<SavingsTotals>(KEYS.savings, SAVINGS_DEFAULT);
}

export function addSavings(delta: Partial<SavingsTotals>) {
  const cur = getSavingsTotals();
  const next: SavingsTotals = {
    moneySavedCents: cur.moneySavedCents + (delta.moneySavedCents ?? 0),
    foodRescued: cur.foodRescued + (delta.foodRescued ?? 0),
    mealsCreated: cur.mealsCreated + (delta.mealsCreated ?? 0),
    leftoversUsed: cur.leftoversUsed + (delta.leftoversUsed ?? 0),
    wastePreventedItems: cur.wastePreventedItems + (delta.wastePreventedItems ?? 0),
  };
  write(KEYS.savings, next);
  return next;
}

// ===== Streaks: days without shopping =====
type StreakState = { startedAt: number; lastCheckIn: number; best: number };

export function getStreak(): { days: number; best: number; startedAt: number } {
  const s = read<StreakState>(KEYS.streak, { startedAt: Date.now(), lastCheckIn: Date.now(), best: 0 });
  const days = Math.max(0, Math.floor((Date.now() - s.startedAt) / 86400_000));
  return { days, best: Math.max(s.best, days), startedAt: s.startedAt };
}

export function checkInStreak() {
  const s = read<StreakState>(KEYS.streak, { startedAt: Date.now(), lastCheckIn: Date.now(), best: 0 });
  const days = Math.max(0, Math.floor((Date.now() - s.startedAt) / 86400_000));
  s.lastCheckIn = Date.now();
  s.best = Math.max(s.best, days);
  write(KEYS.streak, s);
  return { days, best: s.best };
}

export function resetStreak() {
  const prev = read<StreakState>(KEYS.streak, { startedAt: Date.now(), lastCheckIn: Date.now(), best: 0 });
  const prevDays = Math.max(0, Math.floor((Date.now() - prev.startedAt) / 86400_000));
  const best = Math.max(prev.best, prevDays);
  write(KEYS.streak, { startedAt: Date.now(), lastCheckIn: Date.now(), best });
  return { days: 0, best };
}

// ===== Budget Mode flag =====
export function getBudgetMode(): boolean {
  return read<boolean>(KEYS.budget, false);
}
export function setBudgetMode(on: boolean) {
  write(KEYS.budget, !!on);
}

export function streakReward(days: number): string {
  if (days >= 30) return "🏆 30-day legend";
  if (days >= 14) return "🔥 14-day streak";
  if (days >= 7) return "⭐ 7-day streak";
  if (days >= 3) return "✨ 3-day streak";
  return "Just started";
}

export function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
