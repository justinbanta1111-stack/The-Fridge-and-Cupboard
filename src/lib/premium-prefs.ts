// Local-only premium personalization preferences.
export type PremiumPrefs = {
  diets: string[];          // diet/restriction tags
  allergies: string[];      // allergens to avoid
  cuisines: string[];       // cuisines liked
  goals: string[];          // save-money, quick, kid-friendly, high-protein, etc.
  household: number;        // people to feed
  budgetPerMeal?: number;   // USD per meal, optional
  notes?: string;           // freeform
  updatedAt: number;
};

const KEY = "fnc.premium-prefs.v1";

const EMPTY: PremiumPrefs = {
  diets: [], allergies: [], cuisines: [], goals: [], household: 2, updatedAt: 0,
};

export const DIET_CHOICES = [
  "Vegan", "Vegetarian", "Pescatarian", "Gluten-free", "Dairy-free",
  "Low-carb", "Keto", "Low-sugar", "Diabetic-friendly", "Heart-healthy",
  "Halal", "Kosher", "Lenten / Orthodox fasting",
];

export const ALLERGY_CHOICES = [
  "Peanuts", "Tree nuts", "Shellfish", "Fish", "Eggs",
  "Soy", "Wheat", "Sesame", "Dairy",
];

export const CUISINE_CHOICES = [
  "Italian", "Mexican", "American comfort", "Mediterranean", "Greek",
  "Middle Eastern", "Indian", "Thai", "Chinese", "Japanese",
  "Korean", "French", "Cajun / Creole", "Soul food", "BBQ",
  "Caribbean", "Latin American",
];

export const GOAL_CHOICES = [
  "Save money", "Quick meals (≤30 min)", "Kid-friendly", "High-protein",
  "Meal prep / batch cook", "Use leftovers", "Healthy / lower-calorie",
  "Comfort food", "Date night",
];

export function getPremiumPrefs(): PremiumPrefs {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch { return EMPTY; }
}

export function savePremiumPrefs(p: Partial<PremiumPrefs>): PremiumPrefs {
  const next: PremiumPrefs = { ...getPremiumPrefs(), ...p, updatedAt: Date.now() };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function hasPremiumPrefs(p: PremiumPrefs): boolean {
  return p.diets.length + p.allergies.length + p.cuisines.length + p.goals.length > 0;
}
