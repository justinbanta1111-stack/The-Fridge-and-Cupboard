import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Brain, ArrowRight } from "lucide-react";

export function SmartInsightsStrip() {
  return (
    <Card className="ring-paper mt-4 border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-4">
      <Link to="/smart-insights" className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
          <Brain className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">Smart Insights</div>
          <div className="font-display text-lg leading-tight">Patterns, predictions & hidden potential</div>
          <div className="text-xs text-muted-foreground">Fridge personality score · meal forecast · missing-piece AI</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </Card>
  );
}
