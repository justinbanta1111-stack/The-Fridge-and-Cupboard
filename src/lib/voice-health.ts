// Lightweight per-session conversation health tracker.
// Non-invasive: writes to sessionStorage + window.__voiceHealth so the admin
// dashboard (/admin/voice-health) can render live metrics without touching
// existing voice logic.

export type VoiceHealthEvent = {
  t: number; // ms since session start
  type:
    | "session_start"
    | "greeting_started"
    | "greeting_audible"
    | "greeting_blocked"
    | "turn_start"
    | "transcript"
    | "ai_request"
    | "ai_response"
    | "ai_error"
    | "tts_request"
    | "tts_audible"
    | "tts_failed"
    | "fallback"
    | "mic_denied"
    | "loop_iteration";
  note?: string;
  ms?: number; // duration for this event, if applicable
};

export type VoiceHealthSnapshot = {
  sessionId: string;
  startedAt: number;
  lastEventAt: number;
  turns: number;
  aiRequests: number;
  aiErrors: number;
  ttsRequests: number;
  ttsFailures: number;
  fallbacks: number;
  micDenials: number;
  loopIterations: number;
  greetingLatencyMs: number | null;
  latency: {
    micMsAvg: number | null;
    aiMsAvg: number | null;
    ttsMsAvg: number | null;
    micMsLast: number | null;
    aiMsLast: number | null;
    ttsMsLast: number | null;
  };
  loopContinuityPct: number; // 0..100: iterations without fallback/error
  events: VoiceHealthEvent[];
};

const STORAGE_KEY = "tfc.voice.health.v1";
const MAX_EVENTS = 200;

function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

let snapshot: VoiceHealthSnapshot | null = null;

function load(): VoiceHealthSnapshot {
  if (snapshot) return snapshot;
  if (typeof sessionStorage !== "undefined") {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        snapshot = JSON.parse(raw) as VoiceHealthSnapshot;
        return snapshot;
      }
    } catch {}
  }
  snapshot = fresh();
  persist();
  return snapshot;
}

function fresh(): VoiceHealthSnapshot {
  const now = Date.now();
  return {
    sessionId: newSessionId(),
    startedAt: now,
    lastEventAt: now,
    turns: 0,
    aiRequests: 0,
    aiErrors: 0,
    ttsRequests: 0,
    ttsFailures: 0,
    fallbacks: 0,
    micDenials: 0,
    loopIterations: 0,
    greetingLatencyMs: null,
    latency: {
      micMsAvg: null, aiMsAvg: null, ttsMsAvg: null,
      micMsLast: null, aiMsLast: null, ttsMsLast: null,
    },
    loopContinuityPct: 100,
    events: [{ t: 0, type: "session_start" }],
  };
}

function persist() {
  if (!snapshot) return;
  if (typeof window !== "undefined") {
    (window as Window & { __voiceHealth?: VoiceHealthSnapshot }).__voiceHealth = snapshot;
  }
  if (typeof sessionStorage !== "undefined") {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
  }
}

function rollingAvg(prev: number | null, next: number, weight = 0.3): number {
  if (prev == null) return next;
  return Math.round(prev * (1 - weight) + next * weight);
}

function recomputeContinuity(s: VoiceHealthSnapshot) {
  const total = Math.max(1, s.loopIterations);
  const bad = s.fallbacks + s.ttsFailures + s.aiErrors + s.micDenials;
  s.loopContinuityPct = Math.max(0, Math.min(100, Math.round(((total - bad) / total) * 100)));
}

export function recordVoiceHealth(type: VoiceHealthEvent["type"], detail?: { ms?: number; note?: string }) {
  if (typeof window === "undefined") return;
  const s = load();
  const now = Date.now();
  const evt: VoiceHealthEvent = { t: now - s.startedAt, type, ms: detail?.ms, note: detail?.note };
  s.events.push(evt);
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
  s.lastEventAt = now;

  switch (type) {
    case "greeting_audible":
      if (s.greetingLatencyMs == null && detail?.ms != null) s.greetingLatencyMs = detail.ms;
      break;
    case "turn_start":
      s.turns += 1;
      break;
    case "transcript":
      if (detail?.ms != null) {
        s.latency.micMsLast = detail.ms;
        s.latency.micMsAvg = rollingAvg(s.latency.micMsAvg, detail.ms);
      }
      break;
    case "ai_request":
      s.aiRequests += 1;
      break;
    case "ai_response":
      if (detail?.ms != null) {
        s.latency.aiMsLast = detail.ms;
        s.latency.aiMsAvg = rollingAvg(s.latency.aiMsAvg, detail.ms);
      }
      break;
    case "ai_error":
      s.aiErrors += 1;
      break;
    case "tts_request":
      s.ttsRequests += 1;
      break;
    case "tts_audible":
      if (detail?.ms != null) {
        s.latency.ttsMsLast = detail.ms;
        s.latency.ttsMsAvg = rollingAvg(s.latency.ttsMsAvg, detail.ms);
      }
      break;
    case "tts_failed":
      s.ttsFailures += 1;
      break;
    case "fallback":
      s.fallbacks += 1;
      break;
    case "mic_denied":
      s.micDenials += 1;
      break;
    case "loop_iteration":
      s.loopIterations += 1;
      break;
  }
  recomputeContinuity(s);
  persist();
  try {
    console.info(`[voice-health] ${type}`, {
      ms: detail?.ms,
      note: detail?.note,
      turns: s.turns,
      continuity: `${s.loopContinuityPct}%`,
    });
  } catch {}
}

export function getVoiceHealth(): VoiceHealthSnapshot {
  return load();
}

export function resetVoiceHealth() {
  snapshot = fresh();
  persist();
}
