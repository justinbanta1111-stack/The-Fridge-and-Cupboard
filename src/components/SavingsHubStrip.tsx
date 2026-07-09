import { Link } from "@tanstack/react-router";
import { TrendingUp, ArrowRight } from "lucide-react";

export function SavingsHubStrip() {
  return (
    <Link
      to="/savings-hub"
      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-emerald-500/10 via-sky-400/10 to-amber-400/10 p-3 shadow-sm transition hover:shadow"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-background p-2 text-emerald-600 shadow-sm">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Savings Hub</div>
          <div className="truncate text-xs text-muted-foreground">Waste · Leftovers · Freezer · Defense · Streaks · Budget</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}
