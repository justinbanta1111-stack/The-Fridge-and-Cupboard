import type { ReactNode } from "react";
import { ChefAvatar } from "@/components/ChefAvatar";

/**
 * Animated Chef Super J suggestion bubble.
 * Use to surface a contextual tip that pops in with a friendly spring.
 */
export function ChefPopIn({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`tfc-chef-pop relative flex items-start gap-2 rounded-2xl bg-gradient-to-br from-accent/15 to-primary/10 p-3 ring-1 ring-accent/30 shadow-sm ${className}`}
      role="status"
    >
      <ChefAvatar className="h-9 w-9 shrink-0" />
      <div className="text-sm text-foreground/90">
        <span className="mr-1 font-bold text-primary">Chef Super J:</span>
        {children}
      </div>
    </div>
  );
}
