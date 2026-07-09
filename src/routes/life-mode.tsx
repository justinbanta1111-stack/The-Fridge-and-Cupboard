import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { cn } from "@/lib/utils";
import {
  DAYS, MOODS, type DayKind, type Mood,
  getLifeState, setLifeState, dayHint, moodHint,
  getZeroWaste, startZeroWaste, endZeroWaste,
  getTodayReflection, saveReflection,
} from "@/lib/life-mode";
import { lifeMeals } from "@/lib/life-mode.functions";
import { getRecentInventory } from "@/lib/savings.functions";
import {
  ArrowLeft, Sparkles, Heart, ShieldAlert, Recycle, HeartPulse,
  Loader2, Clock, ClipboardCheck,
} from "lucide-react";

export const Route = createFileRoute("/life-mode")({
  head: () => ({
    meta: [
      { title: "Life Mode — The Fridge and Cupboard" },
      { name: "description", content: "Match meals to your day, mood, and life. Emergency food mode, comfort rescue, zero waste day, and end-of-day reflection." },
    ],
  }),
  component: LifeModePage,
});

function LifeModePage() {
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("fnc:life-mode-updated", h);
    return () => window.removeEventListener("fnc:life-mode-updated", h);
  }, []);

  const state = getLifeState();
  const zw = getZeroWaste();
  const reflection = getTodayReflection();

  const getInventoryFn = useServerFn(getRecentInventory);
  const inventoryQ = useQuery({ queryKey: ["life-inventory"], queryFn: () => getInventoryFn() });
  const inventory = inventoryQ.data?.items ?? [];

  const mealsFn = useServerFn(lifeMeals);
  const mealsMut = useMutation({
    mutationFn: (mode: "match" | "emergency" | "comfort") =>
      mealsFn({ data: {
        dayKind: DAYS.find((d) => d.id === state.day)?.label ?? "",
        mood: MOODS.find((m) => m.id === state.mood)?.label ?? "",
        items: inventory,
        mode,
      } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Home</Link>
          </Button>
        </div>

        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">Life Mode</div>
          <h1 className="mt-1 font-display text-3xl leading-tight md:text-4xl">
            We get it — life happens.
          </h1>
          <p className="mt-2 text-muted-foreground">Tell us what kind of day it is, and we'll cook around it.</p>
        </div>

        {/* Day kind */}
        <Card className="ring-paper border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-5">
          <SectionTitle icon={<Sparkles className="h-3 w-3" />}>What kind of day is it?</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {DAYS.map((d) => (
              <PickButton
                key={d.id}
                active={state.day === d.id}
                emoji={d.emoji}
                label={d.label}
                onClick={() => { setLifeState({ day: d.id as DayKind }); refresh(); }}
              />
            ))}
          </div>
          {state.day && (
            <p className="mt-3 text-xs text-muted-foreground">Tonight we'll lean toward: {dayHint(state.day)}.</p>
          )}
        </Card>

        {/* Mood */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <SectionTitle icon={<Heart className="h-3 w-3" />}>How are you feeling?</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MOODS.map((m) => (
              <PickButton
                key={m.id}
                active={state.mood === m.id}
                emoji={m.emoji}
                label={m.label}
                onClick={() => { setLifeState({ mood: m.id as Mood }); refresh(); }}
              />
            ))}
          </div>
          {state.mood && (
            <p className="mt-3 text-xs text-muted-foreground">Adjusting suggestions: {moodHint(state.mood)}.</p>
          )}
        </Card>

        {/* Meal match */}
        <Card className="ring-paper mt-4 border-border/60 bg-gradient-to-br from-accent/10 via-card to-card p-5">
          <SectionTitle icon={<Sparkles className="h-3 w-3" />}>Real-life meal match</SectionTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Get meals tuned to your day{state.mood ? " and mood" : ""}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => mealsMut.mutate("match")} disabled={mealsMut.isPending}>
              {mealsMut.isPending && mealsMut.variables === "match" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Match my day
            </Button>
            <Button variant="outline" onClick={() => mealsMut.mutate("emergency")} disabled={mealsMut.isPending}>
              <ShieldAlert className="mr-2 h-4 w-4" /> I have almost nothing
            </Button>
            <Button variant="outline" onClick={() => mealsMut.mutate("comfort")} disabled={mealsMut.isPending}>
              <HeartPulse className="mr-2 h-4 w-4" /> I need comfort food
            </Button>
          </div>

          {mealsMut.data && (
            <div className="mt-4 space-y-2">
              <div className="font-display text-lg">{mealsMut.data.headline}</div>
              {mealsMut.data.meals.map((m, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{m.title}</div>
                    <Badge variant="outline" className="text-[10px]"><Clock className="mr-1 h-3 w-3" />{m.timeMinutes}m</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{m.why}</div>
                  {m.uses.length > 0 && (
                    <div className="mt-1 text-xs"><span className="text-muted-foreground">Uses: </span>{m.uses.join(", ")}</div>
                  )}
                </div>
              ))}
              {mealsMut.data.tip && (
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm italic">
                  {mealsMut.data.tip}
                </div>
              )}
            </div>
          )}
          {mealsMut.error && (
            <div className="mt-2 text-sm text-destructive">{(mealsMut.error as Error).message}</div>
          )}
        </Card>

        {/* Zero Waste */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <SectionTitle icon={<Recycle className="h-3 w-3" />}>Zero Waste Day</SectionTitle>
          {zw.active ? (
            <>
              <p className="mt-1 text-sm">Active — using only what you already have. {Math.max(0, Math.floor((Date.now()-zw.startedAt)/3600_000))} hours in.</p>
              <Button className="mt-3" variant="outline" size="sm" onClick={() => { endZeroWaste(); refresh(); }}>End challenge</Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Challenge: use only what's already in your fridge and pantry today.</p>
              <Button className="mt-3" size="sm" onClick={() => { startZeroWaste(); refresh(); }}>Start Zero Waste Day</Button>
            </>
          )}
        </Card>

        {/* End of Day Reflection */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <SectionTitle icon={<ClipboardCheck className="h-3 w-3" />}>End of Day Reflection</SectionTitle>
          {reflection ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Logged today: food {reflection.helped ? "helped ✓" : "—"}, money {reflection.savedMoney ? "saved ✓" : "—"}, leftovers {reflection.usedLeftovers ? "used ✓" : "—"}.
            </p>
          ) : (
            <ReflectionForm onSave={(r) => { saveReflection(r); refresh(); }} />
          )}
        </Card>
      </main>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
      {icon} {children}
    </div>
  );
}

function PickButton({ active, emoji, label, onClick }: { active: boolean; emoji?: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left text-sm transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/60 bg-background hover:border-primary/40 hover:bg-secondary",
      )}
    >
      {emoji && <div className="text-xl">{emoji}</div>}
      <div className="mt-0.5 font-medium">{label}</div>
    </button>
  );
}

function ReflectionForm({ onSave }: { onSave: (r: { helped: boolean; savedMoney: boolean; usedLeftovers: boolean }) => void }) {
  const [helped, setHelped] = useState(true);
  const [savedMoney, setSavedMoney] = useState(false);
  const [usedLeftovers, setUsedLeftovers] = useState(false);
  return (
    <div className="mt-2 space-y-2">
      <Toggle label="Did food help today?" value={helped} onChange={setHelped} />
      <Toggle label="Did you save money?" value={savedMoney} onChange={setSavedMoney} />
      <Toggle label="Did you use leftovers?" value={usedLeftovers} onChange={setUsedLeftovers} />
      <Button size="sm" onClick={() => onSave({ helped, savedMoney, usedLeftovers })}>Save reflection</Button>
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
