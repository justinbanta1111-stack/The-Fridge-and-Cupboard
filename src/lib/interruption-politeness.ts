/**
 * Interruption politeness: when the user keeps cutting the assistant off,
 * the assistant should usually just pause naturally and listen — no apology
 * every time. Only after repeated interruptions (3rd in a row) may it offer
 * a brief, warm "Pardon me." before continuing. Session-scoped so it never
 * carries across visits.
 */
const KEY = "tfc.voice.interruptions.v1";

/**
 * Record that the user just interrupted the assistant.
 * Returns true when it's time to politely acknowledge (every 3rd time);
 * the counter then resets.
 */
export function noteInterruption(): boolean {
  try {
    const n = (Number(sessionStorage.getItem(KEY)) || 0) + 1;
    if (n >= 3) {
      sessionStorage.setItem(KEY, "0");
      return true;
    }
    sessionStorage.setItem(KEY, String(n));
    return false;
  } catch {
    return false;
  }
}
