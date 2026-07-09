// Smart Kitchen Coach — Batch H
// Local-only daily coach state: check-ins, missions, end-of-day reviews, challenges.

export type DailyGoal =
  | "save-money" | "use-leftovers" | "clean-fridge" | "quick-dinner"
  | "feed-family" | "comfort" | "healthy" | "recovery";

export const DAILY_GOALS: { id: DailyGoal; label: string; emoji: string }[] = [
  { id: "save-money", label: "Save money", emoji: "💸" },
  { id: "use-leftovers", label: "Use leftovers", emoji: "🥡" },
  { id: "clean-fridge", label: "Clean out fridge", emoji: "🧊" },
  { id: "quick-dinner", label: "Quick dinner", emoji: "⚡" },
  { id: "feed-family", label: "Feed family", emoji: "👨‍👩‍👧" },
  { id: "comfort", label: "Comfort food", emoji: "🍲" },
  { id: "healthy", label: "Healthy meals", emoji: "🥗" },
  { id: "recovery", label: "Recovery support", emoji: "💛" },
];

export type DailyMission = {
  id: string;
  title: string;
  detail: string;
  reward: string;
};

const MISSION_POOL: DailyMission[] = [
  { id: "leftover-1", title: "Use one leftover today", detail: "Open the rescue center and turn one leftover into dinner.", reward: "+1 rescue" },
  { id: "expiring-2", title: "Use two ingredients close to expiring", detail: "Tap your 'use soon' list and build a meal.", reward: "-2 waste risk" },
  { id: "no-shop", title: "Avoid shopping today", detail: "Cook only from what's already in the kitchen.", reward: "+1 streak day" },
  { id: "five-dollar", title: "Make dinner under $5", detail: "Try Budget Mode — pantry staples + one protein.", reward: "💵 budget win" },
  { id: "freezer", title: "Make something from your freezer", detail: "Rotate the freezer — oldest first.", reward: "🧊 freezer rescue" },
  { id: "veggie", title: "Use a vegetable you'd usually waste", detail: "Sauté, blend into soup, or roast it.", reward: "🌱 produce save" },
  { id: "double-batch", title: "Double a meal for tomorrow", detail: "Cook once, eat twice. Save time + money.", reward: "📦 meal prep" },
];

export type CheckIn = { date: string; goal: DailyGoal; missionId: string; missionDone: boolean };
export type EndOfDay = { date: string; cooked: boolean; usedLeftovers: boolean; somethingSpoiled: boolean; notes?: string };
export type DailyWin = { date: string; kind: "leftover" | "money" | "rescue" | "meal"; amount?: number; label: string };

const KEYS = {
  checkin: "fc.coach.checkins.v1",
  eod: "fc.coach.eod.v1",
  wins: "fc.coach.wins.v1",
  pantryChallenge: "fc.coach.pantry-challenge.v1",
} as const;

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fb; } catch { return fb; }
}
function write<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new CustomEvent("fnc:coach-updated")); } catch {}
}

function today(): string { return new Date().toISOString().slice(0, 10); }

export function pickMission(seedStr?: string): DailyMission {
  const seed = (seedStr ?? today()).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return MISSION_POOL[seed % MISSION_POOL.length];
}

export function getTodayCheckIn(): CheckIn | undefined {
  return read<CheckIn[]>(KEYS.checkin, []).find((c) => c.date === today());
}

export function saveCheckIn(goal: DailyGoal): CheckIn {
  const list = read<CheckIn[]>(KEYS.checkin, []).filter((c) => c.date !== today());
  const mission = pickMission(`${today()}-${goal}`);
  const entry: CheckIn = { date: today(), goal, missionId: mission.id, missionDone: false };
  list.unshift(entry);
  write(KEYS.checkin, list.slice(0, 90));
  return entry;
}

