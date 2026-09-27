/**
 * Kitchen timer helpers for Cook With Me.
 *
 * - `suggestStepSeconds` reads a step ("simmer for 5 minutes") and suggests a timer.
 * - `parseTimerCommand` understands hands-free phrases like "timer five",
 *   "set a timer for ten minutes", "start the timer", "pause timer", "cancel timer".
 * - `formatClock` renders mm:ss.
 */

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, ninety: 90,
  "twenty five": 25, "forty five": 45, "thirty five": 35, "an hour": 60, hour: 60,
  half: 0.5,
};

function toNumber(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const digits = t.match(/\d+(\.\d+)?/);
  if (digits) return Number(digits[0]);
  if (WORD_NUMBERS[t] != null) return WORD_NUMBERS[t]!;
  // "twenty five" style pairs
  const parts = t.split(/[\s-]+/);
  if (parts.length === 2) {
    const a = WORD_NUMBERS[parts[0]!];
    const b = WORD_NUMBERS[parts[1]!];
    if (a != null && b != null && a >= 20 && b < 10) return a + b;
    // "ten minutes" style — fall back to the first word alone.
    if (a != null) return a;
  }
  return null;
}

const NUM = "(\\d+(?:\\.\\d+)?|[a-z]+(?:[\\s-][a-z]+)?)";
const DIGITS = "(\\d+(?:\\.\\d+)?)";

/** Suggested timer length (seconds) implied by a recipe step, or null. */
export function suggestStepSeconds(step: string): number | null {
  const t = (step || "").toLowerCase();
  // Prefer the first duration mentioned; take the low end of ranges ("8-10 minutes").
  const unitGroup = "(hours?|hrs?|minutes?|mins?|seconds?|secs?)";
  const m =
    t.match(new RegExp(`${DIGITS}\\s*(?:-|to|–)?\\s*(?:\\d+(?:\\.\\d+)?)?\\s*${unitGroup}\\b`)) ||
    t.match(new RegExp(`\\b([a-z]+)\\s+${unitGroup}\\b`));
  if (!m) return null;
  const n = toNumber(m[1]!);
  if (n == null || n <= 0) return null;
  const unit = m[2]!;
  const seconds = unit.startsWith("h") ? n * 3600 : unit.startsWith("s") ? n : n * 60;
  const rounded = Math.round(seconds);
  if (rounded < 5 || rounded > 6 * 3600) return null;
  return rounded;
}

export type TimerCommand =
  | { kind: "set"; seconds: number }
  | { kind: "start" }
  | { kind: "pause" }
  | { kind: "resume" }
  | { kind: "cancel" }
  | { kind: "check" }
  | { kind: "add"; seconds: number };

/** Parse a hands-free timer command, or null if the phrase isn't about timers. */
export function parseTimerCommand(raw: string): TimerCommand | null {
  const t = (raw || "").toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const aboutTimer =
    /\btimers?\b/.test(t) ||
    /\bset (?:a|an) \d+/.test(t) ||
    /\b(add|give me)\b.*\b(minutes?|mins?|seconds?|secs?|hours?)\b/.test(t);
  if (!aboutTimer) return null;

  if (/\b(cancel|clear|stop|reset|kill|delete)\b.*\btimer\b|\btimer\b.*\b(cancel|off|reset)\b/.test(t)) {
    return { kind: "cancel" };
  }
  if (/\b(pause|hold)\b.*\btimer\b|\btimer\b.*\bpause\b/.test(t)) return { kind: "pause" };
  if (/\b(resume|unpause|continue)\b.*\btimer\b|\btimer\b.*\bresume\b/.test(t)) return { kind: "resume" };
  if (/\b(how (much|long)|what'?s? left|check|remaining|time left)\b/.test(t)) return { kind: "check" };

  const add = t.match(new RegExp(`\\badd\\s+${NUM}\\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)?`));
  if (add) {
    const n = toNumber(add[1]!);
    if (n) {
      const u = add[2] ?? "minutes";
      return { kind: "add", seconds: Math.round(u.startsWith("h") ? n * 3600 : u.startsWith("s") ? n : n * 60) };
    }
  }

  // "timer five", "timer for 10 minutes", "set a timer for two minutes", "5 minute timer"
  const set =
    t.match(new RegExp(`timer\\s*(?:for|of|on)?\\s*${NUM}\\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)?`)) ||
    t.match(new RegExp(`${NUM}\\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)?\\s*timer`));
  if (set) {
    const n = toNumber(set[1]!);
    if (n && n > 0) {
      const unit = set[2] ?? "minutes";
      const seconds = Math.round(
        unit.startsWith("h") ? n * 3600 : unit.startsWith("s") ? n : n * 60,
      );
      if (seconds >= 1) return { kind: "set", seconds };
    }
  }

  if (/\b(start|begin|go)\b.*\btimer\b|\btimer\b.*\b(start|go)\b/.test(t)) return { kind: "start" };
  return null;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Spoken-friendly duration, e.g. "5 minutes", "1 minute 30 seconds". */
export function spokenDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (m) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (sec) parts.push(`${sec} second${sec === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 seconds";
}

/** Short triple-chime alarm using WebAudio (no asset needed). */
export function playTimerChime() {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.35, 0.7].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(i === 2 ? 1174.7 : 880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.32);
    });
    setTimeout(() => void ctx.close().catch(() => {}), 1600);
  } catch {
    /* no-op */
  }
}
