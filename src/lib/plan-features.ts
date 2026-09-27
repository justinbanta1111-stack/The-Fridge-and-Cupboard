import type { SubscriptionTier } from "@/hooks/use-subscription";

export type PlanKey = "free" | "standard" | "premium";

export type PlanFeature = {
  /** Stable id, usable as a gate key. */
  id: string;
  label: string;
  /** Minimum plan required to use the feature. */
  requires: PlanKey;
  /** Free-plan features that exist but are capped. */
  note?: string;
};

export const PLAN_PRICES: Record<PlanKey, string> = {
  free: "$0",
  standard: "$3.99/month",
  premium: "$5.99/month",
};

export const UPGRADE_MESSAGE = "Upgrade to Premium ($5.99/month) to unlock this feature.";

/** Ordered feature matrix powering the comparison table and feature gates. */
export const PLAN_FEATURES: PlanFeature[] = [
  { id: "browse_recipes", label: "Browse recipes", requires: "free" },
  { id: "basic_ai", label: "Basic AI help", requires: "free" },
  { id: "fridge_scans", label: "Unlimited fridge scans", requires: "standard", note: "Limited on Free" },
  { id: "cupboard_scans", label: "Unlimited cupboard scans", requires: "standard", note: "Limited on Free" },
  { id: "save_favorites", label: "Save favorite recipes", requires: "standard" },
  { id: "meal_planner", label: "Meal planner", requires: "standard" },
  { id: "grocery_lists", label: "Grocery lists", requires: "standard" },
  { id: "leftover_tracking", label: "Leftover tracking", requires: "standard" },
  { id: "advanced_meal_planning", label: "Advanced AI meal planning", requires: "premium" },
  { id: "nutrition_analysis", label: "Nutrition analysis", requires: "premium" },
  { id: "pantry_history", label: "Pantry history", requires: "premium" },
  { id: "smart_shopping", label: "Smart shopping suggestions", requires: "premium" },
  { id: "store_help", label: "Help Me Choose at the store", requires: "premium", note: "1 free scan on Standard" },

  { id: "priority_access", label: "Priority access to new features", requires: "premium" },
  { id: "future_ai_tools", label: "Future premium AI tools", requires: "premium" },
];

export const PREMIUM_FEATURE_IDS = PLAN_FEATURES.filter((f) => f.requires === "premium").map((f) => f.id);

const RANK: Record<PlanKey, number> = { free: 0, standard: 1, premium: 2 };

export function planIncludes(plan: PlanKey, feature: PlanFeature): boolean {
  return RANK[plan] >= RANK[feature.requires];
}

/** Does the current Stripe-derived tier grant this feature id? */
export function tierHasFeature(tier: SubscriptionTier, featureId: string): boolean {
  const feature = PLAN_FEATURES.find((f) => f.id === featureId);
  if (!feature) return true;
  return planIncludes(tier as PlanKey, feature);
}
