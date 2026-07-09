/**
 * Tiny steam puffs rising from the top of a recipe card.
 * Place inside a `relative` parent.
 */
export function Steam({ count = 3 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="tfc-steam block h-3 w-3 rounded-full bg-white/70 blur-[2px]"
          style={{ animationDelay: `${i * 0.5}s` }}
        />
      ))}
    </div>
  );
}

/** Faint shimmer to suggest a sizzling pan. */
export function Sizzle({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`tfc-sizzle inline-block ${className}`}
    >
      ✨
    </span>
  );
}
