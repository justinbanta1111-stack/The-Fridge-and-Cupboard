// GERD-Friendly filter helpers.
// Shared by the educational card, the Learn More page, and server AI prompts.

export const GERD_LABEL = "GERD-Friendly";

export const GERD_DISCLAIMER =
  "This information is for educational purposes only and is not medical advice. If you have persistent or severe symptoms, consult a qualified healthcare professional.";

export const GERD_INTRO =
  "GERD (Gastroesophageal Reflux Disease) is a condition where stomach acid flows back into the esophagus, causing symptoms such as heartburn, chest discomfort, sour taste, chronic cough, or throat irritation. Choosing foods that are less likely to trigger acid reflux may help reduce symptoms. Individual triggers vary, so pay attention to what affects you personally.";

export const GERD_TRIGGERS = [
  "Citrus fruits and juices",
  "Tomatoes and tomato-based foods",
  "Spicy foods",
  "Fried and greasy foods",
  "High-fat meals",
  "Chocolate",
  "Peppermint",
  "Coffee and other caffeinated drinks",
  "Alcohol",
  "Carbonated beverages",
  "Large amounts of raw onions or garlic",
];

export const GERD_BETTER_TOLERATED = [
  "Lean chicken, turkey, and fish",
  "Oatmeal, rice, quinoa, and other whole grains",
  "Bananas, melons, pears, and apples",
  "Potatoes and sweet potatoes",
  "Green vegetables such as broccoli, green beans, spinach, zucchini, cucumbers, and carrots",
  "Eggs prepared with minimal added fat",
  "Low-fat dairy or appropriate dairy alternatives",
];

export const GERD_MEAL_TIPS = [
  "Eat smaller, more frequent meals instead of a few large ones.",
  "Bake, roast, steam, poach, or air-fry instead of deep-frying.",
  "Season with herbs (basil, parsley, thyme, dill, oregano) instead of chili, black pepper, or hot sauce.",
  "Swap tomato sauce for pesto, olive-oil-and-herb sauces, or a light broth or cream sauce.",
  "Use mild aromatics — cooked leek, fennel, or a small amount of cooked onion instead of raw onion or garlic.",
  "Choose lean proteins and trim visible fat; drain and blot fatty meats.",
  "Add oatmeal, rice, or potatoes to a meal — starches can help absorb stomach acid.",
];

export const GERD_LIFESTYLE_TIPS = [
  "Finish eating at least 2–3 hours before lying down or going to bed.",
  "Raise the head of your bed 6–8 inches, or sleep on a wedge pillow.",
  "Avoid tight belts and waistbands that press on the stomach.",
  "Stay upright and take a gentle walk after eating instead of reclining.",
  "Maintaining a healthy weight can reduce pressure on the stomach.",
  "Smoking and alcohol both relax the valve at the top of the stomach — reducing them often helps.",
  "Keep a simple food-and-symptom journal to learn your personal triggers.",
];

const AVOID_PATTERNS: RegExp[] = [
  /citrus|lemon|lime(s)?\b|orange|grapefruit|tangerine|mandarin|clementine|pomelo/i,
  /tomato|marinara|ketchup|salsa|pizza\s*sauce|pasta\s*sauce/i,
  /chili|chilli|jalapeno|habanero|cayenne|sriracha|hot\s*sauce|spicy|curry\s*paste|red\s*pepper\s*flakes/i,
  /fried|deep\s*fry|french\s*fries|donut|doughnut/i,
  /chocolate|cocoa|cacao/i,
  /peppermint|spearmint|\bmint\b/i,
  /coffee|espresso|latte|cappuccino|energy\s*drink|caffeine/i,
  /beer|wine|vodka|whiskey|whisky|rum|tequila|liquor|alcohol/i,
  /soda|cola|sparkling|seltzer|carbonated|club\s*soda/i,
  /bacon|sausage|salami|pepperoni|lard|heavy\s*cream|butter\s*sauce/i,
  /raw\s*onion|raw\s*garlic/i,
  /vinegar|pickled|pickle/i,
];

const MAYBE_PATTERNS: RegExp[] = [
  /onion|garlic|shallot/i,
  /cheese|whole\s*milk|ice\s*cream|sour\s*cream/i,
  /dressing|marinade|bbq\s*sauce|barbecue\s*sauce|gravy/i,
  /ground\s*beef|steak|pork|ribs|duck/i,
  /pepper\b|seasoning|spice\s*mix|taco|kimchi/i,
  /juice|smoothie|lemonade/i,
  /pastry|cake|cookie|brownie|candy/i,
  /nuts|peanut\s*butter|avocado/i,
  /tea\b|matcha|kombucha/i,
];

export type GerdScreen = "avoid" | "maybe" | "ok";

export function screenForGerd(text: string): GerdScreen {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return "ok";
  if (AVOID_PATTERNS.some((r) => r.test(t))) return "avoid";
  if (MAYBE_PATTERNS.some((r) => r.test(t))) return "maybe";
  return "ok";
}

export function hasGerdFriendly(restrictions?: string[] | null): boolean {
  if (!restrictions) return false;
  return restrictions.some((r) => /gerd|reflux/i.test(String(r)));
}

// Extra system-prompt rules injected when the filter is on.
export function gerdPromptRule(restrictions?: string[] | null): string {
  if (!hasGerdFriendly(restrictions)) return "";
  return [
    "GERD-FRIENDLY FILTER IS ACTIVE — this is a hard restriction. Screen every ingredient and every recipe for acid-reflux triggers before showing it:",
    `- Avoid these common triggers entirely: ${GERD_TRIGGERS.join("; ")}.`,
    "- Avoid deep-frying, heavy cream/butter sauces, fatty cured meats (bacon, sausage, salami, pepperoni), chili/cayenne/hot sauce, vinegar-heavy dressings, mint, chocolate, coffee, alcohol, and carbonated drinks.",
    `- Favor better-tolerated foods: ${GERD_BETTER_TOLERATED.join("; ")}.`,
    "- Prefer baking, roasting, steaming, poaching, or air-frying. Season with mild herbs instead of hot spices. Replace tomato sauce with pesto, light broth, or olive-oil-and-herb sauces. Use cooked mild aromatics rather than raw onion or garlic.",
    "- Keep portions moderate and meals lower in fat.",
    "- If an ingredient MIGHT be a trigger but you cannot confirm it, keep it out of the required ingredients and note that the user should check how it affects them personally.",
    `- When giving GERD guidance, include this note: "${GERD_DISCLAIMER}"`,
  ].join("\n");
}
