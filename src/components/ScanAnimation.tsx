import { useEffect, useState } from "react";

type Scene = "fridge" | "pantry" | string;

const FRIDGE_ITEMS = [
  { label: "Fresh greens", emoji: "🥬", top: "30%", left: "50%" },
  { label: "Eggs", emoji: "🥚", top: "50%", left: "50%" },
  { label: "Leftover chicken", emoji: "🍗", top: "70%", left: "50%" },
];

const PANTRY_ITEMS = [
  { label: "Canned tomatoes", emoji: "🥫", top: "30%", left: "50%" },
  { label: "Pasta", emoji: "🍝", top: "50%", left: "50%" },
  { label: "Spices", emoji: "🧂", top: "70%", left: "50%" },
];

const PHRASES = [
  "Warming up the scanner…",
  "Analyzing ingredients…",
  "Spotting leftovers…",
  "Checking freshness…",
  "Pairing pantry items…",
  "Plating tonight's possibilities…",
];

export function ScanAnimation({ storage }: { storage?: Scene } = {}) {
  const items = storage === "pantry" ? PANTRY_ITEMS : FRIDGE_ITEMS;
  const [progress, setProgress] = useState(4);
  const [revealed, setRevealed] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const p = setInterval(() => {
      setProgress((v) => (v >= 95 ? 95 : v + Math.max(1, Math.round((100 - v) * 0.06))));
    }, 350);
    const r = setInterval(() => {
      setRevealed((v) => (v >= items.length ? v : v + 1));
    }, 700);
    const ph = setInterval(() => {
      setPhraseIdx((v) => (v + 1) % PHRASES.length);
    }, 1800);
    return () => {
      clearInterval(p);
      clearInterval(r);
      clearInterval(ph);
    };
  }, [items.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Warm interior light — soft, realistic, no sci-fi tint */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,244,225,0.14),rgba(0,0,0,0.55))]" />

      {/* Gentle light sweep — single GPU-friendly transform layer */}
      <div
        className="pointer-events-none absolute inset-x-0 h-40 -translate-y-20"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,250,238,0.22) 50%, rgba(255,255,255,0) 100%)",
          animation: "scan-beam-sweep 3.2s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* Detected items — few, large, cleanly stacked inside the scene */}
      {items.slice(0, revealed).map((it) => (
        <div
          key={it.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ top: it.top, left: it.left, animation: "scan-pop 0.5s ease-out both" }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-black/65 px-5 py-3 shadow-lg">
            <span className="text-4xl leading-none">{it.emoji}</span>
            <span className="text-base font-semibold text-white">{it.label}</span>
          </div>
        </div>
      ))}


      {/* Bottom HUD */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="rounded-xl border border-white/15 bg-black/55 p-3 text-white backdrop-blur">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/80" />
              {PHRASES[phraseIdx]}
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-200 via-white to-emerald-200 transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-white/70">
            {revealed > 0 ? `${revealed} ingredient${revealed === 1 ? "" : "s"} detected so far…` : "Looking inside…"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-beam-sweep {
          0% { transform: translateY(-15%); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateY(95%); opacity: 1; }
          65% { opacity: 0; }
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
