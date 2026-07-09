// Price Watch — client-side favorite ingredients + best-price tracking.

export type WatchedItem = {
  name: string;
  bestPriceCents: number;
  bestStore?: string;
  history: { priceCents: number; store?: string; at: number }[];
  createdAt: number;
};

const KEY = "tfc.price-watch.v1";

export function readWatch(): WatchedItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as WatchedItem[];
  } catch {
    return [];
  }
}

function writeWatch(items: WatchedItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("tfc:price-watch:update"));
  } catch { /* ignore */ }
}

export function addWatch(name: string) {
  const items = readWatch();
  const k = name.trim().toLowerCase();
  if (!k || items.some((i) => i.name.toLowerCase() === k)) return;
  items.unshift({ name: name.trim(), bestPriceCents: 0, history: [], createdAt: Date.now() });
  writeWatch(items);
}

export function removeWatch(name: string) {
  writeWatch(readWatch().filter((i) => i.name.toLowerCase() !== name.toLowerCase()));
}

export type LogResult = { isBest: boolean; previousBestCents: number };
export function logPrice(name: string, priceCents: number, store?: string): LogResult | null {
  const items = readWatch();
  const it = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
  if (!it) return null;
  const prev = it.bestPriceCents || Infinity;
  it.history.unshift({ priceCents, store, at: Date.now() });
  it.history = it.history.slice(0, 20);
  const isBest = priceCents < prev;
  if (isBest) {
    it.bestPriceCents = priceCents;
    it.bestStore = store;
  }
  writeWatch(items);
  return { isBest, previousBestCents: prev === Infinity ? 0 : prev };
}
