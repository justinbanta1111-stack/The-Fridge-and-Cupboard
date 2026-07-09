import { Link } from "@tanstack/react-router";
import { Mic, ChefHat } from "lucide-react";

/**
 * Subtle homepage strip pointing to the optional Chef Super J voice
 * companion. Designed to be visible but not overpower the main
 * "Use what you already have" message.
 */
export function ChefCompanionStrip() {
  return (
    <section className="mt-4">
      <Link
        to="/chef-companion"
        className="group flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-primary/8 via-accent/8 to-background p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.6_0.2_30)] to-[oklch(0.5_0.2_290)] text-white shadow-md">
          <Mic className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <ChefHat className="h-4 w-4 text-primary" /> Talk to Chef Super J
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            Optional voice companion. Ask "what can I make?" or "I need food fast" — hands-free.
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline">
          Try it
        </span>
      </Link>
    </section>
  );
}
