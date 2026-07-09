// Life Mode — Batch I
export type DayKind =
  | "busy" | "lazy" | "sick" | "broke" | "family" | "date"
  | "stressful" | "celebration" | "meal-prep" | "church";

export type Mood =
  | "tired" | "stressed" | "happy" | "sick" | "overwhelmed" | "motivated" | "comfort";

export const DAYS: { id: DayKind; label: string; emoji: string }[] = [
  { id: "busy", label: "Busy day", emoji: "🏃" },
  { id: "lazy", label: "Lazy day", emoji: "🛋️" },
  { id: "sick", label: "Sick day", emoji: "🤒" },
  { id: "broke", label: "Broke day", emoji: "💸" },
  { id: "family", label: "Family day", emoji: "👨‍👩‍👧" },
  { id: "date", label: "Date night", emoji: "🌹" },
  { id: "stressful", label: "Stressful day", emoji: "😮‍💨" },
  { id: "celebration", label: "Celebration day", emoji: "🎉" },
  { id: "meal-prep", label: "Meal prep day", emoji: "📦" },
  { id: "church", label: "Church day", emoji: "⛪" },
];

export const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: "tired", label: "Tired", emoji: "😴" },
  { id: "stressed", label: "Stressed", emoji: "😣" },
  { id: "happy", label: "Happy", emoji: "😊" },
  { id: "sick", label: "Sick", emoji: "🤒" },
  { id: "overwhelmed", label: "Overwhelmed", emoji: "😵" },
  { id: "motivated", label: "Motivated", emoji: "💪" },
  { id: "comfort", label: "Comfort needed", emoji: "🫂" },
];

export function dayHint(d?: DayKind): string {
  switch (d) {
    case "busy": return "fast meals, fewest steps possible";
    case "lazy": return "one-pan, low effort, minimal cleanup";
    case "sick": return "gentle, soothing, easy to digest (soups, broths, toast)";
    case "broke": return "cheapest meals, pantry staples first, under $5";
    case "family": return "larger portions, kid-friendly, family-style";
    case "date": return "higher quality, restaurant-style, a little fancier";
    case "stressful": return "comfort meals, warm, familiar";
    case "celebration": return "festive, special, share-worthy";
    case "meal-prep": return "bulk cook, freezer-friendly, repeat-able";
    case "church": return "bulk meals, potluck-friendly, easy to transport";
    default: return "balanced everyday meals";
  }
}

export function moodHint(m?: Mood): string {
  switch (m) {
    case "tired": return "fewer steps, 15 minutes or less";
    case "stressed": return "comfort meals, warm and familiar";
    case "sick": return "gentle, hydrating, easy on the stomach";
    case "overwhelmed": return "fastest meals, minimal decisions";
    case "motivated": return "challenge me a little, fresh and creative";
    case "happy": return "fun, bright, share-worthy";
    case "comfort": return "soups, pasta, mashed potatoes, rice bowls, toast meals";
    default: return "";
  }
}

// Local persistence
const KEYS = {
  state: "fc.life-mode.v1",
  zeroWaste: "fc.life-mode.zero-waste.v1",
  reflections: "fc.life-mode.reflections.v1",
} as const;

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fb; } catch { return fb; }
}
function write<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new CustomEvent("fnc:life-mode-updated")); } catch {}
}
const today = () => new Date().toISOString().slice(0, 10);

export type LifeState = { day?: DayKind; mood?: Mood; date: string };
export function getLifeState(): LifeState {
  const s = read<LifeState>(KEYS.state, { date: today() });
  if (s.date !== today()) return { date: today() };
  return s;
}
export function setLifeState(p: Partial<LifeState>) {
  write<LifeState>(KEYS.state, { ...getLifeState(), ...p, date: today() });
}

export type ZeroWaste = { active: boolean; startedAt: number };
export function getZeroWaste(): ZeroWaste {
  return read<ZeroWaste>(KEYS.zeroWaste, { active: false, startedAt: 0 });
}
export function startZeroWaste() { write<ZeroWaste>(KEYS.zeroWaste, { active: true, startedAt: Date.now() }); }
export function endZeroWaste() { write<ZeroWaste>(KEYS.zeroWaste, { active: false, startedAt: 0 }); }

export type Reflection = { date: string; helped: boolean; savedMoney: boolean; usedLeftovers: boolean };
export function saveReflection(r: Omit<Reflection, "date">) {
  const list = read<Reflection[]>(KEYS.reflections, []).filter((x) => x.date !== today());
  list.unshift({ ...r, date: today() });
  write(KEYS.reflections, list.slice(0, 90));
}
export function getTodayReflection() {
  return read<Reflection[]>(KEYS.reflections, []).find((r) => r.date === today());
}
