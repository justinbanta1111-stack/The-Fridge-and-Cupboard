import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import {
  CHALLENGES,
  WEEKLY_CHALLENGES_EVENT,
  bumpChallenge,
  readProgress,
  resetChallenge,
} from "@/lib/weekly-challenges";

export function WeeklyChallenges() {
  const [progress, setProgress] = useState(() => readProgress());

  useEffect(() => {
    const refresh = () => setProgress(readProgress());
    refresh();
    window.addEventListener(WEEKLY_CHALLENGES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WEEKLY_CHALLENGES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const completedCount = Object.values(progress.completed).filter(Boolean).length;

  return (
    <Card className="ring-paper border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-card to-primary/5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-700">
          <Trophy className="h-3.5 w-3.5" /> Weekly Challenges
        </div>
        <span className="text-[11px] text-muted-foreground">
          {completedCount}/{CHALLENGES.length} done this week
        </span>
      </div>
      <h3 className="mt-1 font-display text-xl">Pick a challenge. Stretch what you have.</h3>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {CHALLENGES.map((c) => {
          const v = progress.values[c.id] ?? 0;
          const done = !!progress.completed[c.id];
          const pct = Math.min(100, Math.round((v / c.goal) * 100));
          return (
            <div key={c.id} className="rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-base leading-tight">
                    <span className="mr-1">{c.emoji}</span>
                    {c.title}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                </div>
                {done && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                    <Check className="mr-1 h-3 w-3" /> Done
                  </Badge>
                )}
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {v}/{c.goal} · {c.reward}
                </span>
                <div className="flex items-center gap-1">
                  {!done && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => {
                        const next = bumpChallenge(c.id);
                        if (next.completed[c.id]) toast.success(`Earned ${c.reward}!`);
                        else toast.success("Nice — keep going!");
                      }}
                    >
                      <Check className="h-3 w-3" /> Did it
                    </Button>
                  )}
                  {v > 0 && (
                    <button
                      aria-label="Reset"
                      onClick={() => resetChallenge(c.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted/50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Resets every Monday. Tap "Did it" each time you complete a step — Chef Super J will cheer you on.
      </p>
    </Card>
  );
}
