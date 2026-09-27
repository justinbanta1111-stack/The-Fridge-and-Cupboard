/**
 * Real grocery *product* database.
 *
 * `ingredients-db.ts` knows about foods ("chicken breast", "milk").
 * This file knows about the things actually sitting on a store shelf: a brand,
 * a package form, a pack size and a count. Store Mode uses it to turn a
 * photographed label into a real product line — "Barilla Penne, 16 oz box,
 * 2 boxes → 2 lb of pasta, about $2.19 each" — instead of a bare text label.
 *
 * Pure data + pure parsing. No network, no side effects.
 */

import type { Aisle } from "@/lib/aisles";
import { resolveIngredient, ingredientById, type Ingredient } from "@/lib/ingredients-db";
import { estimatePrice, formatMoney } from "@/lib/grocery-prices";

/* ── Units ──────────────────────────────────────────────────────── */

export type WeightUnit = "oz" | "lb" | "g" | "kg";
export type VolumeUnit = "fl-oz" | "ml" | "l" | "qt" | "pt" | "gal";
export type PackUnit = WeightUnit | VolumeUnit | "ct";

/** Package form as it is sold. */
export type PackForm =
  | "bag"
  | "box"
  | "can"
  | "jar"
  | "bottle"
  | "carton"
  | "tub"
  | "tray"
  | "pack"
  | "loaf"
  | "dozen"
  | "bunch"
  | "loose";

export const PACK_FORM_LABEL: Record<PackForm, string> = {
  bag: "bag",
  box: "box",
  can: "can",
  jar: "jar",
  bottle: "bottle",
  carton: "carton",
  tub: "tub",
  tray: "tray",
  pack: "pack",
  loaf: "loaf",
  dozen: "dozen",
  bunch: "bunch",
  loose: "loose / by weight",
};

const UNIT_ALIASES: Record<string, PackUnit> = {
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  "fl oz": "fl-oz",
  floz: "fl-oz",
  "fluid ounce": "fl-oz",
  "fluid ounces": "fl-oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  "#": "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  qt: "qt",
  quart: "qt",
  quarts: "qt",
  pt: "pt",
  pint: "pt",
  pints: "pt",
  gal: "gal",
  gallon: "gal",
  gallons: "gal",
  ct: "ct",
  count: "ct",
  pk: "ct",
  pack: "ct",
  pieces: "ct",
  piece: "ct",
};

const OZ_PER: Partial<Record<PackUnit, number>> = { oz: 1, lb: 16, g: 0.035274, kg: 35.274 };
const FLOZ_PER: Partial<Record<PackUnit, number>> = {
  "fl-oz": 1,
  ml: 0.033814,
  l: 33.814,
  qt: 32,
  pt: 16,
  gal: 128,
};

/** Ounces of net weight in a pack size, when it is a weight. */
export function toOunces(size: PackSize): number | null {
  const factor = OZ_PER[size.unit];
  return factor === undefined ? null : size.value * factor;
}

/** Fluid ounces in a pack size, when it is a volume. */
export function toFluidOunces(size: PackSize): number | null {
  const factor = FLOZ_PER[size.unit];
  return factor === undefined ? null : size.value * factor;
}

/* ── Brands ─────────────────────────────────────────────────────── */

export type BrandCategory =
  | "produce"
  | "meat"
  | "dairy"
  | "bakery"
  | "frozen"
  | "pantry"
  | "snacks"
  | "beverages"
  | "store-brand";

export type Brand = {
  id: string;
  name: string;
  aliases: string[];
  categories: BrandCategory[];
  /** Typical positioning, used to explain value to the shopper. */
  tier: "value" | "mainstream" | "premium";
};

