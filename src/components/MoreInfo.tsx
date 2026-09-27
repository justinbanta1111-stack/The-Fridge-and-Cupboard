import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Presentation-only disclosure: keeps secondary content off the first screen
 * so the page reads BIG • CLEAN • SIMPLE, without removing any feature.
 */
export function MoreInfo({
  label = "More Info",
  hideLabel = "Show Less",
  children,
  className = "",
}: {
  label?: string;
  hideLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-6 flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-4 text-lg font-bold text-foreground transition-colors hover:border-primary/60 hover:bg-secondary"
      >
        {open ? hideLabel : label}
        <ChevronDown
          className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

export default MoreInfo;
