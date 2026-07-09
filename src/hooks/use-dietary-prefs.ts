import { useCallback, useEffect, useState } from "react";
import type { DietId } from "@/lib/personalization";

const KEY = "fac:dietary-prefs:v1";

function read(): DietId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DietId[]) : [];
  } catch {
    return [];
  }
}

export function useDietaryPrefs() {
  const [prefs, setPrefs] = useState<DietId[]>(() => read());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setPrefs(read());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((id: DietId) => {
    setPrefs((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setPrefs([]);
    try {
      window.localStorage.setItem(KEY, JSON.stringify([]));
    } catch {
      // ignore
    }
  }, []);

  return { prefs, toggle, clear };
}
