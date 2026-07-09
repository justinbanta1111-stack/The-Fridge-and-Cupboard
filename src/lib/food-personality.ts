// My Food Personality — lightweight, client-side learning profile.
// Stored in localStorage so it works without auth and never blocks UI.

export type FoodTagId =
  | "quick-easy"
  | "healthy"
  | "comfort"
  | "family"
  | "budget"
  | "high-protein"
  | "vegan"
  | "lent"
  | "seniors"
  | "kids";

export const FOOD_TAGS: { id: FoodTagId; label: string; emoji: string; hint: string }[] = [
  { id: "quick-easy",   label: "Quick & Easy",     emoji: "⚡", hint: "Under 20 minutes" },
  { id: "healthy",      label: "Healthy",          emoji: "🥗", hint: "Lighter, fresh meals" },
  { id: "comfort",      label: "Comfort Food",     emoji: "🍲", hint: "Warm + cozy classics" },
  { id: "family",       label: "Family Meals",     emoji: "👨‍👩‍👧", hint: "Feeds the whole table" },
  { id: "budget",       label: "Budget Meals",     emoji: "💰", hint: "Stretch every dollar" },
  { id: "high-protein", label: "High Protein",     emoji: "💪", hint: "Power-packed plates" },
  { id: "vegan",        label: "Vegan",            emoji: "🌱", hint: "Plant-based only" },
  { id: "lent",         label: "Lent Friendly",    emoji: "🙏", hint: "Meatless options" },
  { id: "seniors",      label: "Easy for Seniors", emoji: "🧓", hint: "Soft, simple, nourishing" },
  { id: "kids",         label: "Kid Friendly",     emoji: "🧒", hint: "Picky-eater approved" },
];

export type FoodPersonality = {
  tags: FoodTagId[];                       // explicit picks (manual)
  tagScores: Partial<Record<FoodTagId, number>>; // learned scores
  cuisines: Record<string, number>;        // e.g. "Mexican": 4
  loves: Record<string, number>;           // favorite foods/ingredients
  avoids: string[];                        // foods they avoid
  cookingSpeed: "fast" | "medium" | "slow" | null;
  familySize: number | null;
  budget: "low" | "medium" | "high" | null;
  healthGoal: "weight-loss" | "muscle" | "heart" | "diabetes" | "general" | null;
  sessions: number;
  lastSeen: number;
};

const STORAGE_KEY = "tfc.foodPersonality.v1";

const EMPTY: FoodPersonality = {
  tags: [],
  tagScores: {},
  cuisines: {},
  loves: {},
  avoids: [],
  cookingSpeed: null,
  familySize: null,
  budget: null,
  healthGoal: null,
  sessions: 0,
  lastSeen: 0,
};

export function loadPersonality(): FoodPersonality {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

export function savePersonality(p: FoodPersonality) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("food-personality:change"));
  } catch {
    /* ignore */
  }
}

export function updatePersonality(mutator: (p: FoodPersonality) => void) {
  const p = loadPersonality();
  mutator(p);
  p.lastSeen = Date.now();
  savePersonality(p);
}

export function toggleTag(id: FoodTagId) {
  updatePersonality((p) => {
    if (p.tags.includes(id)) {
      p.tags = p.tags.filter((t) => t !== id);
    } else {
      p.tags = [...p.tags, id];
      p.tagScores[id] = (p.tagScores[id] ?? 0) + 2;
    }
  });
}

export function recordScan(itemNames: string[] = []) {
  updatePersonality((p) => {
    p.sessions += 1;
    for (const name of itemNames) {
      const k = name.trim().toLowerCase();
      if (!k) continue;
      p.loves[k] = (p.loves[k] ?? 0) + 1;
    }
  });
}

export function recordCuisine(cuisine: string) {
  if (!cuisine) return;
  updatePersonality((p) => {
    p.cuisines[cuisine] = (p.cuisines[cuisine] ?? 0) + 1;
  });
}

export function recordAction(action: string) {
  // map common actions to learned tag boosts
  const map: Record<string, FoodTagId | undefined> = {
    leftovers: "budget",
    "use-leftovers": "budget",
    "quick": "quick-easy",
    "fast": "quick-easy",
    "easy-mom": "family",
    "easy-for-mom": "family",
    "family": "family",
    "kids": "kids",
    "healthy": "healthy",
  };
  const tag = map[action.toLowerCase()];
  if (!tag) return;
  updatePersonality((p) => {
    p.tagScores[tag] = (p.tagScores[tag] ?? 0) + 1;
  });
}

export function topTags(p: FoodPersonality, n = 3): FoodTagId[] {
  const scored = new Map<FoodTagId, number>();
  for (const t of p.tags) scored.set(t, (scored.get(t) ?? 0) + 5);
  for (const [k, v] of Object.entries(p.tagScores)) {
    scored.set(k as FoodTagId, (scored.get(k as FoodTagId) ?? 0) + (v ?? 0));
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function topCuisines(p: FoodPersonality, n = 2): string[] {
  return Object.entries(p.cuisines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function topLoves(p: FoodPersonality, n = 3): string[] {
  return Object.entries(p.loves)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export function tagLabel(id: FoodTagId): string {
  return FOOD_TAGS.find((t) => t.id === id)?.label ?? id;
}

export function personalitySummary(p: FoodPersonality): string | null {
  const tags = topTags(p, 3).map(tagLabel);
  const cuisines = topCuisines(p, 2);
  const loves = topLoves(p, 2);
  const bits: string[] = [];
  if (cuisines.length) bits.push(cuisines.join(" & "));
  if (tags.length) bits.push(tags.join(", ").toLowerCase());
  if (loves.length) bits.push(`favorites like ${loves.join(", ")}`);
  if (bits.length === 0) return null;
  return `You usually like ${bits.join(", ")}.`;
}

export function smartSuggestionLine(p: FoodPersonality): string {
  const tags = topTags(p, 2).map(tagLabel);
  if (tags.length === 0) {
    return "Tap a few tastes below — Chef Super J will start tuning tonight's picks to you.";
  }
  return `Based on your food style — ${tags.join(" + ").toLowerCase()} — here's what fits best tonight.`;
}
