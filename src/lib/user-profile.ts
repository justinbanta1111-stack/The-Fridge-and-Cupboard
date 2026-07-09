// Smart Onboarding + Personalization (Batch F)
// Local-only profile stored in localStorage. No backend required.

export type PrimaryGoal =
  | "save-money"
  | "use-leftovers"
  | "feed-family"
  | "quick-meals"
  | "eat-healthier"
  | "cancer-recovery"
  | "elderly-meals"
  | "kid-meals"
  | "meal-prep"
  | "fasting-lent";

export type HouseholdSize = 1 | 2 | 4 | 6 | 8;

export type CookingStyle =
  | "fast-simple"
  | "budget"
  | "healthy"
  | "comfort"
  | "family"
  | "bulk"
  | "fancy";

export type FoodPreference =
  | "no-dairy"
  | "vegetarian"
  | "vegan"
  | "low-carb"
  | "high-protein"
  | "lent-fasting"
  | "gluten-free";

export type UserProfile = {
  completed: boolean;
  goal?: PrimaryGoal;
  household?: HouseholdSize;
  style?: CookingStyle;
  prefs: FoodPreference[];
  updatedAt: number;
};

const KEY = "fnc.user-profile.v1";

export const GOALS: { id: PrimaryGoal; label: string; emoji: string }[] = [
  { id: "save-money", label: "Save money", emoji: "💸" },
  { id: "use-leftovers", label: "Use leftovers", emoji: "🥡" },
  { id: "feed-family", label: "Feed my family", emoji: "👨‍👩‍👧" },
  { id: "quick-meals", label: "Quick meals", emoji: "⚡" },
  { id: "eat-healthier", label: "Eat healthier", emoji: "🥗" },
  { id: "cancer-recovery", label: "Cancer / recovery support", emoji: "💛" },
  { id: "elderly-meals", label: "Elderly meals", emoji: "🌿" },
  { id: "kid-meals", label: "Kid meals", emoji: "🧒" },
  { id: "meal-prep", label: "Meal prep", emoji: "📦" },
  { id: "fasting-lent", label: "Fasting / Lent meals", emoji: "🕊️" },
];

export const HOUSEHOLDS: { id: HouseholdSize; label: string }[] = [
  { id: 1, label: "1" },
  { id: 2, label: "2" },
  { id: 4, label: "4" },
  { id: 6, label: "6" },
  { id: 8, label: "8+" },
];

export const STYLES: { id: CookingStyle; label: string; emoji: string }[] = [
  { id: "fast-simple", label: "Fast and simple", emoji: "⚡" },
  { id: "budget", label: "Budget-focused", emoji: "💵" },
  { id: "healthy", label: "Healthy", emoji: "🥗" },
  { id: "comfort", label: "Comfort food", emoji: "🍲" },
  { id: "family", label: "Family cooking", emoji: "👨‍👩‍👧" },
  { id: "bulk", label: "Bulk cooking", emoji: "📦" },
  { id: "fancy", label: "Fancy meals", emoji: "🍷" },
];

export const PREFS: { id: FoodPreference; label: string }[] = [
  { id: "no-dairy", label: "No dairy" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "low-carb", label: "Low carb" },
  { id: "high-protein", label: "High protein" },
  { id: "lent-fasting", label: "Lent / fasting" },
  { id: "gluten-free", label: "Gluten free" },
];

const EMPTY: UserProfile = { completed: false, prefs: [], updatedAt: 0 };

export function getProfile(): UserProfile {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

export function saveProfile(p: Partial<UserProfile>) {
  if (typeof window === "undefined") return;
  const next: UserProfile = { ...getProfile(), ...p, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(next));
  try { window.dispatchEvent(new CustomEvent("fnc:profile-updated")); } catch {}
  return next;
}

export function resetProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  try { window.dispatchEvent(new CustomEvent("fnc:profile-updated")); } catch {}
}

// Map a goal to a "feature to surface first" hint that homepage strips can use.
export function priorityFeatureForGoal(goal?: PrimaryGoal):
  | "kid-saver" | "health" | "savings" | "leftovers" | "quick" | "prep" | "family" | "fasting" | "elderly" | "default" {
  switch (goal) {
    case "kid-meals": return "kid-saver";
    case "cancer-recovery": return "health";
    case "eat-healthier": return "health";
    case "elderly-meals": return "elderly";
    case "save-money": return "savings";
    case "use-leftovers": return "leftovers";
    case "quick-meals": return "quick";
    case "meal-prep": return "prep";
    case "feed-family": return "family";
    case "fasting-lent": return "fasting";
    default: return "default";
  }
}
