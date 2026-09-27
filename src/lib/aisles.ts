/**
 * Grocery aisle classification for shopping list items, so a trip can be
 * walked section by section instead of zig-zagging across the store.
 */

export type Aisle =
  | "produce"
  | "meat"
  | "dairy"
  | "bakery"
  | "frozen"
  | "pantry"
  | "other";

export const AISLE_ORDER: Aisle[] = [
  "produce",
  "bakery",
  "meat",
  "dairy",
  "frozen",
  "pantry",
  "other",
];

export const AISLE_LABEL: Record<Aisle, string> = {
  produce: "Produce",
  bakery: "Bakery",
  meat: "Meat & Seafood",
  dairy: "Dairy & Eggs",
  frozen: "Frozen",
  pantry: "Pantry",
  other: "Other",
};

export const AISLE_EMOJI: Record<Aisle, string> = {
  produce: "🥬",
  bakery: "🥖",
  meat: "🥩",
  dairy: "🥛",
  frozen: "🧊",
  pantry: "🥫",
  other: "🛒",
};

/** Keyword lists — first match wins, checked in AISLE_ORDER-independent order below. */
const KEYWORDS: Array<[Aisle, string[]]> = [
  [
    "frozen",
    ["frozen", "ice cream", "popsicle", "frozen peas", "puff pastry", "ice cubes"],
  ],
  [
    "produce",
    [
      "apple", "avocado", "banana", "basil", "bean sprout", "bell pepper", "berry",
      "blueberr", "broccoli", "cabbage", "carrot", "cauliflower", "celery", "cilantro",
      "corn", "cucumber", "eggplant", "garlic", "ginger", "grape", "green onion",
      "herb", "kale", "leek", "lemon", "lettuce", "lime", "mango", "melon", "mushroom",
      "onion", "orange", "parsley", "peach", "pear", "pepper", "pineapple", "potato",
      "radish", "raspberr", "romaine", "salad", "scallion", "shallot", "spinach",
      "squash", "strawberr", "sweet potato", "tomato", "zucchini", "fruit", "veggie",
      "vegetable", "cabbage", "arugula", "beet", "asparagus", "brussels",
    ],
  ],
  [
    "meat",
    [
      "bacon", "beef", "brisket", "chicken", "chorizo", "clam", "cod", "crab", "duck",
      "fish", "ground turkey", "ham", "lamb", "lobster", "meat", "mussel", "pork",
      "prawn", "salami", "salmon", "sausage", "scallop", "shrimp", "steak", "tilapia",
      "tuna", "turkey", "veal",
    ],
  ],
  [
    "dairy",
    [
      "butter", "buttermilk", "cheddar", "cheese", "cottage cheese", "cream",
      "cream cheese", "egg", "feta", "ghee", "greek yogurt", "half and half",
      "milk", "mozzarella", "parmesan", "ricotta", "sour cream", "yogurt", "yoghurt",
    ],
  ],
  [
    "bakery",
    ["bagel", "baguette", "bread", "bun", "croissant", "muffin", "pita", "roll", "tortilla", "naan"],
  ],
  [
    "pantry",
    [
      "baking powder", "baking soda", "bean", "broth", "cereal", "chickpea", "chili powder",
      "cinnamon", "cocoa", "coconut milk", "coffee", "cornstarch", "cumin", "flour",
      "honey", "hot sauce", "jam", "ketchup", "lentil", "maple syrup", "mayo",
      "mayonnaise", "mustard", "noodle", "nut", "oat", "oil", "olive", "pasta",
      "peanut butter", "quinoa", "rice", "salt", "sauce", "soy sauce", "spice",
      "stock", "sugar", "syrup", "tea", "tomato paste", "tomato sauce", "tuna can",
      "vanilla", "vinegar", "yeast", "canned", "can of", "paprika", "oregano",
    ],
  ],
];

/** Best-guess aisle for a free-text item name. */
export function aisleFor(name: string): Aisle {
  const n = name.toLowerCase().trim();
  if (!n) return "other";
  for (const [aisle, words] of KEYWORDS) {
    if (words.some((w) => n.includes(w))) return aisle;
  }
  return "other";
}

/** Group any list of named items into aisles, in shopping-route order. */
export function groupByAisle<T extends { name: string }>(
  items: T[],
): Array<{ aisle: Aisle; label: string; emoji: string; items: T[] }> {
  const buckets = new Map<Aisle, T[]>();
  for (const item of items) {
    const aisle = aisleFor(item.name);
    const list = buckets.get(aisle);
    if (list) list.push(item);
    else buckets.set(aisle, [item]);
  }
  return AISLE_ORDER.filter((a) => (buckets.get(a)?.length ?? 0) > 0).map((a) => ({
    aisle: a,
    label: AISLE_LABEL[a],
    emoji: AISLE_EMOJI[a],
    items: buckets.get(a)!,
  }));
}
