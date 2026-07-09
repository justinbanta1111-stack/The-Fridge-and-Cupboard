// Weekly Challenges — rotating engagement prompts with simple local progress.
// Progress is intentionally manual (user taps "Did it!") so the feature works
// offline and doesn't require new server events.

export type Challenge = {
  id: string;
  title: string;
  description: string;
  goal: number; // tap count to complete
  reward: string;
  emoji: string;
};

export const CHALLENGES: Challenge[] = [
  {
    id: "leftovers-3",
    title: "Use 3 leftovers this week",
    description: "Pull 3 leftover ingredients out of the fridge and cook them instead of tossing.",
    goal: 3,
    reward: "Leftover Hero badge",
    emoji: "🥡",
  },
  {
    id: "pantry-only",
    title: "Pantry-only dinner",
    description: "One dinner this week using only what's already in your cupboard or pantry.",
    goal: 1,
    reward: "Pantry Pro badge",
    emoji: "🥫",
  },
  {
    id: "no-grocery",
    title: "No grocery trip challenge",
    description: "Make it through 7 days without a grocery run. Chef Super J will help stretch what you have.",
    goal: 7,
    reward: "Trip-Skipper badge",
    emoji: "🛒",
  },
  {
    id: "rescue-5",
    title: "Rescue 5 ingredients",
    description: "Catch 5 about-to-expire items and cook them before they go bad.",
    goal: 5,
    reward: "Food Rescuer badge",
    emoji: "♻️",
  },
];

type Progress = {
  weekStart: string;
  values: Record<string, number>;
  completed: Record<string, boolean>;
};

const KEY = "fac:weekly-challenges:v1";
const EVT = "fac:weekly-challenges:update";

function weekKey(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day + 6) % 7; // Monday start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export function readProgress(): Progress {
  if (typeof window === "undefined") return { weekStart: weekKey(), values: {}, completed: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Progress;
      if (parsed.weekStart === weekKey()) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { weekStart: weekKey(), values: {}, completed: {} };
}

function writeProgress(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* ignore */
  }
}

export function bumpChallenge(id: string) {
  const p = readProgress();
  const next = (p.values[id] ?? 0) + 1;
  p.values[id] = next;
  const c = CHALLENGES.find((x) => x.id === id);
  if (c && next >= c.goal) p.completed[id] = true;
  writeProgress(p);
  return p;
}

export function resetChallenge(id: string) {
  const p = readProgress();
  delete p.values[id];
  delete p.completed[id];
  writeProgress(p);
}

export const WEEKLY_CHALLENGES_EVENT = EVT;
