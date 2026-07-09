// Memory Kitchen — lightweight, client-side personalization memory.
// Stores cooked meals, stocked staples, cuisines, family size, and dietary
// preferences in localStorage. Optional. Never required by any flow.

export type CookedMeal = {
  title: string;
  cuisine?: string;
  count: number;
  lastCookedAt: number; // ms epoch
  favorite?: boolean;
};

export type MemoryKitchenState = {
  meals: CookedMeal[]; // most-recent / most-cooked first when sorted
  cuisines: Record<string, number>; // cuisine -> count
  staples: Record<string, number>; // ingredient keyword -> times seen across scans
  familySize?: number;
  enabled: boolean;
  updatedAt: number;
};

const KEY = "fac:memory-kitchen:v1";

function emptyState(): MemoryKitchenState {
  return { meals: [], cuisines: {}, staples: {}, enabled: true, updatedAt: Date.now() };
}

export function readMemory(): MemoryKitchenState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as MemoryKitchenState;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

export function writeMemory(state: MemoryKitchenState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
    window.dispatchEvent(new CustomEvent("fac:memory-kitchen:update"));
  } catch {
    // ignore quota / privacy errors
  }
}

function normalizeTitle(t: string): string {
  return t.trim().replace(/\s+/g, " ");
}

export function rememberCook(title: string, cuisine?: string) {
  const state = readMemory();
  if (!state.enabled) return;
  const norm = normalizeTitle(title);
  if (!norm) return;
  const key = norm.toLowerCase();
  const existing = state.meals.find((m) => m.title.toLowerCase() === key);
  if (existing) {
    existing.count += 1;
    existing.lastCookedAt = Date.now();
    if (cuisine && !existing.cuisine) existing.cuisine = cuisine;
  } else {
    state.meals.unshift({ title: norm, cuisine, count: 1, lastCookedAt: Date.now() });
  }
  if (cuisine) {
    state.cuisines[cuisine] = (state.cuisines[cuisine] ?? 0) + 1;
  }
  // cap to last 60 to stay lightweight
  state.meals = state.meals.slice(0, 60);
  writeMemory(state);
}

export function toggleFavorite(title: string) {
  const state = readMemory();
  const key = title.toLowerCase();
  const m = state.meals.find((x) => x.title.toLowerCase() === key);
  if (!m) return;
  m.favorite = !m.favorite;
  writeMemory(state);
}

export function forgetMeal(title: string) {
  const state = readMemory();
  const key = title.toLowerCase();
  state.meals = state.meals.filter((x) => x.title.toLowerCase() !== key);
  writeMemory(state);
}

export function rememberStaples(itemNames: string[]) {
  const state = readMemory();
  if (!state.enabled) return;
  for (const raw of itemNames) {
    const k = raw.toLowerCase().trim();
    if (!k) continue;
    state.staples[k] = (state.staples[k] ?? 0) + 1;
  }
  writeMemory(state);
}

export function setFamilySize(n: number | undefined) {
  const state = readMemory();
  state.familySize = n;
  writeMemory(state);
}

export function setMemoryEnabled(enabled: boolean) {
  const state = readMemory();
  state.enabled = enabled;
  writeMemory(state);
}

export function clearMemory() {
  writeMemory(emptyState());
}

export function getFavorites(state = readMemory()): CookedMeal[] {
  return [...state.meals]
    .filter((m) => m.favorite || m.count >= 2)
    .sort((a, b) => (b.favorite === a.favorite ? b.count - a.count : b.favorite ? 1 : -1));
}

export function getRecent(state = readMemory(), limit = 8): CookedMeal[] {
  return [...state.meals].sort((a, b) => b.lastCookedAt - a.lastCookedAt).slice(0, limit);
}

export function getTopCuisines(state = readMemory(), limit = 3): string[] {
  return Object.entries(state.cuisines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([c]) => c);
}

export function getTopStaples(state = readMemory(), limit = 10): string[] {
  return Object.entries(state.staples)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([s]) => s);
}
