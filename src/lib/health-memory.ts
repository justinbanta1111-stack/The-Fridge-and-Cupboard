// Local-only meal memory for Health Companion. No PII leaves the device.
const KEY = "fc:health-memory:v2";
const LEGACY_KEY = "fc:health-memory:v1";

export type FollowUp = {
  title: string;
  helped: boolean;
  easyToEat: boolean;
  reducedNausea?: boolean;
  wouldMakeAgain: boolean;
  at: number;
};

export type CheckIn = {
  date: string; // YYYY-MM-DD
  feeling: "rough" | "okay" | "good";
  appetite: "worse" | "same" | "better";
  energy: "low" | "medium" | "good";
  hydration: "low" | "okay" | "great";
  at: number;
};

export type Wins = {
  mealsMade: number;
  foodSavedItems: number;
  moneySavedCents: number;
  toughDaysSupported: number;
};

export type HealthMemory = {
  worked: string[];
  rejected: string[];
  tolerated: string[]; // foods/ingredients they handled well
  disliked: string[];
  helpedSymptoms: Record<string, string[]>; // symptom -> meal titles
  preferredPrepMinutes?: number;
  comfortFavorites: string[];
  followUps: FollowUp[];
  checkIns: CheckIn[];
  wins: Wins;
};

function blank(): HealthMemory {
  return {
    worked: [],
    rejected: [],
    tolerated: [],
    disliked: [],
    helpedSymptoms: {},
    comfortFavorites: [],
    followUps: [],
    checkIns: [],
    wins: { mealsMade: 0, foodSavedItems: 0, moneySavedCents: 0, toughDaysSupported: 0 },
  };
}

export function loadHealthMemory(): HealthMemory {
  if (typeof window === "undefined") return blank();
  try {
    const raw =
      window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    const base = blank();
    return {
      ...base,
      worked: Array.isArray(parsed.worked) ? parsed.worked.slice(0, 80) : [],
      rejected: Array.isArray(parsed.rejected) ? parsed.rejected.slice(0, 80) : [],
      tolerated: Array.isArray(parsed.tolerated) ? parsed.tolerated.slice(0, 80) : [],
      disliked: Array.isArray(parsed.disliked) ? parsed.disliked.slice(0, 80) : [],
      helpedSymptoms:
        parsed.helpedSymptoms && typeof parsed.helpedSymptoms === "object"
          ? parsed.helpedSymptoms
          : {},
      preferredPrepMinutes:
        typeof parsed.preferredPrepMinutes === "number"
          ? parsed.preferredPrepMinutes
          : undefined,
      comfortFavorites: Array.isArray(parsed.comfortFavorites)
        ? parsed.comfortFavorites.slice(0, 20)
        : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 40) : [],
      checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns.slice(0, 60) : [],
      wins: { ...base.wins, ...(parsed.wins ?? {}) },
    };
  } catch {
    return blank();
  }
}

export function saveHealthMemory(mem: HealthMemory) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    // ignore
  }
}

export function markWorked(title: string) {
  const m = loadHealthMemory();
  if (!m.worked.includes(title)) m.worked.unshift(title);
  m.rejected = m.rejected.filter((t) => t !== title);
  m.wins.mealsMade += 1;
  saveHealthMemory(m);
}

export function markRejected(title: string) {
  const m = loadHealthMemory();
  if (!m.rejected.includes(title)) m.rejected.unshift(title);
  m.worked = m.worked.filter((t) => t !== title);
  saveHealthMemory(m);
}

export function recordFollowUp(
  fu: Omit<FollowUp, "at">,
  context?: { symptoms?: string[]; prepMinutes?: number; comfort?: boolean; ingredients?: string[] },
) {
  const m = loadHealthMemory();
  m.followUps.unshift({ ...fu, at: Date.now() });
  if (fu.helped || fu.wouldMakeAgain) {
    if (!m.worked.includes(fu.title)) m.worked.unshift(fu.title);
    if (context?.comfort && !m.comfortFavorites.includes(fu.title)) {
      m.comfortFavorites.unshift(fu.title);
    }
    if (context?.symptoms) {
      for (const s of context.symptoms) {
        const list = m.helpedSymptoms[s] ?? [];
        if (!list.includes(fu.title)) list.unshift(fu.title);
        m.helpedSymptoms[s] = list.slice(0, 10);
      }
    }
    for (const ing of context?.ingredients ?? []) {
      if (!m.tolerated.includes(ing)) m.tolerated.unshift(ing);
    }
  } else {
    if (!m.rejected.includes(fu.title)) m.rejected.unshift(fu.title);
    for (const ing of context?.ingredients ?? []) {
      if (!m.disliked.includes(ing)) m.disliked.unshift(ing);
    }
  }
  if (context?.prepMinutes && context.prepMinutes > 0) {
    const prev = m.preferredPrepMinutes ?? context.prepMinutes;
    m.preferredPrepMinutes = Math.round((prev + context.prepMinutes) / 2);
  }
  saveHealthMemory(m);
  return m;
}

export function recordCheckIn(c: Omit<CheckIn, "at">) {
  const m = loadHealthMemory();
  // Replace today's check-in if it exists
  m.checkIns = m.checkIns.filter((x) => x.date !== c.date);
  m.checkIns.unshift({ ...c, at: Date.now() });
  if (c.feeling === "rough") m.wins.toughDaysSupported += 1;
  saveHealthMemory(m);
  return m;
}

export function recordSavings(itemsSaved: number, centsSaved: number) {
  const m = loadHealthMemory();
  m.wins.foodSavedItems += Math.max(0, Math.floor(itemsSaved));
  m.wins.moneySavedCents += Math.max(0, Math.floor(centsSaved));
  saveHealthMemory(m);
  return m;
}

export function todaysCheckIn(m: HealthMemory): CheckIn | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return m.checkIns.find((x) => x.date === today);
}
