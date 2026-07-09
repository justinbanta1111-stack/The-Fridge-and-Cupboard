import type { DayPlan, DayGoal } from "./day-of-meals.functions";

const KEY = "fac:day-of-meals:v1";

export type SavedDay = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  goal: DayGoal;
  plan: DayPlan;
  favorite?: boolean;
};

export type DayMemory = {
  loved: string[];
  avoid: string[];
  saved: SavedDay[];
  lastGoal?: DayGoal;
  lastTime?: string;
  lastGeneratedDate?: string;
};

const empty: DayMemory = { loved: [], avoid: [], saved: [] };

export function loadDayMemory(): DayMemory {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const m = JSON.parse(raw);
    return { ...empty, ...m };
  } catch {
    return empty;
  }
}

function write(m: DayMemory) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {}
  return m;
}

export function saveDay(day: SavedDay) {
  const m = loadDayMemory();
  const existingIdx = m.saved.findIndex((s) => s.id === day.id);
  if (existingIdx >= 0) m.saved[existingIdx] = day;
  else m.saved.unshift(day);
  m.saved = m.saved.slice(0, 30);
  return write(m);
}

export function toggleFavoriteDay(id: string) {
  const m = loadDayMemory();
  const d = m.saved.find((s) => s.id === id);
  if (d) d.favorite = !d.favorite;
  return write(m);
}

export function deleteSavedDay(id: string) {
  const m = loadDayMemory();
  m.saved = m.saved.filter((s) => s.id !== id);
  return write(m);
}

export function markLoved(title: string) {
  const m = loadDayMemory();
  if (!m.loved.includes(title)) m.loved.push(title);
  m.avoid = m.avoid.filter((t) => t !== title);
  return write(m);
}

export function markAvoid(title: string) {
  const m = loadDayMemory();
  if (!m.avoid.includes(title)) m.avoid.push(title);
  m.loved = m.loved.filter((t) => t !== title);
  return write(m);
}

export function recordPrefs(goal: DayGoal, time: string) {
  const m = loadDayMemory();
  m.lastGoal = goal;
  m.lastTime = time;
  m.lastGeneratedDate = new Date().toISOString().slice(0, 10);
  return write(m);
}
