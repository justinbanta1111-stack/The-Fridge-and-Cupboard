import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { BookHeart, ArrowRight } from "lucide-react";

export function FamilyLegacyStrip() {
  return (
    <Card className="ring-paper border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-card to-amber-500/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-rose-600">
            <BookHeart className="h-3.5 w-3.5" /> Family / Legacy
          </div>
          <h3 className="mt-1 font-display text-lg leading-tight">
            Save Grandma's recipes. Pass them down.
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cookbook, holiday vault, memory meals, voice notes, and one-tap pass-it-down.
          </p>
        </div>
        <Link
          to="/family-legacy"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/15"
        >
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
