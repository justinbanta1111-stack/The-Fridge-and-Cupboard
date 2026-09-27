import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { translateStrings } from "./translate.functions";
import {
  DEFAULT_LANGUAGE,
  detectLanguage,
  detectMeasurementSystem,
  findLanguage,
  isRtl,
} from "./languages";
import { convertUnits, type MeasurementSystem } from "./units";

const LANG_KEY = "tfc.language";
const SYSTEM_KEY = "tfc.measurementSystem";
const CACHE_KEY = "tfc.translations.v1";

type Cache = Record<string, Record<string, string>>;

function readCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}") as Cache;
  } catch {
    return {};
  }
}

function writeCache(cache: Cache) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota — translations simply re-fetch next visit */
  }
}

type LanguageContextValue = {
  language: string;
  setLanguage: (code: string) => void;
  system: MeasurementSystem;
  setSystem: (system: MeasurementSystem) => void;
  dir: "ltr" | "rtl";
  /** Translate an English string. Returns English until the translation lands. */
  t: (text: string) => string;
  /** Translate + auto-convert units in a longer block (recipe steps, tips). */
  tRecipe: (text: string) => string;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);
  const [system, setSystemState] = useState<MeasurementSystem>("imperial");
  const [ready, setReady] = useState(false);
  const [, forceRender] = useState(0);

  const cacheRef = useRef<Cache>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect the user's language + measurement system on first load.
  useEffect(() => {
    cacheRef.current = readCache();
    const stored = window.localStorage.getItem(LANG_KEY);
    const storedSystem = window.localStorage.getItem(SYSTEM_KEY) as MeasurementSystem | null;
    const locales = navigator.languages?.length ? navigator.languages : [navigator.language || "en"];
    setLanguageState(stored && findLanguage(stored) ? stored : detectLanguage(locales));
    setSystemState(storedSystem === "metric" || storedSystem === "imperial" ? storedSystem : detectMeasurementSystem(locales));
    setReady(true);
  }, []);

  // Keep <html lang> / <html dir> in sync so RTL scripts lay out correctly.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
  }, [language]);

  const flush = useCallback(
    async (target: string) => {
      const texts = Array.from(pendingRef.current).slice(0, 60);
      if (texts.length === 0) return;
      texts.forEach((t) => pendingRef.current.delete(t));
      try {
        const { translations } = await translateStrings({ data: { texts, target } });
        const bucket = (cacheRef.current[target] ??= {});
        texts.forEach((text, i) => {
          bucket[text] = translations[i] ?? text;
        });
        writeCache(cacheRef.current);
        forceRender((n) => n + 1);
      } catch {
        /* keep English on failure */
      }
      if (pendingRef.current.size > 0) void flush(target);
    },
    [],
  );

  const queue = useCallback(
    (text: string, target: string) => {
      pendingRef.current.add(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(target), 80);
    },
    [flush],
  );

  const t = useCallback(
    (text: string) => {
      if (!text || !ready || language.toLowerCase().startsWith("en")) return text;
      const hit = cacheRef.current[language]?.[text];
      if (hit) return hit;
      queue(text, language);
      return text;
    },
    [language, ready, queue],
  );

  const tRecipe = useCallback((text: string) => convertUnits(t(text), system), [t, system]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    try {
      window.localStorage.setItem(LANG_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const setSystem = useCallback((next: MeasurementSystem) => {
    setSystemState(next);
    try {
      window.localStorage.setItem(SYSTEM_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      system,
      setSystem,
      dir: isRtl(language) ? "rtl" : "ltr",
      t,
      tRecipe,
      ready,
    }),
    [language, setLanguage, system, setSystem, t, tRecipe, ready],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  // Safe fallback so components work even outside the provider (tests, isolated renders).
  return {
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
    system: "imperial",
    setSystem: () => {},
    dir: "ltr",
    t: (text: string) => text,
    tRecipe: (text: string) => text,
    ready: false,
  };
}

/** Shorthand: const t = useT(); <p>{t("Scan your fridge")}</p> */
export function useT() {
  return useLanguage().t;
}

/** Inline translated text: <T>Scan your fridge</T> */
export function T({ children }: { children: string }) {
  return <>{useLanguage().t(children)}</>;
}