export const BRANDS: Brand[] = [
  // Store / value brands
  { id: "great-value", name: "Great Value", aliases: ["greatvalue"], categories: ["store-brand", "pantry", "dairy", "frozen"], tier: "value" },
  { id: "kirkland", name: "Kirkland Signature", aliases: ["kirkland signature", "costco"], categories: ["store-brand", "pantry", "meat", "dairy"], tier: "value" },
  { id: "365", name: "365 by Whole Foods", aliases: ["365 everyday value", "365 whole foods"], categories: ["store-brand", "pantry", "produce"], tier: "mainstream" },
  { id: "signature-select", name: "Signature Select", aliases: ["safeway select"], categories: ["store-brand", "pantry"], tier: "value" },
  { id: "good-gather", name: "Good & Gather", aliases: ["good and gather", "target"], categories: ["store-brand", "pantry", "produce"], tier: "mainstream" },
  { id: "trader-joes", name: "Trader Joe's", aliases: ["trader joes", "traders joes"], categories: ["store-brand", "pantry", "frozen"], tier: "mainstream" },
  { id: "aldi", name: "Aldi", aliases: ["simply nature", "friendly farms", "specially selected"], categories: ["store-brand", "pantry", "dairy"], tier: "value" },
  { id: "kroger", name: "Kroger", aliases: ["private selection", "simple truth"], categories: ["store-brand", "pantry", "dairy"], tier: "value" },
  { id: "publix", name: "Publix", aliases: ["greenwise"], categories: ["store-brand", "bakery", "dairy"], tier: "mainstream" },

  // Dairy & eggs
  { id: "land-o-lakes", name: "Land O'Lakes", aliases: ["land o lakes", "land olakes"], categories: ["dairy"], tier: "mainstream" },
  { id: "kerrygold", name: "Kerrygold", aliases: [], categories: ["dairy"], tier: "premium" },
  { id: "chobani", name: "Chobani", aliases: [], categories: ["dairy"], tier: "mainstream" },
  { id: "fage", name: "Fage", aliases: ["fage total"], categories: ["dairy"], tier: "premium" },
  { id: "yoplait", name: "Yoplait", aliases: [], categories: ["dairy"], tier: "mainstream" },
  { id: "philadelphia", name: "Philadelphia", aliases: ["philly cream cheese"], categories: ["dairy"], tier: "mainstream" },
  { id: "sargento", name: "Sargento", aliases: [], categories: ["dairy"], tier: "mainstream" },
  { id: "tillamook", name: "Tillamook", aliases: [], categories: ["dairy"], tier: "premium" },
  { id: "horizon", name: "Horizon Organic", aliases: ["horizon organic"], categories: ["dairy"], tier: "premium" },
  { id: "eggland", name: "Eggland's Best", aliases: ["egglands best"], categories: ["dairy"], tier: "mainstream" },
  { id: "vital-farms", name: "Vital Farms", aliases: [], categories: ["dairy"], tier: "premium" },
  { id: "daisy", name: "Daisy", aliases: [], categories: ["dairy"], tier: "mainstream" },

  // Meat
  { id: "tyson", name: "Tyson", aliases: [], categories: ["meat", "frozen"], tier: "mainstream" },
  { id: "perdue", name: "Perdue", aliases: [], categories: ["meat"], tier: "mainstream" },
  { id: "foster-farms", name: "Foster Farms", aliases: [], categories: ["meat"], tier: "mainstream" },
  { id: "jennie-o", name: "Jennie-O", aliases: ["jennie o"], categories: ["meat"], tier: "mainstream" },
  { id: "oscar-mayer", name: "Oscar Mayer", aliases: [], categories: ["meat"], tier: "mainstream" },
  { id: "hormel", name: "Hormel", aliases: [], categories: ["meat", "pantry"], tier: "mainstream" },
  { id: "johnsonville", name: "Johnsonville", aliases: [], categories: ["meat"], tier: "mainstream" },
  { id: "applegate", name: "Applegate", aliases: [], categories: ["meat"], tier: "premium" },

  // Pantry
  { id: "barilla", name: "Barilla", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "ronzoni", name: "Ronzoni", aliases: [], categories: ["pantry"], tier: "value" },
  { id: "de-cecco", name: "De Cecco", aliases: ["dececco"], categories: ["pantry"], tier: "premium" },
  { id: "rao", name: "Rao's Homemade", aliases: ["raos", "rao's"], categories: ["pantry"], tier: "premium" },
  { id: "prego", name: "Prego", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "ragu", name: "Ragú", aliases: ["ragu"], categories: ["pantry"], tier: "value" },
  { id: "hunts", name: "Hunt's", aliases: ["hunts"], categories: ["pantry"], tier: "value" },
  { id: "muir-glen", name: "Muir Glen", aliases: [], categories: ["pantry"], tier: "premium" },
  { id: "san-marzano", name: "Cento San Marzano", aliases: ["cento", "san marzano"], categories: ["pantry"], tier: "premium" },
  { id: "goya", name: "Goya", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "bushs", name: "Bush's Best", aliases: ["bushs", "bush's"], categories: ["pantry"], tier: "mainstream" },
  { id: "campbells", name: "Campbell's", aliases: ["campbells"], categories: ["pantry"], tier: "mainstream" },
  { id: "progresso", name: "Progresso", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "swanson", name: "Swanson", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "better-than-bouillon", name: "Better Than Bouillon", aliases: [], categories: ["pantry"], tier: "premium" },
  { id: "king-arthur", name: "King Arthur", aliases: ["king arthur baking"], categories: ["pantry"], tier: "premium" },
  { id: "gold-medal", name: "Gold Medal", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "domino", name: "Domino", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "mccormick", name: "McCormick", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "morton", name: "Morton", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "bertolli", name: "Bertolli", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "filippo-berio", name: "Filippo Berio", aliases: [], categories: ["pantry"], tier: "premium" },
  { id: "mahatma", name: "Mahatma", aliases: [], categories: ["pantry"], tier: "value" },
  { id: "success-rice", name: "Success", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "uncle-bens", name: "Ben's Original", aliases: ["uncle bens", "bens original"], categories: ["pantry"], tier: "mainstream" },
  { id: "quaker", name: "Quaker", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "skippy", name: "Skippy", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "jif", name: "Jif", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "heinz", name: "Heinz", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "hellmanns", name: "Hellmann's", aliases: ["hellmanns", "best foods"], categories: ["pantry"], tier: "mainstream" },
  { id: "kikkoman", name: "Kikkoman", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "starkist", name: "StarKist", aliases: ["star kist"], categories: ["pantry"], tier: "mainstream" },
  { id: "bumble-bee", name: "Bumble Bee", aliases: [], categories: ["pantry"], tier: "mainstream" },

  // Bakery
  { id: "wonder", name: "Wonder", aliases: [], categories: ["bakery"], tier: "value" },
  { id: "natures-own", name: "Nature's Own", aliases: ["natures own"], categories: ["bakery"], tier: "mainstream" },
  { id: "sara-lee", name: "Sara Lee", aliases: [], categories: ["bakery"], tier: "mainstream" },
  { id: "dave-killer", name: "Dave's Killer Bread", aliases: ["daves killer bread"], categories: ["bakery"], tier: "premium" },
  { id: "mission", name: "Mission", aliases: [], categories: ["bakery"], tier: "mainstream" },
  { id: "thomas", name: "Thomas'", aliases: ["thomas"], categories: ["bakery"], tier: "mainstream" },

  // Frozen
  { id: "birds-eye", name: "Birds Eye", aliases: ["birdseye"], categories: ["frozen"], tier: "mainstream" },
  { id: "green-giant", name: "Green Giant", aliases: [], categories: ["frozen", "pantry"], tier: "mainstream" },
  { id: "stouffers", name: "Stouffer's", aliases: ["stouffers"], categories: ["frozen"], tier: "mainstream" },
  { id: "digiorno", name: "DiGiorno", aliases: [], categories: ["frozen"], tier: "mainstream" },
  { id: "ore-ida", name: "Ore-Ida", aliases: ["ore ida"], categories: ["frozen"], tier: "mainstream" },
  { id: "ben-jerrys", name: "Ben & Jerry's", aliases: ["ben and jerrys", "ben jerrys"], categories: ["frozen"], tier: "premium" },
  { id: "haagen", name: "Häagen-Dazs", aliases: ["haagen dazs", "haagen-dazs"], categories: ["frozen"], tier: "premium" },

  // Produce
  { id: "dole", name: "Dole", aliases: [], categories: ["produce"], tier: "mainstream" },
  { id: "driscolls", name: "Driscoll's", aliases: ["driscolls"], categories: ["produce"], tier: "mainstream" },
  { id: "chiquita", name: "Chiquita", aliases: [], categories: ["produce"], tier: "mainstream" },
  { id: "earthbound", name: "Earthbound Farm", aliases: ["earthbound farm"], categories: ["produce"], tier: "premium" },
  { id: "taylor-farms", name: "Taylor Farms", aliases: [], categories: ["produce"], tier: "mainstream" },

  // Beverages & snacks
  { id: "tropicana", name: "Tropicana", aliases: [], categories: ["beverages"], tier: "mainstream" },
  { id: "simply", name: "Simply", aliases: ["simply orange"], categories: ["beverages"], tier: "premium" },
  { id: "coca-cola", name: "Coca-Cola", aliases: ["coke", "coca cola"], categories: ["beverages"], tier: "mainstream" },
  { id: "pepsi", name: "Pepsi", aliases: [], categories: ["beverages"], tier: "mainstream" },
  { id: "lay", name: "Lay's", aliases: ["lays"], categories: ["snacks"], tier: "mainstream" },
  { id: "doritos", name: "Doritos", aliases: [], categories: ["snacks"], tier: "mainstream" },
  { id: "tostitos", name: "Tostitos", aliases: [], categories: ["snacks"], tier: "mainstream" },
  { id: "cheerios", name: "Cheerios", aliases: [], categories: ["pantry"], tier: "mainstream" },
  { id: "kelloggs", name: "Kellogg's", aliases: ["kelloggs"], categories: ["pantry"], tier: "mainstream" },
];

