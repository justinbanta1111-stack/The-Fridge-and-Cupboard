// "No Citric Acid" filter helpers.
// Shared by client screening UI and server AI prompts.

export const NO_CITRIC_ACID_LABEL = "No Citric Acid";

export const CITRIC_ACID_WARNING =
  "Please check the product label. This ingredient may contain citric acid.";

// Definite citrus / citric acid sources.
const AVOID_PATTERNS: RegExp[] = [
  /citric\s*acid/i,
  /\be\s*-?\s*330\b/i,
  /\blemon/i,
  /\blime(s)?\b/i,
  /\borange/i,
  /grapefruit/i,
  /tangerine/i,
  /mandarin/i,
  /clementine/i,
  /satsuma/i,
  /citrus/i,
  /\byuzu\b/i,
  /\bcalamansi\b/i,
  /\bpomelo\b/i,
  /\bkumquat\b/i,
  /\bcitron\b/i,
  /\bbergamot\b/i,
  /\bsour\s*(orange|salt)\b/i,
];

// Commonly contain citric acid but can't be confirmed without the label.
const MAYBE_PATTERNS: RegExp[] = [
  /soda|soft\s*drink|cola|sprite|seltzer|sparkling/i,
  /juice|lemonade|limeade|punch|energy\s*drink|sports\s*drink/i,
  /jam|jelly|preserve|marmalade/i,
  /candy|gummy|sour\s*(candy|gummies)|hard\s*candy/i,
  /yogurt|ice\s*cream|sherbet|sorbet/i,
  /salsa|ketchup|bbq\s*sauce|barbecue\s*sauce|hot\s*sauce|marinade|dressing|vinaigrette/i,
  /canned|jarred|pickled|pickle|tinned/i,
  /tomato\s*(sauce|paste|puree|soup)/i,
  /hummus|guacamole|dip/i,
  /wine\s*cooler|hard\s*seltzer|cocktail\s*mix/i,
  /powdered\s*(drink|mix)|drink\s*mix|gelatin|jello/i,
  /processed\s*cheese|cheese\s*spread|cream\s*cheese\s*spread/i,
  /frozen\s*(fruit|meal|dinner)/i,
  /protein\s*(bar|shake)|granola\s*bar|fruit\s*snack/i,
  /vitamin|supplement|effervescent/i,
];

export type CitricScreen = "avoid" | "maybe" | "ok";

export function screenForCitricAcid(text: string): CitricScreen {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return "ok";
  if (AVOID_PATTERNS.some((r) => r.test(t))) return "avoid";
  if (MAYBE_PATTERNS.some((r) => r.test(t))) return "maybe";
  return "ok";
}

export function hasNoCitricAcid(restrictions?: string[] | null): boolean {
  if (!restrictions) return false;
  return restrictions.some((r) => /no\s*citric\s*acid/i.test(String(r)));
}

// Extra system-prompt rules injected when the filter is on.
export function citricAcidPromptRule(restrictions?: string[] | null): string {
  if (!hasNoCitricAcid(restrictions)) return "";
  return [
    "NO CITRIC ACID FILTER IS ACTIVE — this is a hard restriction. Before showing ANY ingredient or recipe, screen it:",
    "- Never suggest citric acid, E330, lemon, lime, orange, grapefruit, tangerine, mandarin, clementine, pomelo, yuzu, calamansi, bergamot, or any other citrus fruit.",
    "- Never suggest citrus juice, citrus zest, citrus peel, or citrus extracts/flavorings.",
    "- Never suggest packaged foods or drinks that list citric acid as an ingredient (most sodas, juices, candies, jams, canned tomatoes, salsas, dressings, pickled goods).",
    "- Substitute acidity with vinegar (white, apple cider, rice), verjus, tamarind, sumac, or a splash of dry wine instead of citrus.",
    `- If an ingredient MIGHT contain citric acid but you cannot confirm it, still keep it out of required ingredients and add this exact warning in the notes: "${CITRIC_ACID_WARNING}"`,
  ].join("\n");
}
