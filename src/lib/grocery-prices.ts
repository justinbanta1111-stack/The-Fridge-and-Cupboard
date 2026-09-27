/**
 * Estimated grocery prices, so a shopping list can show a running total and a
 * recipe can show what it actually costs to put on the table.
 *
 * These are typical US supermarket averages, not live store prices. Every
 * number surfaced in the UI must be labelled as an estimate — we never claim
 * to know what a specific store charges today.
 */

export type PriceEntry = {
  /** Key used to match this item against the grocery price database. */
  key: string;
  match: RegExp;
  /** Price per pound, for things sold by weight. */
  perLb?: number;
  /** Price for one of the thing (one onion, one lemon, one can). */
  perEach?: number;
  /** Price for one cup, for things measured by volume. */
  perCup?: number;
  /** Price for one tablespoon, for fats, sauces and sweeteners. */
  perTbsp?: number;
};

/** Free — assumed already in every kitchen. */
const FREE = /\b(water|salt|pepper|ice)\b/i;

const PRICES: PriceEntry[] = [
  // Meat & seafood
  { key: "chicken-breast", match: /chicken breast/i, perLb: 4.29, perEach: 3.2 },
  { key: "chicken-thigh", match: /chicken thigh|chicken leg|drumstick/i, perLb: 2.79, perEach: 1.6 },
  { key: "whole-chicken", match: /whole chicken|roast chicken/i, perLb: 1.99, perEach: 7.5 },
  { key: "chicken", match: /chicken/i, perLb: 3.49, perEach: 2.8 },
  { key: "ground-beef", match: /ground beef|ground turkey|ground chuck|mince/i, perLb: 5.49 },
  { key: "steak", match: /steak|sirloin|ribeye|flank/i, perLb: 10.99 },
  { key: "beef", match: /\bbeef\b|stew meat|brisket/i, perLb: 6.99 },
  { key: "bacon", match: /bacon/i, perLb: 6.49, perEach: 0.55 },
  { key: "sausage", match: /sausage|chorizo|kielbasa/i, perLb: 5.29, perEach: 1.2 },
  { key: "pork", match: /pork|ham\b/i, perLb: 3.99 },
  { key: "shrimp", match: /shrimp|prawn/i, perLb: 9.99 },
  { key: "salmon", match: /salmon/i, perLb: 11.99 },
  { key: "tuna-canned", match: /canned tuna|tuna/i, perEach: 1.29, perLb: 6.99 },
  { key: "fish", match: /\bfish\b|cod|tilapia|halibut/i, perLb: 8.99 },

  // Dairy & eggs
  { key: "eggs", match: /\beggs?\b/i, perEach: 0.29, perLb: 2.6 },
  { key: "heavy-cream", match: /heavy cream|whipping cream/i, perCup: 1.85, perTbsp: 0.12 },
  { key: "sour-cream", match: /sour cream|creme fraiche/i, perCup: 1.25 },
  { key: "cream-cheese", match: /cream cheese/i, perCup: 2.6, perTbsp: 0.18, perEach: 2.79 },
  { key: "yogurt", match: /yogurt/i, perCup: 1.19, perEach: 1.19 },
  { key: "parmesan", match: /parmesan|pecorino/i, perCup: 2.4, perLb: 9.99, perTbsp: 0.16 },
  { key: "cheese", match: /cheese|cheddar|mozzarella|feta|monterey/i, perCup: 1.45, perLb: 5.49 },
  { key: "milk", match: /\bmilk\b|buttermilk/i, perCup: 0.28 },
  { key: "butter", match: /butter/i, perTbsp: 0.31, perCup: 4.9, perLb: 4.99 },

  // Bakery & grains
  { key: "tortilla", match: /tortilla|pita|naan/i, perEach: 0.35 },
  { key: "bread", match: /\bbread\b|baguette|roll|bun/i, perEach: 0.28, perLb: 3.29 },
  { key: "pasta", match: /pasta|spaghetti|penne|noodle|macaroni|ziti|linguine|lasagn/i, perLb: 1.79, perCup: 0.45 },
  { key: "rice", match: /\brice\b|arborio|basmati|jasmine/i, perLb: 1.29, perCup: 0.35 },
  { key: "oats", match: /\boats?\b|oatmeal|quinoa|couscous|barley/i, perLb: 2.29, perCup: 0.6 },
  { key: "flour", match: /flour|breadcrumb|cornmeal|panko/i, perLb: 0.79, perCup: 0.22 },

  // Pantry & cans
  { key: "broth", match: /\bbroth\b|stock\b|bouillon/i, perCup: 0.59 },
  { key: "tomato-paste", match: /tomato paste/i, perEach: 0.99, perTbsp: 0.14 },
  { key: "canned-tomato", match: /crushed tomato|diced tomato|canned tomato|tomato sauce|marinara|passata/i, perEach: 1.49, perCup: 0.85 },
  { key: "beans", match: /\bbeans?\b|chickpea|lentil|garbanzo/i, perEach: 1.09, perCup: 0.85, perLb: 1.89 },
  { key: "coconut-milk", match: /coconut milk/i, perEach: 1.99, perCup: 1.2 },
  { key: "olive-oil", match: /olive oil/i, perTbsp: 0.35, perCup: 5.4 },
  { key: "oil", match: /\boil\b|shortening/i, perTbsp: 0.1, perCup: 1.5 },
  { key: "condiment-savory", match: /soy sauce|fish sauce|worcestershire|vinegar|hot sauce|sriracha|salsa/i, perTbsp: 0.12, perCup: 1.8, perEach: 2.99 },
  { key: "honey", match: /honey|maple syrup|molasses/i, perTbsp: 0.42, perCup: 6.5 },
  { key: "peanut-butter", match: /peanut butter|tahini|nut butter/i, perTbsp: 0.28, perCup: 4.2 },
  { key: "mayo", match: /mayonnaise|mayo|mustard|ketchup|bbq sauce/i, perTbsp: 0.11, perCup: 1.6, perEach: 3.49 },
  { key: "sugar", match: /sugar|brown sugar|powdered sugar/i, perLb: 0.99, perCup: 0.5 },
  { key: "chocolate", match: /chocolate chip|chocolate|cocoa/i, perCup: 1.9, perLb: 4.49 },
  { key: "nuts", match: /\bnuts?\b|almond|walnut|pecan|cashew|pine nut/i, perLb: 7.99, perCup: 2.6 },
  { key: "vanilla", match: /vanilla|extract/i, perTbsp: 1.1, perEach: 5.99 },
  { key: "leaveners", match: /baking soda|baking powder|cornstarch|yeast|gelatin/i, perTbsp: 0.08, perEach: 1.29 },
  { key: "spices", match: /paprika|cumin|oregano|thyme|rosemary|cinnamon|chili powder|curry powder|turmeric|spice|seasoning|bay leaf|red pepper flake/i, perTbsp: 0.45, perEach: 3.29 },

  // Produce
  { key: "garlic", match: /garlic/i, perEach: 0.12, perLb: 3.99 },
  { key: "onion", match: /onion|shallot|leek/i, perEach: 0.99, perCup: 0.9, perLb: 1.29 },
  { key: "green-onion", match: /green onion|scallion|chive/i, perEach: 0.16, perLb: 2.99 },
  { key: "potato", match: /potato/i, perEach: 0.6, perLb: 0.79 },
  { key: "sweet-potato", match: /sweet potato|yam/i, perEach: 1.1, perLb: 1.49 },
  { key: "carrot", match: /carrot/i, perEach: 0.28, perLb: 1.09 },
  { key: "celery", match: /celery/i, perEach: 0.35, perLb: 1.99 },
  { key: "bell-pepper", match: /bell pepper|\bpepper[s]? \(/i, perEach: 1.29, perLb: 2.99 },
  { key: "mushroom", match: /mushroom/i, perLb: 3.49, perCup: 1.2 },
  { key: "brassica", match: /broccoli|cauliflower|cabbage|brussels/i, perEach: 2.29, perLb: 2.29, perCup: 0.9 },
  { key: "greens", match: /spinach|kale|arugula|salad green|lettuce/i, perEach: 2.29, perLb: 3.49, perCup: 0.7 },
  { key: "squash", match: /zucchini|squash|eggplant|cucumber/i, perEach: 1.15, perLb: 1.99 },
  { key: "tomato", match: /tomato/i, perEach: 0.7, perLb: 2.49, perCup: 1.4 },
  { key: "avocado", match: /avocado/i, perEach: 1.49 },
  { key: "citrus", match: /lemon|lime/i, perEach: 0.69 },
  { key: "apple", match: /apple|pear|peach|orange/i, perEach: 0.95, perLb: 1.99 },
  { key: "banana", match: /banana/i, perEach: 0.29, perLb: 0.62 },
  { key: "berries", match: /berr|strawberr|blueberr|raspberr/i, perCup: 2.2, perEach: 3.99, perLb: 4.49 },
  { key: "ginger", match: /ginger/i, perTbsp: 0.3, perLb: 3.49 },
  { key: "fresh-herbs", match: /cilantro|parsley|basil|herb|dill|mint/i, perEach: 1.99, perTbsp: 0.2, perCup: 1.2 },
  { key: "corn", match: /corn\b/i, perEach: 0.69, perCup: 0.8 },
  { key: "peas", match: /\bpeas\b|green bean/i, perCup: 0.85, perLb: 1.99, perEach: 1.49 },
  { key: "frozen", match: /frozen/i, perEach: 2.99, perCup: 0.9, perLb: 2.49 },
];

/** A sensible price when nothing matches, so totals never silently skip lines. */
const DEFAULT_EACH = 2.49;

const FRACTIONS: Record<string, number> = {
  "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125,
};

type ParsedAmount = { qty: number; unit: "lb" | "oz" | "cup" | "tbsp" | "tsp" | "each" };

/** Pull "2 1/2 cups", "1½ lb", "3 cloves", "1 (14 oz) can" out of an ingredient line. */
export function parseAmount(line: string): ParsedAmount {
  const s = line.toLowerCase().replace(/\([^)]*\)/g, " ");

  let qty = 0;
  const m = s.match(/^\s*(\d+)?\s*(\d\/\d)?\s*([½¼¾⅓⅔⅛])?/);
  if (m) {
    if (m[1]) qty += parseInt(m[1], 10);
    if (m[2]) {
      const [a, b] = m[2].split("/").map(Number);
      if (b) qty += a / b;
    }
    if (m[3]) qty += FRACTIONS[m[3]] ?? 0;
  }
  if (!qty) qty = 1;

  if (/\b(lb|lbs|pound|pounds)\b/.test(s)) return { qty, unit: "lb" };
  if (/\b(oz|ounce|ounces)\b/.test(s)) return { qty, unit: "oz" };
  if (/\b(cup|cups)\b/.test(s)) return { qty, unit: "cup" };
  if (/\b(tbsp|tablespoon|tablespoons)\b/.test(s)) return { qty, unit: "tbsp" };
  if (/\b(tsp|teaspoon|teaspoons)\b/.test(s)) return { qty, unit: "tsp" };
  if (/\b(g|grams?)\b/.test(s)) return { qty: qty / 454, unit: "lb" };
  if (/\b(kg|kilograms?)\b/.test(s)) return { qty: qty * 2.2, unit: "lb" };
  if (/\b(ml|milliliters?)\b/.test(s)) return { qty: qty / 240, unit: "cup" };
  return { qty, unit: "each" };
}

