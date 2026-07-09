import { Link } from "@tanstack/react-router";
import { Users, ArrowRight } from "lucide-react";

export function SocialHubStrip() {
  return (
    <Link
      to="/social-hub"
      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-fuchsia-500/10 via-rose-400/10 to-sky-400/10 p-3 shadow-sm transition hover:shadow"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-background p-2 text-fuchsia-600 shadow-sm">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Community & Social</div>
          <div className="truncate text-xs text-muted-foreground">Wall · Wins · Challenges · Swap · Groups · Leaderboard · Sponsor</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}
