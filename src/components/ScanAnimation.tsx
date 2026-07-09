import { useEffect, useState } from "react";

const DETECTED_ITEMS = [
  { label: "Milk found", emoji: "🥛", top: "18%", left: "22%" },
  { label: "Eggs found", emoji: "🥚", top: "34%", left: "62%" },
  { label: "Spinach found", emoji: "🥬", top: "52%", left: "28%" },
  { label: "Cheese found", emoji: "🧀", top: "44%", left: "72%" },
  { label: "Leftover chicken found", emoji: "🍗", top: "70%", left: "40%" },
  { label: "Tomato found", emoji: "🍅", top: "62%", left: "78%" },
];

const PHRASES = [
  "Warming up the scanner…",
  "Analyzing ingredients…",
  "Spotting leftovers…",
  "Checking freshness…",
  "Pairing pantry items…",
  "Plating tonight's possibilities…",
];

export function ScanAnimation() {
  const [progress, setProgress] = useState(4);
  const [revealed, setRevealed] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const p = setInterval(() => {
      setProgress((v) => (v >= 95 ? 95 : v + Math.max(1, Math.round((100 - v) * 0.06))));
    }, 350);
    const r = setInterval(() => {
      setRevealed((v) => (v >= DETECTED_ITEMS.length ? v : v + 1));
    }, 700);
    const ph = setInterval(() => {
      setPhraseIdx((v) => (v + 1) % PHRASES.length);
    }, 1800);
    return () => {
      clearInterval(p);
      clearInterval(r);
      clearInterval(ph);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Scan tint */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(80,200,255,0.18),rgba(0,0,0,0.55))]" />

      {/* Sweeping beam */}
      <div
        className="pointer-events-none absolute inset-x-0 h-24 -translate-y-12"
        style={{
          background:
            "linear-gradient(to bottom, rgba(120,220,255,0) 0%, rgba(140,230,255,0.55) 45%, rgba(255,255,255,0.85) 50%, rgba(140,230,255,0.55) 55%, rgba(120,220,255,0) 100%)",
          boxShadow: "0 0 32px 8px rgba(140,220,255,0.55)",
          animation: "scan-beam-sweep 2.4s ease-in-out infinite",
        }}
      />

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen"
        style={{
          backgroundImage:
            "linear-gradient(rgba(140,220,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(140,220,255,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Detected labels */}
      {DETECTED_ITEMS.slice(0, revealed).map((it, i) => (
        <div
          key={it.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ top: it.top, left: it.left, animation: "scan-pop 0.5s ease-out both" }}
        >
          <div className="relative">
            <div className="absolute -inset-3 rounded-full border-2 border-cyan-300/80 animate-ping" />
            <div className="relative flex items-center gap-1.5 rounded-full border border-cyan-300/70 bg-black/70 px-2.5 py-1 text-xs font-semibold text-cyan-50 shadow-lg backdrop-blur">
              <span className="text-sm">{it.emoji}</span>
              <span>{it.label}</span>
            </div>
          </div>
          <span className="sr-only">{i + 1}</span>
        </div>
      ))}

      {/* Bottom HUD */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="rounded-xl border border-cyan-300/30 bg-black/60 p-3 text-cyan-50 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
              {PHRASES[phraseIdx]}
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-cyan-100/80">
            {revealed > 0 ? `${revealed} ingredient${revealed === 1 ? "" : "s"} detected so far…` : "Scanning shelves…"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-beam-sweep {
          0% { transform: translateY(-15%); opacity: 0.0; }
          10% { opacity: 1; }
          50% { transform: translateY(95%); opacity: 1; }
          60% { opacity: 0; }
          100% { transform: translateY(-15%); opacity: 0; }
        }
        @keyframes scan-pop {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          60% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ScanAnimation;
