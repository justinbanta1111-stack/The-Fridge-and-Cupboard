import type { ReactNode } from "react";

/**
 * Wraps a child element with a soft pulsing ring to flag expiring items.
 * Only pulses when `active`, otherwise renders inline.
 */
export function PulseExpiring({
  active = true,
  children,
  className = "",
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block ${active ? "tfc-pulse-expire" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
