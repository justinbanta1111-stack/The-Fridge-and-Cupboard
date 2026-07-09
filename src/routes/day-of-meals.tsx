import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Sun,
  Sunrise,
  Sandwich,
  Soup,
  Cookie,
  Loader2,
  Sparkles,
  RefreshCw,
  Bookmark,
  Heart,
  ThumbsDown,
  ShoppingBasket,
  Clock,
  CalendarDays,
  Check,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  buildDayOfMeals,
  type DayPlan,
  type Meal,
  type DayGoal,
  type DayTime,
} from "@/lib/day-of-meals.functions";
import {
  loadDayMemory,
  saveDay,
  toggleFavoriteDay,
  deleteSavedDay,
  markLoved,
  markAvoid,
  recordPrefs,
  type DayMemory,
  type SavedDay,
} from "@/lib/day-of-meals-memory";
import { getRecentInventory } from "@/lib/savings.functions";
import { getUrgentItems } from "@/lib/scans.functions";
import { ShareMenu } from "@/components/ShareMenu";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/day-of-meals")({
  head: () => ({
    meta: [
      { title: "My Day of Meals — Personalized daily planner · The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "A full day of meals — breakfast, lunch, dinner, and a snack — built from what you already have. Uses expiring foods and leftovers first.",
      },
    ],
  }),
  component: DayOfMealsPage,
});

const GOALS: { id: DayGoal; label: string; emoji: string }[] = [
  { id: "save-money", label: "Save money", emoji: "💵" },
  { id: "use-leftovers", label: "Use leftovers", emoji: "♻️" },
  { id: "eat-healthier", label: "Eat healthier", emoji: "🥦" },
  { id: "high-protein", label: "High protein", emoji: "💪" },
  { id: "comfort-food", label: "Comfort food", emoji: "🍲" },
  { id: "quick-meals", label: "Quick meals", emoji: "⚡" },
  { id: "weight-gain", label: "Weight gain", emoji: "🥑" },
  { id: "weight-loss", label: "Weight loss", emoji: "🥗" },
  { id: "recovery", label: "Recovery support", emoji: "🤍" },
  { id: "family-meals", label: "Family meals", emoji: "👨‍👩‍👧" },
  { id: "fasting", label: "Lent / fasting", emoji: "🕊️" },
];

const TIMES: { id: DayTime; label: string }[] = [
  { id: "under-10", label: "Under 10 min" },
  { id: "under-20", label: "Under 20 min" },
  { id: "under-30", label: "Under 30 min" },
  { id: "no-limit", label: "No limit" },
];

const SLOT_META: Record<Meal["slot"], { label: string; Icon: any }> = {
  breakfast: { label: "Breakfast", Icon: Sunrise },
  lunch: { label: "Lunch", Icon: Sandwich },
  dinner: { label: "Dinner", Icon: Soup },
  snack: { label: "Snack", Icon: Cookie },
};

