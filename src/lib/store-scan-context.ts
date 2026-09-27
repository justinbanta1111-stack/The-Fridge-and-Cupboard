/**
 * Lightweight memory of items the user recently scanned at the store.
 * Used by the grocery list to show "seen on your store scan" vs "in your fridge".
 */

const KEY = "tfc_store_scan_items_v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // a week of shopping trips

export type StoreScanItem = { name: string; at: number };

function read(): StoreScanItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as StoreScanItem[]).filter(
      (i) => i && typeof i.name === "string" && Date.now() - (i.at ?? 0) < TTL_MS,
    );
  } catch {
    return [];
  }
}

export function getStoreScanItems(): StoreScanItem[] {
  return read().sort((a, b) => b.at - a.at);
}

export function getStoreScanNames(): string[] {
  return getStoreScanItems().map((i) => i.name);
}

export function recordStoreScanItem(name: string) {
  const clean = name.trim();
  if (!clean || typeof localStorage === "undefined") return;
  const items = read().filter((i) => i.name.toLowerCase() !== clean.toLowerCase());
  items.unshift({ name: clean, at: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 40)));
  } catch {
    /* ignore */
  }
}

export function clearStoreScanItems() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
}
