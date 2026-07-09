// Family Favorites — lightweight localStorage favorites tagged by audience.
// Pairs nicely with Memory Kitchen but is intentionally separate so families
// can spotlight a small list of go-to wins.

export type FavoriteTag = "kid" | "spouse" | "me";

export type FamilyFavorite = {
  title: string;
  tags: FavoriteTag[];
  note?: string;
  cookCount: number;
  addedAt: number;
  lastCookedAt?: number;
};

const KEY = "fac:family-favorites:v1";
const EVT = "fac:family-favorites:update";

export function readFavorites(): FamilyFavorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as FamilyFavorite[];
  } catch {
    return [];
  }
}

function writeFavorites(next: FamilyFavorite[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    // ignore quota / privacy
  }
}

function normalize(title: string) {
  return title.trim().replace(/\s+/g, " ");
}

export function addFavorite(title: string, tags: FavoriteTag[] = ["me"], note?: string) {
  const norm = normalize(title);
  if (!norm) return;
  const list = readFavorites();
  const key = norm.toLowerCase();
  const existing = list.find((f) => f.title.toLowerCase() === key);
  if (existing) {
    existing.tags = Array.from(new Set([...(existing.tags ?? []), ...tags]));
    if (note) existing.note = note;
  } else {
    list.unshift({ title: norm, tags: Array.from(new Set(tags)), note, cookCount: 0, addedAt: Date.now() });
  }
  writeFavorites(list.slice(0, 80));
}

export function removeFavorite(title: string) {
  const key = title.toLowerCase();
  writeFavorites(readFavorites().filter((f) => f.title.toLowerCase() !== key));
}

export function toggleTag(title: string, tag: FavoriteTag) {
  const list = readFavorites();
  const f = list.find((x) => x.title.toLowerCase() === title.toLowerCase());
  if (!f) return;
  f.tags = f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag];
  writeFavorites(list);
}

export function markCookedAgain(title: string) {
  const list = readFavorites();
  const f = list.find((x) => x.title.toLowerCase() === title.toLowerCase());
  if (!f) return;
  f.cookCount = (f.cookCount ?? 0) + 1;
  f.lastCookedAt = Date.now();
  writeFavorites(list);
}

export const FAMILY_FAVORITES_EVENT = EVT;