function DayOfMealsPage() {
  const [memory, setMemory] = useState<DayMemory>(() => loadDayMemory());
  const [goal, setGoal] = useState<DayGoal>(memory.lastGoal ?? "save-money");
  const [time, setTime] = useState<DayTime>((memory.lastTime as DayTime) ?? "under-30");
  const [have, setHave] = useState("");
  const [expiring, setExpiring] = useState<string[]>([]);
  const [leftovers, setLeftovers] = useState<string[]>([]);
  const [scanned, setScanned] = useState<string[]>([]);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState<Meal["slot"] | null>(null);
  const [plan, setPlan] = useState<DayPlan | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isFreshDay = memory.lastGeneratedDate !== today;

  useEffect(() => {
    setMemory(loadDayMemory());
    (async () => {
      const { data } = await supabase.auth.getUser();
      const ok = !!data.user && data.user.is_anonymous !== true;
      setAuthed(ok);
      if (!ok) return;
      try {
        const inv = await getRecentInventory();
        setScanned(inv.items.slice(0, 40));
      } catch {}
      try {
        const u = await getUrgentItems();
        const exp: string[] = [];
        const lo: string[] = [];
        for (const it of u.items) {
          if (it.category?.toLowerCase() === "leftover") lo.push(it.name);
          else exp.push(it.name);
        }
        setExpiring(exp.slice(0, 12));
        setLeftovers(lo.slice(0, 12));
      } catch {}
    })();
  }, []);

  function mergedHave(): string[] {
    const manual = have
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const set = new Set<string>();
    [...manual, ...scanned].forEach((x) => set.add(x));
    return Array.from(set);
  }

  async function generate() {
    setLoading(true);
    setPlan(null);
    try {
      const res = await buildDayOfMeals({
        data: {
          goal,
          time,
          haveIngredients: mergedHave(),
          expiringSoon: expiring,
          leftovers,
          history: { loved: memory.loved, avoid: memory.avoid },
        },
      });
      setPlan(res);
      const m = recordPrefs(goal, time);
      setMemory(m);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't build today's plan.");
    } finally {
      setLoading(false);
    }
  }

  async function swap(slot: Meal["slot"], away: string) {
    setSwapping(slot);
    try {
      const res = await buildDayOfMeals({
        data: {
          goal,
          time,
          haveIngredients: mergedHave(),
          expiringSoon: expiring,
          leftovers,
          swapSlot: slot,
          swapAway: away,
          history: { loved: memory.loved, avoid: memory.avoid },
        },
      });
      const newMeal = res.meals.find((m) => m.slot === slot) ?? res.meals[0];
      if (!newMeal || !plan) return;
      const next = {
        ...plan,
        meals: plan.meals.map((m) => (m.slot === slot ? newMeal : m)),
      };
      setPlan(next);
      toast.success("Swapped.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't swap.");
    } finally {
      setSwapping(null);
    }
  }

  function saveToday() {
    if (!plan) return;
    const id = `${today}-${Date.now()}`;
    const m = saveDay({ id, date: today, goal, plan });
    setMemory(m);
    toast.success("Day saved.");
  }

  function loveMeal(title: string) {
    setMemory(markLoved(title));
    toast.success("Chef will remember you loved this.");
  }
  function avoidMeal(title: string) {
    setMemory(markAvoid(title));
    toast("Chef will avoid this next time.");
  }

  const allMissing = useMemo(() => {
    if (!plan) return [] as string[];
    const set = new Set<string>();
    plan.meals.forEach((m) => m.missing.forEach((x) => set.add(x)));
    (plan.grocery_gap ?? []).forEach((x) => set.add(x));
    return Array.from(set).slice(0, 6);
  }, [plan]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-2 text-primary">
          <Sun className="h-5 w-5" />
          <span className="text-xs uppercase tracking-widest">My Day of Meals</span>
        </div>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">
          Here's your food plan for today.
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A breakfast, lunch, dinner, and snack — built from your scanned fridge, cupboard, and
          leftovers. Expiring foods come first.
        </p>

        {!authed && (
          <Card className="mt-4 border-amber-400/40 bg-amber-50/40 p-4 text-sm dark:bg-amber-950/20">
            <p className="text-amber-900 dark:text-amber-100">
              Sign in and scan your fridge for a fully personalized day.{" "}
              <Link to="/auth" className="underline">
                Sign in
              </Link>{" "}
              ·{" "}
              <Link to="/scan" className="underline">
                Scan
              </Link>
            </p>
          </Card>
        )}

        {/* Inventory snapshot */}
        {(scanned.length > 0 || expiring.length > 0 || leftovers.length > 0) && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SnapCard label="Expiring soon" items={expiring} tint="text-rose-600" />
            <SnapCard label="Leftovers" items={leftovers} tint="text-amber-600" />
            <SnapCard label="In your kitchen" items={scanned} tint="text-emerald-600" />
          </div>
        )}

        {/* Goal selection */}
        <section className="mt-6">
          <h2 className="font-display text-lg">What's your goal today?</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  goal === g.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="mr-1">{g.emoji}</span>
                {g.label}
              </button>
            ))}
          </div>
        </section>

        {/* Time */}
        <section className="mt-5">
          <h2 className="font-display text-lg">How much time do you have?</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTime(t.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  time === t.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Extras */}
        <section className="mt-5">
          <label className="text-sm font-medium">
            Anything else on hand? <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            value={have}
            onChange={(e) => setHave(e.target.value)}
            placeholder="eggs, spinach, tortillas, leftover rice…"
            className="mt-1 w-full rounded-md border border-border bg-card p-2 text-sm"
            rows={2}
          />
        </section>

        {/* Build */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={generate} disabled={loading} size="lg" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {plan ? "Rebuild today" : "Build my day"}
          </Button>
          {isFreshDay && plan && (
            <Badge variant="outline" className="self-center">
              Fresh for {today}
            </Badge>
          )}
        </div>

        {/* Plan */}
        {plan && (
          <section className="mt-8 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl">{plan.headline}</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={saveToday} className="gap-1">
                  <Bookmark className="h-4 w-4" /> Save today's plan
                </Button>
                <ShareMenu
                  title="My Day of Meals"
                  text={`My day from The Fridge and Cupboard:\n\n${plan.meals
                    .map((m) => `• ${SLOT_META[m.slot].label}: ${m.title}`)
                    .join("\n")}\n\n${plan.encouragement}`}
                />
              </div>
            </div>

            {plan.estimated_savings && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {plan.estimated_savings}
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {plan.meals.map((m) => {
                const Meta = SLOT_META[m.slot];
                return (
                  <Card key={m.slot} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary">
                        <Meta.Icon className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-widest">
                          {Meta.label}
                        </span>
                      </div>
                      <Badge variant="outline">{m.time_minutes} min</Badge>
                    </div>
                    <h3 className="mt-1 font-display text-xl">{m.title}</h3>
                    {m.why && <p className="mt-1 text-sm text-muted-foreground">{m.why}</p>}

                    {m.uses.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.uses.map((u) => (
                          <span
                            key={u}
                            className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.missing.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.missing.map((mi) => (
                          <span
                            key={mi}
                            className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400"
                          >
                            + {mi}
                          </span>
                        ))}
                      </div>
                    )}

                    {m.steps.length > 0 && (
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                        {m.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => swap(m.slot, m.title)}
                        disabled={swapping === m.slot}
                      >
                        {swapping === m.slot ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Swap this meal
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => loveMeal(m.title)}
                      >
                        <Heart className="h-3.5 w-3.5" /> Loved it
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => avoidMeal(m.title)}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Not for me
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Shopping gap */}
            {allMissing.length > 0 && (
              <Card className="border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <ShoppingBasket className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest">
                    Tiny shopping list
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  You're close — grab just these to finish the day:
                </p>
                <ul className="mt-2 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
                  {allMissing.map((g) => (
                    <li key={g} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary" /> {g}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <p className="text-center text-sm italic text-muted-foreground">
              {plan.encouragement}
            </p>
          </section>
        )}

        {/* Saved days */}
        {memory.saved.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg">Saved days</h2>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {memory.saved.slice(0, 8).map((s) => (
                <SavedRow
                  key={s.id}
                  saved={s}
                  onFav={() => setMemory(toggleFavoriteDay(s.id))}
                  onDelete={() => setMemory(deleteSavedDay(s.id))}
                  onRepeat={() => {
                    setPlan(s.plan);
                    setGoal(s.goal);
                    toast.success("Loaded saved day.");
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SnapCard({ label, items, tint }: { label: string; items: string[]; tint: string }) {
  return (
    <Card className="p-3">
      <div className={`text-xs uppercase tracking-widest ${tint}`}>{label}</div>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">None right now.</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1">
          {items.slice(0, 8).map((i) => (
            <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {i}
            </span>
          ))}
          {items.length > 8 && (
            <span className="text-xs text-muted-foreground">+{items.length - 8} more</span>
          )}
        </div>
      )}
    </Card>
  );
}

function SavedRow({
  saved,
  onFav,
  onDelete,
  onRepeat,
}: {
  saved: SavedDay;
  onFav: () => void;
  onDelete: () => void;
  onRepeat: () => void;
}) {
  return (
    <Card className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{saved.date}</span>
          <Badge variant="outline" className="text-[10px]">
            {saved.goal}
          </Badge>
          {saved.favorite && <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {saved.plan.meals.map((m) => m.title).join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="ghost" onClick={onFav}>
          <Heart className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={onRepeat}>
          Repeat
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          ×
        </Button>
      </div>
    </Card>
  );
}
