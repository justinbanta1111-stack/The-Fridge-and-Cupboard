/**
 * Decorative floating food emojis behind hero content.
 * Pointer-events: none, hidden from screen readers.
 */
const ITEMS = [
  { emoji: "🥕", top: "8%",  left: "6%",  delay: "0s",   cls: "tfc-float" },
  { emoji: "🍅", top: "14%", left: "82%", delay: "1.2s", cls: "tfc-float-slow" },
  { emoji: "🥦", top: "62%", left: "4%",  delay: "0.6s", cls: "tfc-float-slow" },
  { emoji: "🧄", top: "70%", left: "88%", delay: "2.1s", cls: "tfc-float" },
  { emoji: "🍋", top: "38%", left: "92%", delay: "0.3s", cls: "tfc-float" },
  { emoji: "🌶️", top: "84%", left: "20%", delay: "1.6s", cls: "tfc-float-slow" },
  { emoji: "🥚", top: "30%", left: "2%",  delay: "2.4s", cls: "tfc-float" },
  { emoji: "🧀", top: "88%", left: "70%", delay: "0.9s", cls: "tfc-float-slow" },
];

export function FloatingIngredients({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {ITEMS.map((it, i) => (
        <span
          key={i}
          className={`absolute text-2xl opacity-40 sm:text-3xl sm:opacity-50 ${it.cls}`}
          style={{ top: it.top, left: it.left, animationDelay: it.delay }}
        >
          {it.emoji}
        </span>
      ))}
    </div>
  );
}
