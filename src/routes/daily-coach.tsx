import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { cn } from "@/lib/utils";
import {
  DAILY_GOALS, type DailyGoal,
  getTodayCheckIn, saveCheckIn, missionFor, completeMission,
  todaysWins, weeklyReport, saveEndOfDay, getTodayEod,
  startPantryChallenge, endPantryChallenge, pantryChallengeProgress, addWin,
} from "@/lib/daily-coach";
import { getIngredientStats } from "@/lib/savings-hub";
import { getRecentInventory } from "@/lib/savings.functions";
import { coachAdvice } from "@/lib/daily-coach.functions";
import {
  ArrowLeft, CheckCircle2, Target, Trophy, BarChart3, Sparkles,
  Flame, BookOpen, Loader2, ClipboardCheck,
} from "lucide-react";

export const Route = createFileRoute("/daily-coach")({
  head: () => ({
    meta: [
      { title: "Daily Coach — The Fridge and Cupboard" },
      { name: "description", content: "Smart Kitchen Coach: daily check-in, mission, wins, weekly report, and personalized improvement tips." },
    ],
  }),
  component: DailyCoachPage,
});

function DailyCoachPage() {
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("fnc:coach-updated", h);
    return () => window.removeEventListener("fnc:coach-updated", h);
  }, []);

  const checkin = getTodayCheckIn();
  const mission = missionFor(checkin);
  const wins = todaysWins();
  const report = weeklyReport();
  const eod = getTodayEod();
  const challenge = pantryChallengeProgress();

  const getInventoryFn = useServerFn(getRecentInventory);
  const inventoryQ = useQuery({ queryKey: ["coach-inventory"], queryFn: () => getInventoryFn() });
  const inventory = inventoryQ.data?.items ?? [];

  const stats = useMemo(() => getIngredientStats(), []);

  const adviceFn = useServerFn(coachAdvice);
  const adviceMut = useMutation({
    mutationFn: () => adviceFn({ data: {
      goal: DAILY_GOALS.find((g) => g.id === checkin?.goal)?.label ?? "",
      mostUsed: stats.mostUsed.map((m) => m.name),
      mostWasted: stats.mostWasted.map((m) => m.name),
      recentItems: inventory,
      skill: "comfortable",
    } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Home</Link>
          </Button>
        </div>

        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">Daily Coach</div>
          <h1 className="mt-1 font-display text-3xl leading-tight md:text-4xl">Your kitchen coach for today.</h1>
          <p className="mt-2 text-muted-foreground">Encouraging. Helpful. Fast. Personal.</p>
        </div>

        {/* Check-in */}
        <Card className="ring-paper border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Target className="h-3 w-3" /> Daily Check-In
          </div>
          <div className="mt-1 font-display text-xl">What's your goal today?</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DAILY_GOALS.map((g) => {
              const active = checkin?.goal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { saveCheckIn(g.id as DailyGoal); refresh(); }}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/60 bg-background hover:border-primary/40 hover:bg-secondary",
                  )}
                >
                  <div className="text-xl">{g.emoji}</div>
                  <div className="mt-0.5 font-medium">{g.label}</div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Mission */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Flame className="h-3 w-3" /> Today's Mission
          </div>
          <div className="mt-1 font-display text-xl">{mission.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{mission.detail}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline">{mission.reward}</Badge>
            <Button
              size="sm"
              onClick={() => { completeMission(); refresh(); }}
              disabled={!checkin || !!checkin?.missionDone}
            >
              {checkin?.missionDone ? <><CheckCircle2 className="mr-1 h-4 w-4" /> Done</> : "Mark complete"}
            </Button>
          </div>
        </Card>

        {/* Wins */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Trophy className="h-3 w-3" /> Kitchen Wins Today
          </div>
          {wins.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No wins logged yet — small things count.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {wins.map((w, i) => <li key={i}>• {w.label}{w.amount ? ` ($${(w.amount/100).toFixed(2)})` : ""}</li>)}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { addWin({ kind: "leftover", label: "Saved a leftover" }); refresh(); }}>+ Leftover saved</Button>
            <Button size="sm" variant="outline" onClick={() => { addWin({ kind: "rescue", label: "Rescued an ingredient" }); refresh(); }}>+ Ingredient rescued</Button>
            <Button size="sm" variant="outline" onClick={() => { addWin({ kind: "meal", label: "Made a meal at home" }); refresh(); }}>+ Meal made</Button>
          </div>
        </Card>

        {/* Weekly Report */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <BarChart3 className="h-3 w-3" /> Weekly Kitchen Report
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Meals made" value={report.mealsMade} />
            <Stat label="Leftovers used" value={report.leftoversUsed} />
            <Stat label="Ingredients rescued" value={report.rescued} />
            <Stat label="Days spoiled" value={report.spoiled} />
          </div>
        </Card>

        {/* Pantry Challenge */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <ClipboardCheck className="h-3 w-3" /> Pantry Challenge
          </div>
          {challenge.active ? (
            <>
              <div className="mt-1 font-display text-lg">
                Day {challenge.days} of {challenge.target} — no shopping.
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${challenge.pct}%` }} />
              </div>
              <Button className="mt-3" variant="outline" size="sm" onClick={() => { endPantryChallenge(); refresh(); }}>
                End challenge
              </Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Go a few days using only what's in your kitchen.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => { startPantryChallenge(3); refresh(); }}>Start 3-day</Button>
                <Button size="sm" variant="outline" onClick={() => { startPantryChallenge(7); refresh(); }}>Start 7-day</Button>
              </div>
            </>
          )}
        </Card>

        {/* AI Coach */}
        <Card className="ring-paper mt-4 border-border/60 bg-gradient-to-br from-accent/10 via-card to-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> Coach me today
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Get smart improvement tips and beginner confidence tips based on your patterns.
          </p>
          <Button className="mt-3" onClick={() => adviceMut.mutate()} disabled={adviceMut.isPending}>
            {adviceMut.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking…</> : "Get today's coaching"}
          </Button>
          {adviceMut.data && (
            <div className="mt-4 space-y-3">
              <div className="font-display text-lg">{adviceMut.data.encouragement}</div>
              <Section icon={<BookOpen className="h-3 w-3" />} title="Improvement tips">
                {adviceMut.data.improvementTips.map((t, i) => <li key={i}>• {t}</li>)}
              </Section>
              <Section icon={<Sparkles className="h-3 w-3" />} title="Confidence builders">
                {adviceMut.data.confidenceTips.map((t, i) => <li key={i}>• {t}</li>)}
              </Section>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
                <span className="font-semibold">Try tonight: </span>{adviceMut.data.todaySuggestion}
              </div>
            </div>
          )}
          {adviceMut.error && (
            <div className="mt-2 text-sm text-destructive">{(adviceMut.error as Error).message}</div>
          )}
        </Card>

        {/* End of Day Review */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <CheckCircle2 className="h-3 w-3" /> End of Day Review
          </div>
          {eod ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Logged: {eod.cooked ? "cooked ✓" : "no cook"}, {eod.usedLeftovers ? "leftovers ✓" : "no leftovers"}, {eod.somethingSpoiled ? "something spoiled" : "no spoilage"}.
            </p>
          ) : (
            <EodForm onSave={(e) => { saveEndOfDay(e); refresh(); }} />
          )}
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-center">
      <div className="font-display text-2xl">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
        {icon} {title}
      </div>
      <ul className="mt-1 space-y-0.5 text-sm">{children}</ul>
    </div>
  );
}

function EodForm({ onSave }: { onSave: (e: { cooked: boolean; usedLeftovers: boolean; somethingSpoiled: boolean }) => void }) {
  const [cooked, setCooked] = useState(true);
  const [usedLeftovers, setUsedLeftovers] = useState(false);
  const [somethingSpoiled, setSomethingSpoiled] = useState(false);
  return (
    <div className="mt-2 space-y-2">
      <Toggle label="Did you cook today?" value={cooked} onChange={setCooked} />
      <Toggle label="Did you use leftovers?" value={usedLeftovers} onChange={setUsedLeftovers} />
      <Toggle label="Did anything go bad?" value={somethingSpoiled} onChange={setSomethingSpoiled} />
      <Button size="sm" onClick={() => onSave({ cooked, usedLeftovers, somethingSpoiled })}>Save review</Button>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all",
        value ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-secondary",
      )}
    >
      <span>{label}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", value ? "bg-primary text-primary-foreground" : "bg-secondary")}>
        {value ? "Yes" : "No"}
      </span>
    </button>
  );
}
