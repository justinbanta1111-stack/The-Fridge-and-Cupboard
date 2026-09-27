import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getVoiceHealth, resetVoiceHealth, type VoiceHealthSnapshot } from "@/lib/voice-health";

export const Route = createFileRoute("/admin/voice-health")({
  component: VoiceHealthDashboard,
  head: () => ({
    meta: [
      { title: "Voice Health — The Fridge & Cupboard" },
      { name: "description", content: "Per-session voice conversation health dashboard." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function fmtMs(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v} ms`;
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function VoiceHealthDashboard() {
  const [snap, setSnap] = useState<VoiceHealthSnapshot | null>(null);

  useEffect(() => {
    const tick = () => setSnap({ ...getVoiceHealth() });
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!snap) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-muted-foreground">Loading voice health…</p>
      </div>
    );
  }

  const sessionAgeSec = Math.round((Date.now() - snap.startedAt) / 1000);
  const idleSec = Math.round((Date.now() - snap.lastEventAt) / 1000);
  const continuityColor =
    snap.loopContinuityPct >= 90
      ? "text-emerald-500"
      : snap.loopContinuityPct >= 70
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Voice Conversation Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live metrics for the current browser session. Session <code>{snap.sessionId}</code> · started {sessionAgeSec}s ago · last event {idleSec}s ago.
          </p>
        </div>
        <button
          onClick={() => {
            resetVoiceHealth();
            setSnap({ ...getVoiceHealth() });
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          Reset session
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Turns" value={snap.turns} hint="user → assistant exchanges" />
        <Stat
          label="Loop continuity"
          value={<span className={continuityColor}>{snap.loopContinuityPct}%</span> as unknown as string}
          hint={`${snap.loopIterations} iterations, ${snap.fallbacks + snap.ttsFailures + snap.aiErrors + snap.micDenials} degraded`}
        />
        <Stat label="Greeting latency" value={fmtMs(snap.greetingLatencyMs)} hint="open → first audible word" />
        <Stat label="Fallbacks" value={snap.fallbacks} hint="tap-to-enable / desktop skip" />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Mic latency (last / avg)" value={`${fmtMs(snap.latency.micMsLast)} / ${fmtMs(snap.latency.micMsAvg)}`} />
        <Stat label="AI reply (last / avg)" value={`${fmtMs(snap.latency.aiMsLast)} / ${fmtMs(snap.latency.aiMsAvg)}`} />
        <Stat label="TTS first-audible (last / avg)" value={`${fmtMs(snap.latency.ttsMsLast)} / ${fmtMs(snap.latency.ttsMsAvg)}`} />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="AI requests" value={snap.aiRequests} />
        <Stat label="AI errors" value={snap.aiErrors} />
        <Stat label="TTS requests" value={snap.ttsRequests} />
        <Stat label="TTS failures" value={snap.ttsFailures} />
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          Recent events ({snap.events.length})
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2">t+ms</th>
                <th className="px-4 py-2">event</th>
                <th className="px-4 py-2">ms</th>
                <th className="px-4 py-2">note</th>
              </tr>
            </thead>
            <tbody>
              {[...snap.events].reverse().map((e, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-4 py-1.5 font-mono">{e.t}</td>
                  <td className="px-4 py-1.5">{e.type}</td>
                  <td className="px-4 py-1.5 font-mono">{e.ms ?? ""}</td>
                  <td className="px-4 py-1.5 text-muted-foreground">{e.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Data lives in this browser's sessionStorage under <code>tfc.voice.health.v1</code> and
        <code> window.__voiceHealth</code>. Refreshing preserves the session; "Reset session" starts a new one.
      </p>
    </div>
  );
}
