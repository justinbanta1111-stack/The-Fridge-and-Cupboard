import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Heart, ArrowRight } from "lucide-react";

export function LifeModeStrip() {
  return (
    <Card className="ring-paper mt-4 border-border/60 bg-gradient-to-br from-rose-500/10 via-card to-card p-4">
      <Link to="/life-mode" className="flex items-center gap-3">
        <div className="rounded-xl bg-rose-500/15 p-2.5 text-rose-500">
          <Heart className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">Life Mode</div>
          <div className="font-display text-lg leading-tight">Cook around your day</div>
          <div className="text-xs text-muted-foreground">Busy · broke · sick · date night · comfort · emergency food</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </Card>
  );
}
