/**
 * Supported interface + voice languages for The Fridge & Cupboard.
 * The app is global-first: the UI, recipes, grocery lists and cooking
 * instructions are all translated into the user's language.
 */
export type LanguageCode = string;

export type Language = {
  /** BCP-47 base code, e.g. "es", "pt-BR", "zh-Hans". */
  code: LanguageCode;
  /** English name, used in prompts. */
  english: string;
  /** Native name, shown in the picker. */
  native: string;
  /** Right-to-left script. */
  rtl?: boolean;
  /** Default measurement system for this locale. */
  system?: "metric" | "imperial";
};

export const LANGUAGES: Language[] = [
  { code: "en", english: "English", native: "English", system: "imperial" },
  { code: "en-GB", english: "English (United Kingdom)", native: "English (UK)" },
  { code: "es", english: "Spanish", native: "Español" },
  { code: "es-MX", english: "Spanish (Mexico)", native: "Español (México)" },
  { code: "fr", english: "French", native: "Français" },
  { code: "fr-CA", english: "French (Canada)", native: "Français (Canada)" },
  { code: "de", english: "German", native: "Deutsch" },
  { code: "it", english: "Italian", native: "Italiano" },
  { code: "pt", english: "Portuguese", native: "Português" },
  { code: "pt-BR", english: "Portuguese (Brazil)", native: "Português (Brasil)" },
  { code: "nl", english: "Dutch", native: "Nederlands" },
  { code: "sv", english: "Swedish", native: "Svenska" },
  { code: "no", english: "Norwegian", native: "Norsk" },
  { code: "da", english: "Danish", native: "Dansk" },
  { code: "fi", english: "Finnish", native: "Suomi" },
  { code: "is", english: "Icelandic", native: "Íslenska" },
  { code: "pl", english: "Polish", native: "Polski" },
  { code: "cs", english: "Czech", native: "Čeština" },
  { code: "sk", english: "Slovak", native: "Slovenčina" },
  { code: "hu", english: "Hungarian", native: "Magyar" },
  { code: "ro", english: "Romanian", native: "Română" },
  { code: "bg", english: "Bulgarian", native: "Български" },
  { code: "el", english: "Greek", native: "Ελληνικά" },
  { code: "hr", english: "Croatian", native: "Hrvatski" },
  { code: "sr", english: "Serbian", native: "Српски" },
  { code: "sl", english: "Slovenian", native: "Slovenščina" },
  { code: "uk", english: "Ukrainian", native: "Українська" },
  { code: "ru", english: "Russian", native: "Русский" },
  { code: "tr", english: "Turkish", native: "Türkçe" },
  { code: "ar", english: "Arabic", native: "العربية", rtl: true },
  { code: "ar-EG", english: "Arabic (Egyptian)", native: "العربية (مصر)", rtl: true },
  { code: "he", english: "Hebrew", native: "עברית", rtl: true },
  { code: "fa", english: "Persian", native: "فارسی", rtl: true },
  { code: "ur", english: "Urdu", native: "اردو", rtl: true },
  { code: "hi", english: "Hindi", native: "हिन्दी" },
  { code: "bn", english: "Bengali", native: "বাংলা" },
  { code: "pa", english: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "gu", english: "Gujarati", native: "ગુજરાતી" },
  { code: "mr", english: "Marathi", native: "मराठी" },
  { code: "ta", english: "Tamil", native: "தமிழ்" },
  { code: "te", english: "Telugu", native: "తెలుగు" },
  { code: "kn", english: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", english: "Malayalam", native: "മലയാളം" },
  { code: "si", english: "Sinhala", native: "සිංහල" },
  { code: "ne", english: "Nepali", native: "नेपाली" },
  { code: "th", english: "Thai", native: "ไทย" },
  { code: "vi", english: "Vietnamese", native: "Tiếng Việt" },
  { code: "id", english: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", english: "Malay", native: "Bahasa Melayu" },
  { code: "tl", english: "Filipino", native: "Filipino" },
  { code: "zh-Hans", english: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-Hant", english: "Chinese (Traditional)", native: "繁體中文" },
  { code: "yue", english: "Cantonese", native: "廣東話" },
  { code: "ja", english: "Japanese", native: "日本語" },
  { code: "ko", english: "Korean", native: "한국어" },
  { code: "sw", english: "Swahili", native: "Kiswahili" },
  { code: "am", english: "Amharic", native: "አማርኛ" },
  { code: "ha", english: "Hausa", native: "Hausa" },
  { code: "yo", english: "Yoruba", native: "Yorùbá" },
  { code: "ig", english: "Igbo", native: "Igbo" },
  { code: "zu", english: "Zulu", native: "isiZulu" },
  { code: "af", english: "Afrikaans", native: "Afrikaans" },
  { code: "kk", english: "Kazakh", native: "Қазақша" },
  { code: "uz", english: "Uzbek", native: "Oʻzbekcha" },
  { code: "az", english: "Azerbaijani", native: "Azərbaycanca" },
  { code: "hy", english: "Armenian", native: "Հայերեն" },
  { code: "ka", english: "Georgian", native: "ქართული" },
  { code: "et", english: "Estonian", native: "Eesti" },
  { code: "lv", english: "Latvian", native: "Latviešu" },
  { code: "lt", english: "Lithuanian", native: "Lietuvių" },
  { code: "sq", english: "Albanian", native: "Shqip" },
  { code: "mk", english: "Macedonian", native: "Македонски" },
  { code: "km", english: "Khmer", native: "ភាសាខ្មែរ" },
  { code: "lo", english: "Lao", native: "ລາວ" },
  { code: "my", english: "Burmese", native: "မြန်မာ" },
  { code: "mn", english: "Mongolian", native: "Монгол" },
  { code: "ht", english: "Haitian Creole", native: "Kreyòl Ayisyen" },
  { code: "haw", english: "Hawaiian", native: "ʻŌlelo Hawaiʻi" },
  { code: "ga", english: "Irish", native: "Gaeilge" },
  { code: "cy", english: "Welsh", native: "Cymraeg" },
  { code: "eu", english: "Basque", native: "Euskara" },
  { code: "ca", english: "Catalan", native: "Català" },
  { code: "gl", english: "Galician", native: "Galego" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code.toLowerCase(), l]));

export const DEFAULT_LANGUAGE = "en";

/** Countries that cook in cups/°F rather than grams/°C. */
const IMPERIAL_REGIONS = new Set(["US", "LR", "MM"]);

export function findLanguage(code: string | null | undefined): Language | undefined {
  if (!code) return undefined;
  const lower = code.toLowerCase();
  return BY_CODE.get(lower) ?? BY_CODE.get(lower.split("-")[0]!);
}

export function isRtl(code: string): boolean {
  return findLanguage(code)?.rtl === true;
}

export function languageName(code: string): string {
  return findLanguage(code)?.english ?? code;
}

/** Best supported language for a list of browser locales. */
export function detectLanguage(preferred: readonly string[]): string {
  for (const raw of preferred) {
    const exact = BY_CODE.get(raw.toLowerCase());
    if (exact) return exact.code;
    const base = BY_CODE.get(raw.toLowerCase().split("-")[0]!);
    if (base) return base.code;
  }
  return DEFAULT_LANGUAGE;
}

/** Metric everywhere except the handful of imperial regions. */
export function detectMeasurementSystem(preferred: readonly string[]): "metric" | "imperial" {
  for (const raw of preferred) {
    const region = raw.split("-")[1]?.toUpperCase();
    if (region && IMPERIAL_REGIONS.has(region)) return "imperial";
    if (region) return "metric";
  }
  return "imperial";
}