/**
 * Live prices loaded from the grocery price database (national averages), plus
 * anything the cook has corrected for their own store. Until they load, the
 * built-in averages below are used so nothing ever shows a blank price.
 */
export type LivePriceRow = {
  item_key: string;
  label?: string | null;
  per_lb?: number | string | null;
  per_each?: number | string | null;
  per_cup?: number | string | null;
  per_tbsp?: number | string | null;
  source?: string | null;
  checked_on?: string | null;
};

type Overrides = Pick<PriceEntry, "perLb" | "perEach" | "perCup" | "perTbsp">;

const LIVE = new Map<string, Overrides>();
const MINE = new Map<string, Overrides>();
let liveSource: string | null = null;
let liveCheckedOn: string | null = null;

function num(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toOverrides(row: LivePriceRow): Overrides {
  return {
    perLb: num(row.per_lb),
    perEach: num(row.per_each),
    perCup: num(row.per_cup),
    perTbsp: num(row.per_tbsp),
  };
}

/** Load the national grocery price database into the estimator. */
export function applyGroceryPrices(rows: LivePriceRow[]): void {
  LIVE.clear();
  for (const row of rows) {
    if (!row.item_key) continue;
    LIVE.set(row.item_key, toOverrides(row));
    if (row.source) liveSource = row.source;
    if (row.checked_on && (!liveCheckedOn || row.checked_on > liveCheckedOn)) liveCheckedOn = row.checked_on;
  }
}

/** Load the cook's own store prices, which beat the national averages. */
export function applyMyStorePrices(rows: LivePriceRow[]): void {
  MINE.clear();
  for (const row of rows) {
    if (!row.item_key) continue;
    MINE.set(row.item_key, toOverrides(row));
  }
}

/** True once real database prices are in use rather than the built-in averages. */
export function pricesAreLive(): boolean {
  return LIVE.size > 0;
}

/** Plain-English note about where the prices came from. */
export function priceSourceNote(): string {
  if (!pricesAreLive()) return "Typical supermarket prices";
  const when = liveCheckedOn ? ` · checked ${liveCheckedOn}` : "";
  const mine = MINE.size > 0 ? " · your store prices applied" : "";
  return `${liveSource ?? "National average prices"}${when}${mine}`;
}

/** How many items the price database currently covers. */
export function livePriceCount(): number {
  return LIVE.size;
}

function merge(base: PriceEntry): PriceEntry {
  const live = LIVE.get(base.key);
  const mine = MINE.get(base.key);
  if (!live && !mine) return base;
  const pickAll = (field: keyof Overrides) => mine?.[field] ?? live?.[field] ?? base[field];
  return {
    ...base,
    perLb: pickAll("perLb"),
    perEach: pickAll("perEach"),
    perCup: pickAll("perCup"),
    perTbsp: pickAll("perTbsp"),
  };
}

function entryFor(line: string): PriceEntry | undefined {
  const hit = PRICES.find((p) => p.match.test(line));
  return hit ? merge(hit) : undefined;
}

/** The item key an ingredient line prices against, for store-price editing. */
export function priceKeyFor(line: string): string | null {
  return PRICES.find((p) => p.match.test(line))?.key ?? null;
}

/** Every priceable item, for the "what does this cost at my store" editor. */
export function priceableItems(): { key: string; entry: PriceEntry }[] {
  return PRICES.map((p) => ({ key: p.key, entry: merge(p) }));
}

export type PriceEstimate = {
  /** Estimated dollars for this line. */
  dollars: number;
  /** False when we had to fall back to a generic guess. */
  known: boolean;
};

/** Estimate what one shopping-list line or recipe ingredient line costs. */
export function estimatePrice(line: string): PriceEstimate {
  const text = line.trim();
  if (!text) return { dollars: 0, known: true };
  if (FREE.test(text) && !/pepper[s]? \(|bell pepper/i.test(text)) return { dollars: 0, known: true };

  const { qty, unit } = parseAmount(text);
  const e = entryFor(text);
  if (!e) return { dollars: Math.min(qty, 4) * DEFAULT_EACH, known: false };

  const pick = (v: number | undefined, fallback: number) => (typeof v === "number" ? v : fallback);

  switch (unit) {
    case "lb":
      return { dollars: qty * pick(e.perLb, pick(e.perCup, pick(e.perEach, DEFAULT_EACH)) * 2), known: true };
    case "oz":
      return { dollars: (qty / 16) * pick(e.perLb, pick(e.perEach, DEFAULT_EACH) * 2), known: true };
    case "cup":
      return { dollars: qty * pick(e.perCup, pick(e.perLb, DEFAULT_EACH * 2) / 2), known: true };
    case "tbsp":
      return { dollars: qty * pick(e.perTbsp, pick(e.perCup, pick(e.perLb, 3) / 2) / 16), known: true };
    case "tsp":
      return { dollars: (qty / 3) * pick(e.perTbsp, pick(e.perCup, pick(e.perLb, 3) / 2) / 16), known: true };
    default:
      return { dollars: qty * pick(e.perEach, pick(e.perLb, pick(e.perCup, DEFAULT_EACH))), known: true };
  }
}

export function formatMoney(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

export type ListTotal = { total: number; anyGuessed: boolean };

/** Total a set of lines, e.g. a shopping list or a recipe's ingredients. */
export function estimateTotal(lines: string[]): ListTotal {
  let total = 0;
  let anyGuessed = false;
  for (const line of lines) {
    const { dollars, known } = estimatePrice(line);
    total += dollars;
    if (!known) anyGuessed = true;
  }
  return { total: Math.round(total * 100) / 100, anyGuessed };
}
