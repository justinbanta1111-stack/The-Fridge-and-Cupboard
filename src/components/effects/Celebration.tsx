import { useEffect, useState } from "react";

type Burst = { id: number; x: number; y: number };

/**
 * Global celebration listener. Mount once near the app root.
 * Trigger via:
 *   window.dispatchEvent(new CustomEvent("tfc:celebrate", { detail: { x, y } }))
 * If x/y are omitted, the burst centers on the viewport.
 */
export function Celebration() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const handler = (e: Event) => {
      if (reduced) return;
      const ce = e as CustomEvent<{ x?: number; y?: number }>;
      const x = ce.detail?.x ?? window.innerWidth / 2;
      const y = ce.detail?.y ?? window.innerHeight / 3;
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, x, y }]);
      window.setTimeout(() => {
        setBursts((b) => b.filter((bb) => bb.id !== id));
      }, 1500);
    };

    window.addEventListener("tfc:celebrate", handler);
    return () => window.removeEventListener("tfc:celebrate", handler);
  }, []);

  if (!bursts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {bursts.map((b) => (
        <ConfettiBurst key={b.id} x={b.x} y={b.y} />
      ))}
    </div>
  );
}

const COLORS = [
  "oklch(0.78 0.18 145)", // green
  "oklch(0.78 0.18 75)",  // yellow
  "oklch(0.65 0.22 30)",  // orange
  "oklch(0.7 0.18 250)",  // blue
  "oklch(0.72 0.2 340)",  // pink
];

function ConfettiBurst({ x, y }: { x: number; y: number }) {
  const pieces = Array.from({ length: 24 }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
    const dist = 80 + Math.random() * 120;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist + 60, // bias slightly down (gravity-ish)
      rot: (Math.random() - 0.5) * 720,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
    };
  });
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="tfc-confetti absolute block rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            // CSS custom properties consumed by the @keyframes
            ["--dx" as never]: `${p.dx}px`,
            ["--dy" as never]: `${p.dy}px`,
            ["--rot" as never]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

/** Helper for callers: dispatch a celebration. Safe in SSR. */
export function celebrate(event?: { clientX: number; clientY: number }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("tfc:celebrate", {
      detail: event
        ? { x: event.clientX, y: event.clientY }
        : undefined,
    }),
  );
}
