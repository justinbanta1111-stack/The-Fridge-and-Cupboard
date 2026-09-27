/**
 * Automatic temperature + measurement conversion for recipe text.
 * Runs on already-rendered strings so no recipe source has to change.
 */
export type MeasurementSystem = "metric" | "imperial";

function round(n: number, step: number) {
  return Math.round(n / step) * step;
}

function pretty(n: number): string {
  if (n >= 100) return String(Math.round(n));
  if (n >= 10) return String(round(n, 1));
  return String(round(n, 0.1)).replace(/\.0$/, "");
}

const FRACTIONS: Record<string, number> = {
  "1/8": 0.125,
  "1/4": 0.25,
  "1/3": 1 / 3,
  "3/8": 0.375,
  "1/2": 0.5,
  "5/8": 0.625,
  "2/3": 2 / 3,
  "3/4": 0.75,
  "7/8": 0.875,
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅛": 0.125,
};

function parseAmount(raw: string): number | null {
  const text = raw.trim();
  const mixed = text.match(/^(\d+)\s+(\d\/\d|[½⅓⅔¼¾⅛])$/);
  if (mixed) return Number(mixed[1]) + (FRACTIONS[mixed[2]!] ?? 0);
  if (FRACTIONS[text] != null) return FRACTIONS[text]!;
  const frac = text.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const num = Number(text.replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

const AMOUNT = String.raw`(\d+\s+\d\/\d|\d+\/\d+|[½⅓⅔¼¾⅛]|\d+(?:[.,]\d+)?)`;

type Rule = { re: RegExp; to: (n: number) => string };

const TO_METRIC: Rule[] = [
  { re: new RegExp(`${AMOUNT}\\s*°?\\s*F\\b`, "gi"), to: (n) => `${Math.round(((n - 32) * 5) / 9)}°C` },
  { re: new RegExp(`${AMOUNT}\\s*(?:degrees\\s+)?fahrenheit\\b`, "gi"), to: (n) => `${Math.round(((n - 32) * 5) / 9)}°C` },
  { re: new RegExp(`${AMOUNT}\\s*(?:cups?|c\\.)(?![a-z])`, "gi"), to: (n) => `${pretty(n * 240)} ml` },
  { re: new RegExp(`${AMOUNT}\\s*(?:tablespoons?|tbsps?|tbs)\\b`, "gi"), to: (n) => `${pretty(n * 15)} ml` },
  { re: new RegExp(`${AMOUNT}\\s*(?:teaspoons?|tsps?)\\b`, "gi"), to: (n) => `${pretty(n * 5)} ml` },
  { re: new RegExp(`${AMOUNT}\\s*(?:fluid ounces?|fl\\.?\\s?oz)\\b`, "gi"), to: (n) => `${pretty(n * 29.6)} ml` },
  { re: new RegExp(`${AMOUNT}\\s*(?:pounds?|lbs?)\\b`, "gi"), to: (n) => `${pretty(n * 453.6)} g` },
  { re: new RegExp(`${AMOUNT}\\s*(?:ounces?|oz)\\b`, "gi"), to: (n) => `${pretty(n * 28.35)} g` },
  { re: new RegExp(`${AMOUNT}\\s*(?:inches|inch|in\\.)\\b`, "gi"), to: (n) => `${pretty(n * 2.54)} cm` },
  { re: new RegExp(`${AMOUNT}\\s*(?:quarts?|qt)\\b`, "gi"), to: (n) => `${pretty(n * 0.95)} L` },
];

const TO_IMPERIAL: Rule[] = [
  { re: new RegExp(`${AMOUNT}\\s*°?\\s*C\\b`, "g"), to: (n) => `${Math.round((n * 9) / 5 + 32)}°F` },
  { re: new RegExp(`${AMOUNT}\\s*(?:degrees\\s+)?celsius\\b`, "gi"), to: (n) => `${Math.round((n * 9) / 5 + 32)}°F` },
  { re: new RegExp(`${AMOUNT}\\s*(?:kilograms?|kgs?)\\b`, "gi"), to: (n) => `${pretty(n * 2.205)} lb` },
  { re: new RegExp(`${AMOUNT}\\s*(?:grams?|gr?)\\b(?!\\w)`, "gi"), to: (n) => `${pretty(n / 28.35)} oz` },
  { re: new RegExp(`${AMOUNT}\\s*(?:milliliters?|millilitres?|ml)\\b`, "gi"), to: (n) => `${pretty(n / 240)} cups` },
  { re: new RegExp(`${AMOUNT}\\s*(?:liters?|litres?|l)\\b(?!\\w)`, "gi"), to: (n) => `${pretty(n * 4.227)} cups` },
  { re: new RegExp(`${AMOUNT}\\s*(?:centimeters?|centimetres?|cm)\\b`, "gi"), to: (n) => `${pretty(n / 2.54)} in` },
];

/** Rewrite measurements + temperatures in a block of text to the target system. */
export function convertUnits(text: string, system: MeasurementSystem): string {
  if (!text) return text;
  const rules = system === "metric" ? TO_METRIC : TO_IMPERIAL;
  let out = text;
  for (const rule of rules) {
    out = out.replace(rule.re, (match, amount: string) => {
      const value = parseAmount(amount);
      return value == null ? match : rule.to(value);
    });
  }
  return out;
}

export function formatTemperature(value: number, from: "C" | "F", system: MeasurementSystem): string {
  if (system === "metric") {
    return `${Math.round(from === "C" ? value : ((value - 32) * 5) / 9)}°C`;
  }
  return `${Math.round(from === "F" ? value : (value * 9) / 5 + 32)}°F`;
}
