import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DollarSign,
  Recycle,
  ChefHat,
  Flame,
  TrendingUp,
  ShoppingCart,
  Sparkles,
  Trophy,
  Loader2,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { getSavingsSummary, logCookedMeal } from "@/lib/savings.functions";
import { playChaChing } from "@/lib/sound-effects";
import { toast } from "sonner";

export const Route = createFileRoute("/savings")({
  head: () => ({
    meta: [
      { title: "Your Savings — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Track money saved, food waste prevented, meals created, and your food-rescue streak. Use What You Already Have.",
      },
      { property: "og:title", content: "Your Savings — The Fridge and Cupboard" },
      {
        property: "og:description",
        content:
          "See how much money you've saved and how much food you've rescued by using what you already have.",
      },
    ],
  }),
  component: SavingsPage,
});

function fmtUsd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function SavingsPage() {
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const getSummaryFn = useServerFn(getSavingsSummary);
  const logFn = useServerFn(logCookedMeal);

  const summary = useQuery({
    queryKey: ["savings-summary"],
    queryFn: () => getSummaryFn(),
    enabled: !!user,
  });

  const logMut = useMutation({
    mutationFn: (title: string) => logFn({ data: { recipeTitle: title, source: "manual" } }),
    onSuccess: () => {
      try { playChaChing(); } catch {}
      toast.success("Logged!");
      summary.refetch();
    },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't log"),
  });

  const yearGoal = 50000; // cents
  const data = summary.data;
  const pct = data ? Math.min(100, Math.round((data.yearCents / yearGoal) * 100)) : 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Use What You Already Have
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Your Savings</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every meal you cook from what's already in your fridge and cupboard saves money and
            rescues food from the trash.
          </p>
        </header>

        {user === undefined ? (
          <Card className="grid place-items-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Card>
        ) : user === null ? (
          <Card className="border-primary/30 bg-primary/5 p-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 font-display text-2xl">Sign in to track your savings</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Create a free account so we can log every rescued meal and chart your money saved over time.
            </p>
            <Button asChild className="mt-5">
              <Link to="/auth">Sign in</Link>
            </Button>
          </Card>
        ) : summary.isLoading ? (
          <Card className="grid place-items-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </Card>
        ) : !data ? null : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={DollarSign} label="Saved this year" value={fmtUsd(data.yearCents)} accent />
              <StatCard icon={CalendarRange} label="Saved this month" value={fmtUsd(data.monthCents)} sub={`${data.monthMeals} meals`} />
              <StatCard icon={CalendarDays} label="Saved this week" value={fmtUsd(data.weekCents)} sub={`${data.weekMeals} meals · ${data.weekPounds} lb`} />
              <StatCard icon={TrendingUp} label="All-time saved" value={fmtUsd(data.totalCents)} />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Recycle} label="Food rescued" value={`${data.totalPounds} lb`} />
              <StatCard icon={ChefHat} label="Meals logged" value={`${data.mealsCount}`} />
              <StatCard icon={Flame} label="Current streak" value={`${data.streakDays} ${data.streakDays === 1 ? "day" : "days"}`} />
              <StatCard
                icon={Trophy}
                label="Days using app"
                value={`${data.activeDays}`}
                sub={data.firstCookedAt ? `Since ${new Date(data.firstCookedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : undefined}
              />
            </div>


            <Card className="mt-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Yearly goal</div>
                  <div className="font-display text-2xl">
                    {fmtUsd(data.yearCents)}{" "}
                    <span className="text-base text-muted-foreground">of {fmtUsd(yearGoal)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                  <Flame className="h-4 w-4" /> {data.streakDays}-day food-rescue streak
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>

            <Card className="mt-6 p-6">
              <h2 className="font-display text-xl">Last 30 days</h2>
              <p className="text-sm text-muted-foreground">Money saved per day, by meals logged.</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily.map((d) => ({ ...d, dollars: d.cents / 100 }))}>
                    <defs>
                      <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => d.slice(5)}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Saved"]}
                      labelFormatter={(d) => d}
                      contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="dollars"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#savingsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </Card>

            <Card className="mt-6 p-6">
              <h2 className="font-display text-xl">Weekly totals</h2>
              <p className="text-sm text-muted-foreground">Money saved each week over the last 8 weeks.</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekly.map((w) => ({ ...w, dollars: w.cents / 100 }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      dataKey="weekStart"
                      tickFormatter={(d) => {
                        const dt = new Date(d);
                        return `${dt.getMonth() + 1}/${dt.getDate()}`;
                      }}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Saved"]}
                      labelFormatter={(d) => `Week of ${new Date(d).toLocaleDateString()}`}
                      contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                    <Bar dataKey="dollars" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>


            {data.recent.length > 0 && (
              <Card className="mt-6 p-6">
                <h2 className="font-display text-xl">Recent rescued meals</h2>
                <ul className="mt-3 divide-y divide-border/60">
                  {data.recent.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.recipeTitle}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.cookedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        {fmtUsd(r.estimatedSavingsCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="mt-6 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Just cooked a meal from your fridge?</div>
                  <div className="text-sm text-muted-foreground">
                    Log it to update your streak and savings.
                  </div>
                </div>
              </div>
              <Button
                onClick={() => logMut.mutate("Home-cooked meal")}
                disabled={logMut.isPending}
              >
                {logMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Log a rescued meal
              </Button>
            </Card>

            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <ActionCard
                to="/before-you-shop"
                icon={ShoppingCart}
                title="Before You Shop"
                body="See how many meals you can already make tonight — before spending another dollar."
              />
              <ActionCard
                to="/going-bad"
                icon={Recycle}
                title="What's Going Bad First?"
                body="Prioritize ingredients by urgency: use today, this week, or safe for later."
              />
              <ActionCard
                to="/scan"
                icon={Sparkles}
                title="Surprise Me"
                body="Let Chef Super J pick a creative meal from what you already have."
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <Card className={`p-5 ${accent ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}


function ActionCard({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: any;
  title: string;
  body: string;
}) {
  return (
    <Link to={to} className="group block">
      <Card className="h-full p-5 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-3 font-semibold group-hover:text-primary">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </Card>
    </Link>
  );
}
