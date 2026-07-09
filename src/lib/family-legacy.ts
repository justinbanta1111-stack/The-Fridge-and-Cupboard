// Family / Legacy — Kitchen Legacy Mode storage.
// Everything is kept in localStorage so it never leaves the device unless the
// user explicitly shares. Designed to be warm, emotional, and personal.

export type LegacySource =
  | "grandma"
  | "grandpa"
  | "mom"
  | "dad"
  | "family"
  | "church"
  | "passed-down"
  | "handwritten"
  | "other";

export type Holiday =
  | "thanksgiving"
  | "christmas"
  | "easter"
  | "birthday"
  | "anniversary"
  | "church-dinner"
  | "memorial"
  | "reunion"
  | "other";

export type SpecialPerson =
  | "spouse"
  | "kids"
  | "parents"
  | "grandparents"
  | "church-family"
  | "friends"
  | "other";

export type LegacyPhoto = { id: string; dataUrl: string; caption?: string; addedAt: number };
export type VoiceNote = { id: string; dataUrl: string; durationSec?: number; label?: string; addedAt: number };
export type TimelineEntry = { id: string; occasion: string; date: string; note?: string };

export type LegacyRecipe = {
  id: string;
  title: string;
  source: LegacySource;
  sourceName?: string; // e.g. "Grandma Rose"
  ingredients?: string;
  instructions?: string;
  story?: string;             // "This reminds me of..."
  family?: string[];          // tagged family members
  holidays?: Holiday[];
  traditions?: string;
  specialPeople?: SpecialPerson[];
  photos: LegacyPhoto[];
  voiceNotes: VoiceNote[];
  timeline: TimelineEntry[];
  cookedCount: number;
  lovedCount: number;
  sharedCount: number;
  requestedCount: number;
  createdAt: number;
  updatedAt: number;
};

const KEY = "fac:family-legacy:v1";
export const LEGACY_EVENT = "fac:family-legacy:update";

export const SOURCE_META: Record<LegacySource, { label: string; emoji: string }> = {
  grandma: { label: "Grandma", emoji: "👵" },
  grandpa: { label: "Grandpa", emoji: "👴" },
  mom: { label: "Mom", emoji: "💐" },
  dad: { label: "Dad", emoji: "🧔" },
  family: { label: "Family favorite", emoji: "🏡" },
  church: { label: "Church", emoji: "⛪" },
  "passed-down": { label: "Passed down", emoji: "📜" },
  handwritten: { label: "Handwritten card", emoji: "✍️" },
  other: { label: "Other", emoji: "💛" },
};

export const HOLIDAY_META: Record<Holiday, { label: string; emoji: string }> = {
  thanksgiving: { label: "Thanksgiving", emoji: "🦃" },
  christmas: { label: "Christmas", emoji: "🎄" },
  easter: { label: "Easter", emoji: "🐣" },
  birthday: { label: "Birthday", emoji: "🎂" },
  anniversary: { label: "Anniversary", emoji: "💍" },
  "church-dinner": { label: "Church dinner", emoji: "⛪" },
  memorial: { label: "Memorial dinner", emoji: "🕊️" },
  reunion: { label: "Family reunion", emoji: "👨‍👩‍👧‍👦" },
  other: { label: "Other", emoji: "✨" },
};

export const PERSON_META: Record<SpecialPerson, { label: string; emoji: string }> = {
  spouse: { label: "Spouse", emoji: "💞" },
  kids: { label: "Kids", emoji: "🧒" },
  parents: { label: "Parents", emoji: "👨‍👩‍👧" },
  grandparents: { label: "Grandparents", emoji: "👴" },
  "church-family": { label: "Church family", emoji: "⛪" },
  friends: { label: "Close friends", emoji: "🤝" },
  other: { label: "Someone special", emoji: "💛" },
};

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LEGACY_EVENT));
}

export function readLegacy(): LegacyRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LegacyRecipe[]) : [];
  } catch {
    return [];
  }
}

