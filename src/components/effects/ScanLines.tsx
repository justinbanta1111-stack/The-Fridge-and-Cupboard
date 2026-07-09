/**
 * AI scanning overlay — animated horizontal beam + corner brackets.
 * Place inside a `relative` parent. Pointer-events: none.
 */
export function ScanLines({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {/* Beam */}
      <div className="tfc-scan-line absolute inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_2px_oklch(0.7_0.2_150/0.6)]" />
      {/* Subtle grid wash */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,oklch(0.7_0.2_150/0.18)_95%)] bg-[length:100%_18px] opacity-50" />
      {/* Corner brackets */}
      {[
        "top-2 left-2 border-l-2 border-t-2",
        "top-2 right-2 border-r-2 border-t-2",
        "bottom-2 left-2 border-l-2 border-b-2",
        "bottom-2 right-2 border-r-2 border-b-2",
      ].map((cls, i) => (
        <span
          key={i}
          className={`absolute h-4 w-4 rounded-sm border-primary/80 ${cls}`}
        />
      ))}
    </div>
  );
}
