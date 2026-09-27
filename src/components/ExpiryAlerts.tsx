import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { friendlyWindow, getExpiringSoon, statusOf, type ExpiryItem } from "@/lib/expiry";

/**
 * Gentle reminder strip for food that's going past its best.
 * Renders nothing when there's nothing to nudge about.
 */
export function ExpiryAlerts({ className }: { className?: string }) {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setItems(getExpiringSoon());
  }, []);

  if (hidden || items.length === 0) return null;

  return (
    <Card className={cn("border-primary/30 p-4", className)}>
      <div className="flex items-start gap-3">
        <Clock className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight">A gentle reminder</p>
          <p className="text-sm text-muted-foreground">
            {items.length === 1
              ? "One thing in your kitchen wants using soon."
              : `${items.length} things in your kitchen want using soon.`}
          </p>
          <ul className="mt-3 space-y-1.5">
            {items.slice(0, 4).map((i) => {
              const status = statusOf(i.bestBy);
              return (
                <li key={i.id} className="flex items-baseline justify-between gap-3 text-base">
                  <span className="truncate font-semibold">{i.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-sm",
                      status === "past" || status === "today"
                        ? "font-semibold text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {friendlyWindow(i.bestBy)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" className="font-bold">
              <Link to="/expiry">See all & adjust dates</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/leftovers">Cook these first</Link>
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss reminder"
          onClick={() => setHidden(true)}
        >
          <X className="h-5 w-5" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}
