// Pantry Challenge — client-side streak tracker.

const KEY = "tfc.pantry-challenge.v1";

export type ChallengeState = {
  startedAt: number;
  targetDays: number;
  daysCompleted: number;
  estimatedSavingsCents: number;
  active: boolean;
};

export function readChallenge(): ChallengeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChallengeState) : null;
  } catch { return null; }
}

function write(s: ChallengeState | null) {
  if (typeof window === "undefined") return;
  try {
    if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
    else window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("tfc:pantry-challenge:update"));
  } catch { /* ignore */ }
}

export function startChallenge(targetDays = 3) {
  write({
    startedAt: Date.now(),
    targetDays,
    daysCompleted: 0,
    estimatedSavingsCents: 0,
    active: true,
  });
}

export function logChallengeDay(savedCents = 1500) {
  const s = readChallenge();
  if (!s || !s.active) return;
  s.daysCompleted = Math.min(s.targetDays, s.daysCompleted + 1);
  s.estimatedSavingsCents += savedCents;
  if (s.daysCompleted >= s.targetDays) s.active = false;
  write(s);
}

export function endChallenge() {
  const s = readChallenge();
  if (!s) return;
  s.active = false;
  write(s);
}

export function resetChallenge() { write(null); }