export const BRAND_COUNT = BRANDS.length;

const BRAND_INDEX: { needle: string; brand: Brand }[] = BRANDS.flatMap((brand) =>
  [brand.name, ...brand.aliases].map((needle) => ({ needle: normalize(needle), brand })),
).sort((a, b) => b.needle.length - a.needle.length);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9.#\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Finds a known brand named anywhere in a label. */
export function detectBrand(label: string): Brand | undefined {
  const text = normalize(label);
  return BRAND_INDEX.find(({ needle }) => text.includes(needle))?.brand;
}

/* ── Pack sizes ─────────────────────────────────────────────────── */

export type PackSize = { value: number; unit: PackUnit };

const NUMBER = "(\\d+(?:\\.\\d+)?(?:\\s*\\d\\/\\d)?|\\d\\/\\d)";
const UNIT_WORDS = Object.keys(UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[.#/]/g, "\\$&"))
  .join("|");

const SIZE_RE = new RegExp(`${NUMBER}\\s*-?\\s*(${UNIT_WORDS})\\b`, "i");
/** "12 x 12 oz", "4 pack", "6 ct", "2 count" */
const MULTI_RE = new RegExp(`(\\d+)\\s*(?:x|×|-)\\s*(?=${NUMBER})`, "i");
const COUNT_RE = /(\d+)\s*(?:ct|count|pk|pack|pieces?|rolls?)\b/i;

function parseNumber(raw: string): number {
  const text = raw.trim();
  const mixed = text.match(/^(\d+)\s+(\d)\/(\d)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = text.match(/^(\d)\/(\d)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(text);
}

/** Pulls a pack size ("16 oz", "1.5 lb", "2 L") out of free text. */
export function parsePackSize(label: string): PackSize | null {
  const match = normalize(label).match(SIZE_RE);
  if (!match) return null;
  const unit = UNIT_ALIASES[match[2].toLowerCase()];
  const value = parseNumber(match[1]);
  if (!unit || !Number.isFinite(value) || value <= 0) return null;
  return { value, unit };
}

/** How many identical packs the label / shopper indicated. */
export function parsePackCount(label: string): number {
  const text = normalize(label);
  const multi = text.match(MULTI_RE);
  if (multi) return Math.max(1, Number(multi[1]));
  if (/\bdozen\b/.test(text)) return 12;
  const count = text.match(COUNT_RE);
  if (count) return Math.max(1, Number(count[1]));
  return 1;
}

export function formatPackSize(size: PackSize | null, count = 1): string {
  if (!size) return count > 1 ? `${count} packs` : "";
  const unitLabel = size.unit === "fl-oz" ? "fl oz" : size.unit === "ct" ? "ct" : size.unit;
  const one = `${Number(size.value.toFixed(2))} ${unitLabel}`;
  return count > 1 ? `${count} × ${one}` : one;
}

/* ── Pack forms ─────────────────────────────────────────────────── */

const FORM_PATTERNS: { form: PackForm; re: RegExp }[] = [
  { form: "can", re: /\bcans?\b|\btinned?\b/ },
  { form: "jar", re: /\bjars?\b/ },
  { form: "bottle", re: /\bbottles?\b/ },
  { form: "carton", re: /\bcartons?\b/ },
  { form: "tub", re: /\btubs?\b|\bcontainers?\b/ },
  { form: "tray", re: /\btrays?\b/ },
  { form: "loaf", re: /\bloaf|loaves\b/ },
  { form: "dozen", re: /\bdozen\b/ },
  { form: "bunch", re: /\bbunch(es)?\b|\bhead of\b/ },
  { form: "box", re: /\bbox(es)?\b|\bcartons? of\b/ },
  { form: "bag", re: /\bbags?\b|\bsacks?\b|\bpouch(es)?\b/ },
  { form: "pack", re: /\bpacks?\b|\bpk\b|\bmulti-?pack\b/ },
];

/** Default package form for an aisle, when the label doesn't say. */
const DEFAULT_FORM: Record<Aisle, PackForm> = {
  produce: "loose",
  meat: "tray",
  dairy: "carton",
  bakery: "loaf",
  frozen: "bag",
  pantry: "box",
  other: "pack",
};

export function detectPackForm(label: string, aisle?: Aisle): PackForm {
  const text = normalize(label);
  const hit = FORM_PATTERNS.find(({ re }) => re.test(text));
  if (hit) return hit.form;
  return aisle ? DEFAULT_FORM[aisle] : "pack";
}

/* ── Typical shelf pack sizes ───────────────────────────────────── */

/**
 * What this food usually comes in, used when the label is unreadable.
 * Keyed by ingredient id from src/lib/ingredients-db.ts — the keys must match
 * those ids exactly or the typical size is never found.
 */
const TYPICAL_PACK: Record<string, { size: PackSize; form: PackForm }> = {
  // Meat & seafood
  "chicken-breast": { size: { value: 2.5, unit: "lb" }, form: "tray" },
  "chicken-thigh": { size: { value: 2.5, unit: "lb" }, form: "tray" },
  "whole-chicken": { size: { value: 4, unit: "lb" }, form: "tray" },
  chicken: { size: { value: 2.5, unit: "lb" }, form: "tray" },
  "ground-beef": { size: { value: 1, unit: "lb" }, form: "tray" },
  "ground-turkey": { size: { value: 1, unit: "lb" }, form: "tray" },
  steak: { size: { value: 1, unit: "lb" }, form: "tray" },
  beef: { size: { value: 1, unit: "lb" }, form: "tray" },
  pork: { size: { value: 1.5, unit: "lb" }, form: "tray" },
  turkey: { size: { value: 12, unit: "lb" }, form: "tray" },
  bacon: { size: { value: 12, unit: "oz" }, form: "pack" },
  sausage: { size: { value: 19, unit: "oz" }, form: "pack" },
  shrimp: { size: { value: 1, unit: "lb" }, form: "bag" },
  salmon: { size: { value: 1, unit: "lb" }, form: "tray" },
  "white-fish": { size: { value: 1, unit: "lb" }, form: "tray" },
  "canned-tuna": { size: { value: 5, unit: "oz" }, form: "can" },
  tofu: { size: { value: 14, unit: "oz" }, form: "tub" },

  // Dairy & eggs
  milk: { size: { value: 1, unit: "gal" }, form: "carton" },
  eggs: { size: { value: 12, unit: "ct" }, form: "carton" },
  butter: { size: { value: 16, unit: "oz" }, form: "box" },
  yogurt: { size: { value: 32, unit: "oz" }, form: "tub" },
  "cream-cheese": { size: { value: 8, unit: "oz" }, form: "box" },
  "sour-cream": { size: { value: 16, unit: "oz" }, form: "tub" },
  "heavy-cream": { size: { value: 16, unit: "fl-oz" }, form: "carton" },
  cheddar: { size: { value: 8, unit: "oz" }, form: "bag" },
  mozzarella: { size: { value: 8, unit: "oz" }, form: "bag" },
  parmesan: { size: { value: 5, unit: "oz" }, form: "tub" },
  feta: { size: { value: 6, unit: "oz" }, form: "tub" },
  cheese: { size: { value: 8, unit: "oz" }, form: "bag" },

  // Produce
  onion: { size: { value: 3, unit: "lb" }, form: "bag" },
  garlic: { size: { value: 3, unit: "ct" }, form: "pack" },
  "green-onion": { size: { value: 1, unit: "bunch" as PackUnit }, form: "bunch" },
  shallot: { size: { value: 8, unit: "oz" }, form: "bag" },
  tomato: { size: { value: 1.5, unit: "lb" }, form: "loose" },
  potato: { size: { value: 5, unit: "lb" }, form: "bag" },
  "sweet-potato": { size: { value: 3, unit: "lb" }, form: "bag" },
  carrot: { size: { value: 2, unit: "lb" }, form: "bag" },
  celery: { size: { value: 1, unit: "bunch" as PackUnit }, form: "bunch" },
  "bell-pepper": { size: { value: 3, unit: "ct" }, form: "pack" },
  "chili-pepper": { size: { value: 4, unit: "oz" }, form: "loose" },
  broccoli: { size: { value: 12, unit: "oz" }, form: "bunch" },
  cauliflower: { size: { value: 2, unit: "lb" }, form: "loose" },
  spinach: { size: { value: 10, unit: "oz" }, form: "bag" },
  kale: { size: { value: 8, unit: "oz" }, form: "bunch" },
  lettuce: { size: { value: 1.3, unit: "lb" }, form: "loose" },
  cabbage: { size: { value: 2.5, unit: "lb" }, form: "loose" },
  cucumber: { size: { value: 0.7, unit: "lb" }, form: "loose" },
  zucchini: { size: { value: 1, unit: "lb" }, form: "loose" },
  squash: { size: { value: 2, unit: "lb" }, form: "loose" },
  mushroom: { size: { value: 8, unit: "oz" }, form: "pack" },
  corn: { size: { value: 4, unit: "ct" }, form: "pack" },
  peas: { size: { value: 12, unit: "oz" }, form: "bag" },
  "green-beans": { size: { value: 12, unit: "oz" }, form: "bag" },
  asparagus: { size: { value: 1, unit: "lb" }, form: "bunch" },
  eggplant: { size: { value: 1, unit: "lb" }, form: "loose" },
  beet: { size: { value: 2, unit: "lb" }, form: "bunch" },
  "brussels-sprouts": { size: { value: 1, unit: "lb" }, form: "bag" },
  ginger: { size: { value: 4, unit: "oz" }, form: "loose" },
  avocado: { size: { value: 1.5, unit: "lb" }, form: "bag" },
  lemon: { size: { value: 2, unit: "lb" }, form: "bag" },
  lime: { size: { value: 1, unit: "lb" }, form: "bag" },
  orange: { size: { value: 4, unit: "lb" }, form: "bag" },
  apple: { size: { value: 3, unit: "lb" }, form: "bag" },
  banana: { size: { value: 2.5, unit: "lb" }, form: "bunch" },
  berries: { size: { value: 16, unit: "oz" }, form: "pack" },
  grapes: { size: { value: 2, unit: "lb" }, form: "bag" },
  pear: { size: { value: 2, unit: "lb" }, form: "bag" },
  pineapple: { size: { value: 3, unit: "lb" }, form: "loose" },
  parsley: { size: { value: 1, unit: "bunch" as PackUnit }, form: "bunch" },
  cilantro: { size: { value: 1, unit: "bunch" as PackUnit }, form: "bunch" },
  basil: { size: { value: 0.75, unit: "oz" }, form: "pack" },
  mint: { size: { value: 0.75, unit: "oz" }, form: "pack" },

  // Bakery & grains
  bread: { size: { value: 20, unit: "oz" }, form: "loaf" },
  tortilla: { size: { value: 10, unit: "ct" }, form: "pack" },
  pasta: { size: { value: 16, unit: "oz" }, form: "box" },
  rice: { size: { value: 2, unit: "lb" }, form: "bag" },
  oats: { size: { value: 42, unit: "oz" }, form: "carton" },
  flour: { size: { value: 5, unit: "lb" }, form: "bag" },
  breadcrumbs: { size: { value: 15, unit: "oz" }, form: "carton" },

  // Pantry
  "olive-oil": { size: { value: 16.9, unit: "fl-oz" }, form: "bottle" },
  oil: { size: { value: 48, unit: "fl-oz" }, form: "bottle" },
  salt: { size: { value: 26, unit: "oz" }, form: "carton" },
  "black-pepper": { size: { value: 4, unit: "oz" }, form: "jar" },
  sugar: { size: { value: 4, unit: "lb" }, form: "bag" },
  honey: { size: { value: 12, unit: "oz" }, form: "bottle" },
  broth: { size: { value: 32, unit: "fl-oz" }, form: "carton" },
  "canned-tomato": { size: { value: 28, unit: "oz" }, form: "can" },
  "tomato-paste": { size: { value: 6, unit: "oz" }, form: "can" },
  beans: { size: { value: 15, unit: "oz" }, form: "can" },
  lentils: { size: { value: 16, unit: "oz" }, form: "bag" },
  "coconut-milk": { size: { value: 13.5, unit: "fl-oz" }, form: "can" },
  "soy-sauce": { size: { value: 10, unit: "fl-oz" }, form: "bottle" },
  vinegar: { size: { value: 16, unit: "fl-oz" }, form: "bottle" },
  "hot-sauce": { size: { value: 5, unit: "fl-oz" }, form: "bottle" },
  "fish-sauce": { size: { value: 8, unit: "fl-oz" }, form: "bottle" },
  mustard: { size: { value: 12, unit: "oz" }, form: "bottle" },
  mayo: { size: { value: 30, unit: "fl-oz" }, form: "jar" },
  ketchup: { size: { value: 32, unit: "oz" }, form: "bottle" },
  "peanut-butter": { size: { value: 16, unit: "oz" }, form: "jar" },
  nuts: { size: { value: 16, unit: "oz" }, form: "bag" },
  chocolate: { size: { value: 12, unit: "oz" }, form: "bag" },
  vanilla: { size: { value: 2, unit: "fl-oz" }, form: "bottle" },
  "baking-powder": { size: { value: 8.1, unit: "oz" }, form: "can" },
  spices: { size: { value: 2, unit: "oz" }, form: "jar" },
  wine: { size: { value: 750, unit: "ml" }, form: "bottle" },

  // Frozen
  "frozen-vegetables": { size: { value: 12, unit: "oz" }, form: "bag" },
  "frozen-fruit": { size: { value: 16, unit: "oz" }, form: "bag" },
};

/* ── Resolved product ───────────────────────────────────────────── */

export type GroceryProduct = {
  /** Exactly what the label/shelf said, cleaned up. */
  label: string;
  brand?: Brand;
  /** Canonical food this product is, when we recognise it. */
  ingredient?: Ingredient;
  aisle?: Aisle;
  form: PackForm;
  /** Size of one package, if readable or typical. */
  packSize: PackSize | null;
  /** Whether packSize came from the label or from typical shelf data. */
  sizeSource: "label" | "typical" | "unknown";
  /** How many packages. */
  count: number;
  /** Total net weight in ounces across all packs, when it is a weight. */
  totalOunces: number | null;
  /** Total volume in fluid ounces across all packs. */
  totalFluidOunces: number | null;
  /** Estimated price for the whole quantity, in dollars. */
  estimatedPrice: number | null;
  /** Estimated price per pound, when weight is known. */
  estimatedPerPound: number | null;
  /** One-line human summary, e.g. "Barilla Penne — 2 × 16 oz box (2 lb)". */
  summary: string;
};

function typicalFor(ingredient?: Ingredient) {
  return ingredient ? TYPICAL_PACK[ingredient.id] : undefined;
}

/**
 * Turns one scanned/typed shelf label into a real product line: brand,
 * package form, pack size, quantity and an estimated price.
 */
export function resolveProduct(rawLabel: string, hintCount?: number): GroceryProduct {
  const label = rawLabel.replace(/\s+/g, " ").trim();
  const brand = detectBrand(label);
  const ingredient = resolveIngredient(label);
  const aisle = ingredient?.aisle;

  const labelSize = parsePackSize(label);
  const typical = typicalFor(ingredient);
  const packSize = labelSize ?? typical?.size ?? null;
  const sizeSource: GroceryProduct["sizeSource"] = labelSize
    ? "label"
    : typical
      ? "typical"
      : "unknown";

  const count = Math.max(1, hintCount ?? parsePackCount(label));
  const form = detectPackForm(label, aisle) ?? typical?.form ?? "pack";

  const perPackOz = packSize ? toOunces(packSize) : null;
  const perPackFlOz = packSize ? toFluidOunces(packSize) : null;
  const totalOunces = perPackOz === null ? null : perPackOz * count;
  const totalFluidOunces = perPackFlOz === null ? null : perPackFlOz * count;

  let estimatedPrice: number | null = null;
  let estimatedPerPound: number | null = null;
  const priceLine = ingredient?.name ?? label;
  if (totalOunces !== null) {
    const pounds = totalOunces / 16;
    const per = estimatePrice(`1 lb ${priceLine}`);
    if (per.dollars > 0) {
      estimatedPerPound = per.dollars;
      estimatedPrice = Number((per.dollars * pounds).toFixed(2));
    }
  } else if (totalFluidOunces !== null) {
    const cups = totalFluidOunces / 8;
    const perCup = estimatePrice(`1 cup ${priceLine}`);
    if (perCup.dollars > 0) estimatedPrice = Number((perCup.dollars * cups).toFixed(2));
  } else {
    const each = estimatePrice(`${count} ${priceLine}`);
    if (each.dollars > 0) estimatedPrice = Number(each.dollars.toFixed(2));
  }

  const pieces = [
    brand?.name,
    ingredient?.name ?? label,
    formatPackSize(packSize, count),
    PACK_FORM_LABEL[form],
  ].filter(Boolean);
  const weightNote =
    totalOunces !== null && totalOunces >= 16
      ? ` (${Number((totalOunces / 16).toFixed(2))} lb total)`
      : totalFluidOunces !== null && totalFluidOunces >= 32
        ? ` (${Number((totalFluidOunces / 128).toFixed(2))} gal total)`
        : "";

  return {
    label,
    brand,
    ingredient,
    aisle,
    form,
    packSize,
    sizeSource,
    count,
    totalOunces,
    totalFluidOunces,
    estimatedPrice,
    estimatedPerPound,
    summary: `${pieces.join(" — ")}${weightNote}`,
  };
}

/** Resolves a whole shelf / cart photo worth of labels. */
export function resolveProducts(labels: string[]): GroceryProduct[] {
  return labels
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => resolveProduct(label));
}

/** Total estimated spend for a set of resolved products. */
export function productsTotal(products: GroceryProduct[]): {
  total: number;
  priced: number;
  label: string;
} {
  const priced = products.filter((p) => p.estimatedPrice !== null);
  const total = priced.reduce((sum, p) => sum + (p.estimatedPrice ?? 0), 0);
  return { total, priced: priced.length, label: formatMoney(total) };
}

/** Cheap unit-price comparison between two products of the same food. */
export function betterValue(a: GroceryProduct, b: GroceryProduct): GroceryProduct | null {
  const unit = (p: GroceryProduct) =>
    p.estimatedPrice !== null && p.totalOunces ? p.estimatedPrice / p.totalOunces : null;
  const ua = unit(a);
  const ub = unit(b);
  if (ua === null || ub === null) return null;
  return ua <= ub ? a : b;
}

export { ingredientById };
