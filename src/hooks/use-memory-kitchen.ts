import { useCallback, useEffect, useState } from "react";
import {
  readMemory,
  type MemoryKitchenState,
  rememberCook,
  toggleFavorite,
  forgetMeal,
  setMemoryEnabled,
  setFamilySize,
  clearMemory,
} from "@/lib/memory-kitchen";

export function useMemoryKitchen() {
  const [state, setState] = useState<MemoryKitchenState>(() => readMemory());

  useEffect(() => {
    const refresh = () => setState(readMemory());
    window.addEventListener("fac:memory-kitchen:update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("fac:memory-kitchen:update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return {
    state,
    rememberCook: useCallback((title: string, cuisine?: string) => rememberCook(title, cuisine), []),
    toggleFavorite: useCallback((title: string) => toggleFavorite(title), []),
    forgetMeal: useCallback((title: string) => forgetMeal(title), []),
    setEnabled: useCallback((v: boolean) => setMemoryEnabled(v), []),
    setFamilySize: useCallback((n: number | undefined) => setFamilySize(n), []),
    clear: useCallback(() => clearMemory(), []),
  };
}
