import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";

export function FunModeStrip() {
  return (
    <Link
      to="/fun-mode"
      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-fuchsia-500/10 via-amber-400/10 to-emerald-500/10 p-3 shadow-sm transition hover:shadow"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-background p-2 text-fuchsia-600 shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Fun & Creative Mode</div>
          <div className="truncate text-xs text-muted-foreground">3-Ways · Mystery · Kid Saver · Cravings · Remix · Surprise Me</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}
