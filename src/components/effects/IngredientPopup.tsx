/**
 * Pop-in chip showing recognized ingredients after a scan.
 * Each chip animates in sequentially.
 */
type Props = {
  items: string[];
  /** Max chips to render. Default 12. */
  limit?: number;
};

export function IngredientPopup({ items, limit = 12 }: Props) {
  const shown = items.slice(0, limit);
  if (!shown.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((label, i) => (
        <span
          key={`${label}-${i}`}
          className="tfc-ingredient-popup inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-success/30"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {label}
        </span>
      ))}
    </div>
  );
}