function writeLegacy(next: LegacyRecipe[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    emit();
  } catch (err) {
    console.warn("[family-legacy] storage write failed", err);
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRecipe(input: Partial<LegacyRecipe> & { title: string; source: LegacySource }): LegacyRecipe {
  const list = readLegacy();
  const r: LegacyRecipe = {
    id: uid(),
    title: input.title.trim(),
    source: input.source,
    sourceName: input.sourceName?.trim(),
    ingredients: input.ingredients,
    instructions: input.instructions,
    story: input.story,
    family: input.family ?? [],
    holidays: input.holidays ?? [],
    traditions: input.traditions,
    specialPeople: input.specialPeople ?? [],
    photos: input.photos ?? [],
    voiceNotes: input.voiceNotes ?? [],
    timeline: input.timeline ?? [],
    cookedCount: 0,
    lovedCount: 0,
    sharedCount: 0,
    requestedCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeLegacy([r, ...list]);
  return r;
}

export function updateRecipe(id: string, patch: Partial<LegacyRecipe>) {
  const list = readLegacy();
  const next = list.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r));
  writeLegacy(next);
}

export function deleteRecipe(id: string) {
  writeLegacy(readLegacy().filter((r) => r.id !== id));
}

export function getRecipe(id: string): LegacyRecipe | undefined {
  return readLegacy().find((r) => r.id === id);
}

export function bumpCounter(id: string, key: "cookedCount" | "lovedCount" | "sharedCount" | "requestedCount", delta = 1) {
  const list = readLegacy();
  const next = list.map((r) => (r.id === id ? { ...r, [key]: Math.max(0, (r[key] ?? 0) + delta), updatedAt: Date.now() } : r));
  writeLegacy(next);
}

export function addPhoto(id: string, dataUrl: string, caption?: string) {
  const list = readLegacy();
  const next = list.map((r) =>
    r.id === id
      ? {
          ...r,
          photos: [{ id: uid(), dataUrl, caption, addedAt: Date.now() }, ...r.photos],
          updatedAt: Date.now(),
        }
      : r,
  );
  writeLegacy(next);
}

export function removePhoto(id: string, photoId: string) {
  const list = readLegacy();
  writeLegacy(
    list.map((r) => (r.id === id ? { ...r, photos: r.photos.filter((p) => p.id !== photoId), updatedAt: Date.now() } : r)),
  );
}

export function addVoiceNote(id: string, note: Omit<VoiceNote, "id" | "addedAt">) {
  const list = readLegacy();
  writeLegacy(
    list.map((r) =>
      r.id === id
        ? { ...r, voiceNotes: [{ id: uid(), addedAt: Date.now(), ...note }, ...r.voiceNotes], updatedAt: Date.now() }
        : r,
    ),
  );
}

export function removeVoiceNote(id: string, noteId: string) {
  const list = readLegacy();
  writeLegacy(
    list.map((r) =>
      r.id === id ? { ...r, voiceNotes: r.voiceNotes.filter((n) => n.id !== noteId), updatedAt: Date.now() } : r,
    ),
  );
}

export function addTimelineEntry(id: string, entry: Omit<TimelineEntry, "id">) {
  const list = readLegacy();
  writeLegacy(
    list.map((r) =>
      r.id === id
        ? { ...r, timeline: [{ id: uid(), ...entry }, ...r.timeline], updatedAt: Date.now() }
        : r,
    ),
  );
}

export function removeTimelineEntry(id: string, entryId: string) {
  const list = readLegacy();
  writeLegacy(
    list.map((r) =>
      r.id === id ? { ...r, timeline: r.timeline.filter((t) => t.id !== entryId), updatedAt: Date.now() } : r,
    ),
  );
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function getFavoritesBoard(list = readLegacy()) {
  return {
    mostCooked: [...list].sort((a, b) => b.cookedCount - a.cookedCount).slice(0, 5),
    mostLoved: [...list].sort((a, b) => b.lovedCount - a.lovedCount).slice(0, 5),
    mostShared: [...list].sort((a, b) => b.sharedCount - a.sharedCount).slice(0, 5),
    mostRequested: [...list].sort((a, b) => b.requestedCount - a.requestedCount).slice(0, 5),
  };
}
