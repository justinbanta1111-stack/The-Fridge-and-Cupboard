import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  /** Number of decimal places. */
  decimals?: number;
  className?: string;
};

/**
 * Tween a number from 0 -> value with an ease-out curve.
 * Respects prefers-reduced-motion (jumps to final value).
 */
export function AnimatedCounter({
  value,
  durationMs = 1200,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: Props) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced || durationMs <= 0) {
      setDisplay(value);
      return;
    }
    startRef.current = null;
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
