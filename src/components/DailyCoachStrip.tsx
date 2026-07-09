import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Target, ArrowRight } from "lucide-react";
import { getTodayCheckIn, missionFor } from "@/lib/daily-coach";
import { useEffect, useState } from "react";

export function DailyCoachStrip() {
  const [checkin, setCheckin] = useState(getTodayCheckIn());
  useEffect(() => {
    const h = () => setCheckin(getTodayCheckIn());
    window.addEventListener("fnc:coach-updated", h);
    return () => window.removeEventListener("fnc:coach-updated", h);
  }, []);
  const m = missionFor(checkin);
  return (
    <Card className="ring-paper mt-4 border-border/60 bg-gradient-to-br from-accent/10 via-card to-card p-4">
      <Link to="/daily-coach" className="flex items-center gap-3">
        <div className="rounded-xl bg-accent/15 p-2.5 text-accent">
          <Target className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">Daily Coach</div>
          <div className="font-display text-lg leading-tight">
            {checkin ? `Today's mission: ${m.title}` : "Check in with your coach"}
          </div>
          <div className="text-xs text-muted-foreground">
            {checkin?.missionDone ? "Mission complete — nice." : "Goal, mission, wins, weekly report, AI tips"}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </Card>
  );
}