export function completeMission() {
  const list = read<CheckIn[]>(KEYS.checkin, []);
  const i = list.findIndex((c) => c.date === today());
  if (i >= 0) {
    list[i].missionDone = true;
    write(KEYS.checkin, list);
    addWin({ kind: "rescue", label: "Mission complete" });
  }
}

export function missionFor(checkin?: CheckIn): DailyMission {
  const id = checkin?.missionId;
  return MISSION_POOL.find((m) => m.id === id) ?? pickMission();
}

// ----- Wins -----
export function addWin(w: Omit<DailyWin, "date">) {
  const list = read<DailyWin[]>(KEYS.wins, []);
  list.unshift({ ...w, date: today() });
  write(KEYS.wins, list.slice(0, 500));
}
export function getWins(): DailyWin[] { return read<DailyWin[]>(KEYS.wins, []); }
export function todaysWins(): DailyWin[] { return getWins().filter((w) => w.date === today()); }

// ----- End of Day -----
export function saveEndOfDay(eod: Omit<EndOfDay, "date">) {
  const list = read<EndOfDay[]>(KEYS.eod, []).filter((e) => e.date !== today());
  list.unshift({ ...eod, date: today() });
  write(KEYS.eod, list.slice(0, 90));
  if (eod.cooked) addWin({ kind: "meal", label: "Cooked at home" });
  if (eod.usedLeftovers) addWin({ kind: "leftover", label: "Used leftovers" });
}
export function getTodayEod(): EndOfDay | undefined {
  return read<EndOfDay[]>(KEYS.eod, []).find((e) => e.date === today());
}

// ----- Weekly Report -----
export function weeklyReport() {
  const cutoff = Date.now() - 7 * 86400_000;
  const wins = getWins().filter((w) => new Date(w.date).getTime() >= cutoff);
  const checkins = read<CheckIn[]>(KEYS.checkin, []).filter((c) => new Date(c.date).getTime() >= cutoff);
  const eods = read<EndOfDay[]>(KEYS.eod, []).filter((e) => new Date(e.date).getTime() >= cutoff);
  const moneySaved = wins.filter((w) => w.kind === "money").reduce((a, b) => a + (b.amount ?? 0), 0);
  const leftoversUsed = wins.filter((w) => w.kind === "leftover").length;
  const mealsMade = wins.filter((w) => w.kind === "meal").length + eods.filter((e) => e.cooked).length;
  const rescued = wins.filter((w) => w.kind === "rescue").length;
  const spoiled = eods.filter((e) => e.somethingSpoiled).length;
  const missionsDone = checkins.filter((c) => c.missionDone).length;
  return { moneySaved, leftoversUsed, mealsMade, rescued, spoiled, missionsDone, days: checkins.length };
}

// ----- Pantry Challenge -----
export type PantryChallenge = { active: boolean; startedAt: number; targetDays: number };
export function getPantryChallenge(): PantryChallenge {
  return read<PantryChallenge>(KEYS.pantryChallenge, { active: false, startedAt: 0, targetDays: 3 });
}
export function startPantryChallenge(targetDays = 3) {
  write<PantryChallenge>(KEYS.pantryChallenge, { active: true, startedAt: Date.now(), targetDays });
}
export function endPantryChallenge() {
  const cur = getPantryChallenge();
  if (cur.active) {
    const days = Math.floor((Date.now() - cur.startedAt) / 86400_000);
    addWin({ kind: "rescue", label: `Pantry Challenge: ${days} day${days === 1 ? "" : "s"}` });
  }
  write<PantryChallenge>(KEYS.pantryChallenge, { active: false, startedAt: 0, targetDays: 3 });
}
export function pantryChallengeProgress() {
  const c = getPantryChallenge();
  if (!c.active) return { active: false, days: 0, target: c.targetDays, pct: 0 };
  const days = Math.max(0, Math.floor((Date.now() - c.startedAt) / 86400_000));
  return { active: true, days, target: c.targetDays, pct: Math.min(100, (days / c.targetDays) * 100) };
}
