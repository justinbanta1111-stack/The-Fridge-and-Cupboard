import { useEffect, useState } from "react";
import { isVoiceSpeaking } from "@/lib/voice-assistant";
import { isMicActive } from "@/lib/mic-activity";

export type VoiceRuntimeState = "idle" | "listening" | "responding";

/**
 * Internal listening-state debug indicator.
 *
 * Purely observational: it reads the existing mic-activity and voice-playback
 * signals, so it cannot affect the voice loop. It always logs transitions to
 * the console and exposes `window.__tfcVoiceState` / `window.__tfcVoiceStateLog`.
 * A tiny non-interactive dot is rendered ONLY in debug mode
 * (`?voiceDebug=1` or `localStorage.tfc_voice_debug = "1"`).
 */
export function VoiceStateIndicator() {
  const [state, setState] = useState<VoiceRuntimeState>("idle");
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    try {
      const param = new URL(window.location.href).searchParams.get("voiceDebug");
      const stored = localStorage.getItem("tfc_voice_debug");
      setDebug(param === "1" || stored === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let current: VoiceRuntimeState = "idle";
    const w = window as any;
    w.__tfcVoiceStateLog = w.__tfcVoiceStateLog ?? [];

    const read = (): VoiceRuntimeState => {
      // User speech always wins: while the mic is capturing we are listening.
      if (isMicActive()) return "listening";
      if (isVoiceSpeaking()) return "responding";
      return "idle";
    };

    const poll = () => {
      const next = read();
      if (next === current) return;
      current = next;
      w.__tfcVoiceState = next;
      const entry = { state: next, at: new Date().toISOString() };
      w.__tfcVoiceStateLog.push(entry);
      if (w.__tfcVoiceStateLog.length > 100) w.__tfcVoiceStateLog.shift();
      try {
        console.info(`[voice-state] ${next}`, entry);
      } catch {
        /* ignore */
      }
      setState(next);
    };

    poll();
    const timer = window.setInterval(poll, 200);
    return () => window.clearInterval(timer);
  }, []);

  if (!debug) return null;

  const color =
    state === "listening" ? "bg-emerald-400" : state === "responding" ? "bg-amber-400" : "bg-white/30";

  return (
    <div
      aria-hidden
      data-voice-state={state}
      className="pointer-events-none fixed bottom-2 left-2 z-[200] flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm"
    >
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {state}
    </div>
  );
}
