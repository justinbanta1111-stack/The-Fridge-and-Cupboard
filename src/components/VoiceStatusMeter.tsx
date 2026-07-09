import { useEffect, useState } from "react";

/**
 * Small floating diagnostic overlay for the voice pipeline.
 *
 * Listens to `tfc:voice-meter` window events dispatched from VoiceGreeting
 * and shows:
 *   - current phase (idle / listening / thinking / speaking)
 *   - how long the last mic capture took
 *   - how long Chef took to think (LLM round-trip)
 *   - how long until audio playback started (TTS + first byte on iOS)
 *
 * Toggle by adding `?meter=1` to the URL, or by setting
 * `localStorage.tfc_voice_meter = "1"`. Off by default so it never ships
 * to real users unless requested.
 */
export type VoiceMeterPhase = "idle" | "listening" | "thinking" | "speaking";

export type VoiceMeterEvent = {
  phase: VoiceMeterPhase;
  /** ms since phase started (populated on transition out) */
  ms?: number;
  note?: string;
};

export function emitVoiceMeter(detail: VoiceMeterEvent) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("tfc:voice-meter", { detail }));
  } catch {}
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("meter") === "1") return true;
    if (url.searchParams.get("meter") === "0") return false;
    return localStorage.getItem("tfc_voice_meter") === "1";
  } catch {
    return false;
  }
}

const PHASE_STYLE: Record<VoiceMeterPhase, { label: string; dot: string; bg: string }> = {
  idle:      { label: "Idle",      dot: "bg-neutral-400", bg: "bg-neutral-900/85" },
  listening: { label: "Listening", dot: "bg-emerald-400 animate-pulse", bg: "bg-emerald-950/85" },
  thinking:  { label: "Thinking",  dot: "bg-amber-400 animate-pulse",   bg: "bg-amber-950/85" },
  speaking:  { label: "Speaking",  dot: "bg-sky-400 animate-pulse",     bg: "bg-sky-950/85" },
};

export function VoiceStatusMeter() {
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState<VoiceMeterPhase>("idle");
  const [timings, setTimings] = useState<{
    listenMs?: number;
    thinkMs?: number;
    speakStartMs?: number;
    note?: string;
  }>({});
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setEnabled(isEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent<VoiceMeterEvent>).detail;
      if (!d) return;
      setPhase(d.phase);
      setTimings((prev) => {
        const next = { ...prev, note: d.note };
        if (d.ms == null) return next;
        if (d.phase === "thinking") next.listenMs = d.ms;   // ms was time spent listening
        if (d.phase === "speaking") next.thinkMs = d.ms;    // ms was time spent thinking
        if (d.phase === "listening") next.speakStartMs = d.ms; // ms was speaking duration
        return next;
      });
    };
    window.addEventListener("tfc:voice-meter", onEvt);
    return () => window.removeEventListener("tfc:voice-meter", onEvt);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    setElapsed(0);
    const start = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - start), 100);
    return () => window.clearInterval(id);
  }, [phase, enabled]);

  if (!enabled) return null;
  const s = PHASE_STYLE[phase];

  const fmt = (ms?: number) => (ms == null ? "–" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`);

  return (
    <div className={`fixed bottom-3 left-3 z-[300] rounded-2xl ${s.bg} px-3 py-2 font-mono text-[11px] leading-tight text-white shadow-xl ring-1 ring-white/15 backdrop-blur-sm`}>
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
        <span className="font-bold uppercase tracking-wider">{s.label}</span>
        <span className="tabular-nums opacity-70">{fmt(elapsed)}</span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-x-2 opacity-90">
        <span>mic {fmt(timings.listenMs)}</span>
        <span>think {fmt(timings.thinkMs)}</span>
        <span>play {fmt(timings.speakStartMs)}</span>
      </div>
      {timings.note && <div className="mt-0.5 max-w-[220px] truncate text-[10px] opacity-70">{timings.note}</div>}
    </div>
  );
}
