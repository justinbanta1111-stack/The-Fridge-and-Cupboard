// Smart Fridge Vision — Batch G
// Pure client-side analytics over Batch C trackers + recent inventory.

import {
  getIngredientStats,
  getWasteEntries,
  getLeftovers,
  leftoverStatus,
} from "./savings-hub";

export type Pattern = { kind: "buy-often" | "waste-often" | "runs-out" | "sits-too-long"; name: string; detail: string };

export type Prediction = { name: string; daysLeft: number; message: string };

export type MealForecast = {
  total: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
};

export type RestockSuggestion = { name: string; reason: string };

export type PersonalityScore = {
  protein: number;     // 0-100
  produce: number;
  leftovers: number;
  variety: number;
  overall: number;
  tagline: string;
  notes: string[];
};

// ---------- Pattern Recognition ----------
export function detectPatterns(): Pattern[] {
  const { mostUsed, mostWasted, favorites } = getIngredientStats();
  const out: Pattern[] = [];
  for (const w of mostWasted.slice(0, 3)) {
    out.push({ kind: "waste-often", name: w.name, detail: `You've wasted ${w.name} ${w.wasted} time${w.wasted === 1 ? "" : "s"}.` });
  }
  for (const u of mostUsed.slice(0, 3)) {
    if (u.used >= 2) out.push({ kind: "buy-often", name: u.name, detail: `You use ${u.name} often (${u.used}x).` });
  }
  for (const f of favorites.slice(0, 2)) {
    out.push({ kind: "buy-often", name: f.name, detail: `${f.name} is a household favorite.` });
  }
  // sits-too-long: items used 0 times but seen
  const all = [...getIngredientStats().mostUsed, ...getIngredientStats().leastUsed];
  const seen = new Set<string>();
  for (const i of all) {
    if (seen.has(i.name)) continue;
    seen.add(i.name);
    if (i.used === 0 && i.lastAt && Date.now() - i.lastAt > 5 * 86400_000) {
      out.push({ kind: "sits-too-long", name: i.name, detail: `${i.name} has been sitting unused.` });
    }
  }
  return out.slice(0, 8);
}

// ---------- Predictive Alerts ----------
export function predictAlerts(currentItems: { name: string; freshness?: string; timeLeft?: string }[] = []): Prediction[] {
  const out: Prediction[] = [];
  const stats = getIngredientStats();
  const useRates = new Map<string, number>(); // uses per week
  for (const m of stats.mostUsed) {
    const weeks = Math.max(1, (Date.now() - (m.lastAt || Date.now())) / (7 * 86400_000));
    useRates.set(m.name.toLowerCase(), m.used / weeks);
  }
  // Runs-out predictions
  for (const item of currentItems) {
    const rate = useRates.get(item.name.toLowerCase()) ?? 0;
    if (rate >= 1.5) {
      const days = Math.max(1, Math.round(7 / rate));
      out.push({ name: item.name, daysLeft: days, message: `You will likely run out of ${item.name} in ${days} day${days === 1 ? "" : "s"}.` });
    }
  }
  // Use-soon predictions from freshness
  for (const item of currentItems) {
    if (item.freshness === "use-soon" || item.freshness === "questionable") {
      out.push({ name: item.name, daysLeft: 1, message: `You should use the ${item.name} tomorrow.` });
    }
  }
  // Leftovers approaching toss
  for (const l of getLeftovers()) {
    const s = leftoverStatus(l);
    if (s.tone === "use" || s.tone === "freeze") {
      out.push({ name: l.name, daysLeft: s.day, message: `${l.name} (leftover) — ${s.message.toLowerCase()}` });
    }
  }
  // dedupe by name
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = p.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 6);
}

// ---------- Auto Meal Forecast ----------
const PROTEIN = /\b(chicken|beef|pork|turkey|fish|salmon|tuna|shrimp|tofu|egg|eggs|beans|lentils|cheese|yogurt|milk)\b/i;
const PRODUCE = /\b(lettuce|spinach|kale|tomato|tomatoes|onion|garlic|pepper|carrot|broccoli|cucumber|zucchini|apple|banana|berry|berries|orange|lemon|lime|potato|sweet potato|mushroom)\b/i;
const STARCH = /\b(rice|pasta|bread|tortilla|tortillas|noodle|noodles|oats|oat|cereal|flour|quinoa)\b/i;
const SNACK = /\b(chips|crackers|nuts|granola|cheese|yogurt|fruit|hummus)\b/i;
const BREAKFAST = /\b(egg|eggs|oats|oat|cereal|yogurt|milk|bread|bagel|pancake|fruit|berry|berries)\b/i;

