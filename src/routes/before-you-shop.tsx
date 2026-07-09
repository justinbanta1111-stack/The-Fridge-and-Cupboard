import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShoppingCart,
  ChefHat,
  Recycle,
  Sparkles,
  DollarSign,
  Clock,
  Utensils,
  AlertCircle,
  Refrigerator,
  Loader2,
} from "lucide-react";
import { getRescueDashboard } from "@/lib/scans.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/before-you-shop")({
  head: () => ({
    meta: [
      { title: "Before You Shop — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Before spending money at the grocery store, see what meals you can already make from your fridge, cupboard, and leftovers.",
      },
      { property: "og:title", content: "Before You Shop — The Fridge and Cupboard" },
      {
        property: "og:description",
        content:
          "Use What You Already Have. See meals you can cook tonight before buying more groceries.",
      },
    ],
  }),
  component: BeforeYouShopPage,
});

type Stats = {
  moneySavedYear: number;
  moneySavedMonth: number;
  poundsRescued: number;
  mealsCreated: number;
  streakDays: number;
};
const SAVINGS_KEY = "tfc.savings.v1";

function BeforeYouShopPage() {
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getRescueDashboard);
  const [stats, setStats] = useState<Stats | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [surpriseIdx, setSurpriseIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVINGS_KEY);
      if (raw) setStats(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => l.subscription.unsubscribe();
  }, []);

  const dashboardQuery = useQuery({
    queryKey: ["before-you-shop-dashboard"],
    queryFn: () => fetchDashboard({}),
    enabled: signedIn === true,
    staleTime: 60_000,
  });

  const dash = dashboardQuery.data;
  const useToday = dash?.useToday ?? [];
  const useWeek = dash?.useThisWeek ?? [];
  const priorityIngredients = dash?.topPriorityIngredients ?? [];
  const moneyAtRisk = dash ? Math.round(dash.moneyAtRiskCents / 100) : 0;
  const hasInventory = (dash?.scanCount ?? 0) > 0;

  function applySavings(amount: number) {
    try {
      const raw = localStorage.getItem(SAVINGS_KEY);
      const base: Stats = raw
        ? JSON.parse(raw)
        : {
            moneySavedYear: 0,
            moneySavedMonth: 0,
            poundsRescued: 0,
            mealsCreated: 0,
            streakDays: 0,
          };
      const next: Stats = {
        ...base,
        mealsCreated: base.mealsCreated + 1,
        moneySavedMonth: base.moneySavedMonth + amount,
        moneySavedYear: base.moneySavedYear + amount,
        poundsRescued: +(base.poundsRescued + 0.5).toFixed(1),
        streakDays: base.streakDays + 1,
      };
      localStorage.setItem(SAVINGS_KEY, JSON.stringify(next));
      setStats(next);
    } catch {
      /* ignore */
    }
  }

  function surpriseMe() {
    if (priorityIngredients.length === 0) {
      navigate({ to: "/scan" });
      return;
    }
    setSurpriseIdx(Math.floor(Math.random() * Math.min(priorityIngredients.length, 6)));
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Use What You Already Have
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Before You Shop</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Before spending money at the grocery store, see what meals you can already make from
            your real fridge and cupboard.
          </p>
        </header>

        {/* Shopping Assistant entry point */}
        <Card className="mb-6 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-xl">Shopping Assistant</div>
                <p className="text-sm text-muted-foreground">
                  At the store? Snap a product — we'll warn you if you already have it and
                  suggest what it pairs with.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="gap-2 shadow-lg">
              <Link to="/shopping-assistant">
                <Sparkles className="h-4 w-4" /> Open
              </Link>
            </Button>
          </div>
        </Card>


        {/* Loading / signed-out / empty states */}
        {signedIn === false && (
          <Card className="border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <Refrigerator className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="font-display text-xl">Sign in to see your kitchen</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in and scan your fridge or cupboard once. Then this page will show what meals
                  you can make tonight from what you already own.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to="/auth">Sign in</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/scan">See how scanning works</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {signedIn === true && dashboardQuery.isLoading && (
          <Card className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking through your latest scans…
          </Card>
        )}

        {signedIn === true && !dashboardQuery.isLoading && !hasInventory && (
          <Card className="border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <ChefHat className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="font-display text-xl">No scans yet</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scan your fridge or cupboard once and we'll show you exactly what meals you can
                  make before spending a dollar at the store.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to="/scan">Scan my fridge</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/cupboard">Scan my cupboard</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {signedIn === true && hasInventory && dash && (
          <>
            {/* Money-savings headline */}
            {(moneyAtRisk > 0 || priorityIngredients.length > 0) && (
              <Card className="mb-4 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-xl">
                      You could save ${Math.max(moneyAtRisk, Math.min(40, priorityIngredients.length * 3))}{" "}
                      by cooking what you already have.
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Skip the impulse buys — your fridge and cupboard already cover tonight's dinner.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Hero stats from real data */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Utensils className="h-4 w-4" /> In your kitchen
                  </div>
                  <div className="mt-1 font-display text-4xl tracking-tight">
                    {priorityIngredients.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    priority ingredients ready to cook
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" /> Money at risk
                  </div>
                  <div className="mt-1 font-display text-4xl tracking-tight text-primary">
                    ${moneyAtRisk}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    in food that may spoil if not used
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" /> Use soon
                  </div>
                  <div className="mt-1 font-display text-4xl tracking-tight">
                    {useToday.length + useWeek.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {useToday.length} today · {useWeek.length} this week
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button size="lg" onClick={() => navigate({ to: "/scan" })} className="gap-2">
                  <ChefHat className="h-4 w-4" /> Cook What I Have
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate({ to: "/rescue" })}
                  className="gap-2"
                >
                  <Recycle className="h-4 w-4" /> Use What's Going Bad First
                </Button>
                <Button size="lg" variant="outline" onClick={surpriseMe} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Surprise Me
                </Button>
              </div>

              {surpriseIdx !== null && priorityIngredients[surpriseIdx] && (
                <div className="mt-4 rounded-lg border border-primary/40 bg-background/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Chef Super J says…
                  </div>
                  <div className="mt-1 font-display text-xl">
                    Build a meal around your {priorityIngredients[surpriseIdx]}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Pair it with: {priorityIngredients
                      .filter((_, i) => i !== surpriseIdx)
                      .slice(0, 3)
                      .join(", ")}
                  </div>
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/rescue">Get full recipe ideas</Link>
                  </Button>
                </div>
              )}
            </Card>

            {/* Almost there — small additions unlock more meals */}
            {(() => {
              const have = new Set(priorityIngredients.map((i) => i.toLowerCase()));
              const staples = [
                { name: "eggs", unlocks: "omelets, fried rice, frittata" },
                { name: "onion", unlocks: "stir-fry, soup base, tacos" },
                { name: "garlic", unlocks: "pasta, sauces, roasted veg" },
                { name: "rice", unlocks: "bowls, fried rice, stir-fry" },
                { name: "pasta", unlocks: "weeknight pasta, pasta salad" },
                { name: "chicken broth", unlocks: "soups, risotto, braises" },
                { name: "tortillas", unlocks: "tacos, quesadillas, wraps" },
                { name: "lemon", unlocks: "dressings, pan sauces, fish" },
                { name: "olive oil", unlocks: "almost everything" },
                { name: "cheese", unlocks: "melts, pasta, eggs" },
              ];
              const missing = staples.filter((s) => ![...have].some((h) => h.includes(s.name))).slice(0, 4);
              if (missing.length < 2) return null;
              const buy = missing.slice(0, 2);
              const extraMeals = buy.length * 2;
              return (
                <section className="mt-8">
                  <h2 className="font-display text-2xl">Almost there</h2>
                  <p className="text-sm text-muted-foreground">
                    Buying only <span className="font-semibold text-foreground">{buy.length} more items</span> could
                    create <span className="font-semibold text-foreground">{extraMeals} more meals</span>.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {buy.map((s) => (
                      <Card key={s.name} className="border-primary/30 bg-primary/5 p-4">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                          <div className="font-medium capitalize">{s.name}</div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Unlocks: {s.unlocks}
                        </div>
                      </Card>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/shopping-assistant">Open Shopping Assistant</Link>
                    </Button>
                  </div>
                </section>
              );
            })()}

            {/* Food waste alerts */}
            {useToday.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-2xl">Use it before you lose it</h2>
                <p className="text-sm text-muted-foreground">
                  Quick alerts from your latest scans.
                </p>
                <div className="mt-3 space-y-2">
                  {useToday.slice(0, 5).map((i) => (
                    <div
                      key={`alert-${i.name}`}
                      className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <div className="text-sm">
                        <span className="font-semibold capitalize">Use your {i.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {i.timeLeftLabel ? `— ${i.timeLeftLabel.toLowerCase()}.` : "in the next 1–2 days."}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Use soon — real data */}
            {(useToday.length > 0 || useWeek.length > 0) && (
              <section className="mt-8">
                <h2 className="font-display text-2xl">Use these soon</h2>
                <p className="text-sm text-muted-foreground">
                  From your latest scans, sorted by freshness.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[...useToday.map((i) => ({ ...i, level: "today" as const })),
                    ...useWeek.map((i) => ({ ...i, level: "week" as const }))].map((i) => (
                    <Card
                      key={`${i.level}-${i.name}`}
                      className={`p-4 ${
                        i.level === "today"
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-amber-500/40 bg-amber-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium capitalize">{i.name}</div>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            i.level === "today"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {i.level === "today" ? "Use today" : "This week"}
                        </span>
                      </div>
                      {i.timeLeftLabel && (
                        <div className="mt-1 text-xs text-muted-foreground">{i.timeLeftLabel}</div>
                      )}
                      {i.notes && (
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {i.notes}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Priority ingredients quick-list */}
            {priorityIngredients.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-2xl">Meals start with what you have</h2>
                <p className="text-sm text-muted-foreground">
                  Tap below to get real recipe ideas built around these ingredients.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {priorityIngredients.slice(0, 16).map((ing) => (
                    <span
                      key={ing}
                      className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm capitalize"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to="/rescue">Get recipes for these</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/going-bad">See what's most urgent</Link>
                  </Button>
                </div>
              </section>
            )}
          </>
        )}

        {/* Savings tie-in — always visible */}
        <section className="mt-8">
          <Card className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">
                  {stats
                    ? `You've saved $${stats.moneySavedYear} this year`
                    : "Track your savings"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Every meal logged adds to your food-rescue streak.
                </div>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link to="/savings">Open Savings Dashboard</Link>
            </Button>
          </Card>
        </section>
      </main>
    </div>
  );
}