export function forecastMeals(items: string[]): MealForecast {
  const has = {
    protein: items.some((i) => PROTEIN.test(i)),
    produce: items.some((i) => PRODUCE.test(i)),
    starch: items.some((i) => STARCH.test(i)),
  };
  const breakfast = items.filter((i) => BREAKFAST.test(i)).length;
  const snacks = items.filter((i) => SNACK.test(i)).length;
  const dinnerBase = has.protein && has.starch ? 3 : has.protein || has.starch ? 1 : 0;
  const lunchBase = has.produce && (has.protein || has.starch) ? 2 : has.produce || has.protein ? 1 : 0;
  const breakfastCount = Math.min(4, Math.max(0, Math.floor(breakfast / 2)));
  const snackCount = Math.min(5, Math.max(0, Math.floor(snacks / 2)));
  const dinner = dinnerBase + Math.min(2, Math.floor(items.length / 8));
  const lunch = lunchBase + Math.min(2, Math.floor(items.length / 10));
  return {
    breakfast: breakfastCount,
    lunch,
    dinner,
    snacks: snackCount,
    total: breakfastCount + lunch + dinner + snackCount,
  };
}

// ---------- Missing Piece ----------
const COMMON_MULTIPLIERS = ["tortillas", "cheese", "broth", "cream", "eggs", "rice", "pasta", "bread", "onion", "garlic"];

export function missingPiece(items: string[]): { unlocked: number; suggestions: string[] } {
  const lower = items.map((i) => i.toLowerCase());
  const missing = COMMON_MULTIPLIERS.filter((m) => !lower.some((i) => i.includes(m)));
  const top = missing.slice(0, 4);
  const unlocked = top.length * 2; // each unlocks ~2 meals
  return { unlocked, suggestions: top };
}

// ---------- Smart Restock ----------
const DEFAULT_STAPLES = ["eggs", "onion", "garlic", "rice", "cheese", "broth", "olive oil", "butter"];

export function restockSuggestions(currentItems: string[]): RestockSuggestion[] {
  const lower = currentItems.map((i) => i.toLowerCase());
  const stats = getIngredientStats();
  const personalStaples = stats.mostUsed.filter((m) => m.used >= 2).map((m) => m.name);
  const merged = Array.from(new Set([...personalStaples, ...DEFAULT_STAPLES]));
  return merged
    .filter((s) => !lower.some((i) => i.includes(s.toLowerCase())))
    .slice(0, 6)
    .map((name) => ({
      name,
      reason: personalStaples.includes(name) ? "You use this often" : "Staple for many meals",
    }));
}

// ---------- Fridge Personality Score ----------
export function personalityScore(items: { name: string; freshness?: string }[]): PersonalityScore {
  const names = items.map((i) => i.name);
  const proteinCount = names.filter((n) => PROTEIN.test(n)).length;
  const produceCount = names.filter((n) => PRODUCE.test(n)).length;
  const total = Math.max(1, items.length);

  const protein = Math.min(100, Math.round((proteinCount / total) * 250));
  const produce = Math.min(100, Math.round((produceCount / total) * 250));

  const leftoverList = getLeftovers();
  const rescueNeeded = leftoverList.filter((l) => {
    const t = leftoverStatus(l).tone;
    return t === "use" || t === "freeze" || t === "toss";
  }).length;
  const leftovers = leftoverList.length === 0
    ? 80
    : Math.max(0, 100 - rescueNeeded * 25);

  const variety = Math.min(100, Math.round((new Set(names.map((n) => n.toLowerCase())).size / 12) * 100));

  const overall = Math.round((protein + produce + leftovers + variety) / 4);

  const notes: string[] = [];
  if (protein >= 60) notes.push("Your fridge is strong on protein.");
  else if (protein < 25) notes.push("Light on protein — consider eggs or beans.");
  if (produce < 25) notes.push("Your veggies need attention.");
  else if (produce >= 60) notes.push("Beautiful produce game.");
  if (rescueNeeded > 0) notes.push(`Your leftovers need rescue (${rescueNeeded} aging).`);
  if (variety >= 70) notes.push("Your fridge is a meal machine.");

  const tagline =
    overall >= 80 ? "Meal machine 🔥"
    : overall >= 60 ? "Solid kitchen 👍"
    : overall >= 40 ? "Has potential ✨"
    : "Restock recommended 🛒";

  return { protein, produce, leftovers, variety, overall, tagline, notes };
}

// ---------- Helpers ----------
export function topPatterns(): { wastedMost?: string; usedMost?: string } {
  const { mostUsed, mostWasted } = getIngredientStats();
  return {
    wastedMost: mostWasted[0]?.name,
    usedMost: mostUsed[0]?.name,
  };
}
