import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  Sparkles,
  DollarSign,
  Trophy,
  Flame,
  ChefHat,
  ArrowRight,
  Lightbulb,
  Camera,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getRescueDashboard, type RescueItem } from "@/lib/scans.functions";
import { suggestRecipes } from "@/lib/fridge.functions";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { dietLabel } from "@/lib/personalization";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function dollars(cents: number) {
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
  return `$${d.toFixed(d < 10 ? 2 : 0)}`;
}

export function RescueCenter() {
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();
  const { prefs } = useDietaryPrefs();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => l.subscription.unsubscribe();
  }, []);

  const fetchDashboard = useServerFn(getRescueDashboard);
  const recipesFn = useServerFn(suggestRecipes);

  const q = useQuery({
    queryKey: ["rescue-dashboard"],
    queryFn: () => fetchDashboard(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const oneTapMut = useMutation({
    mutationFn: (items: string[]) =>
      recipesFn({
        data: {
          items,
          cuisine: "Anything Goes",
          restrictions: prefs.map((p) => dietLabel(p)),
        },
      }),
    onSuccess: (data) => {
      const titles = data?.recipes?.slice(0, 2).map((r) => r.title).join(" • ");
      toast.success(titles ? `Chef Super J suggests: ${titles}` : "Recipes ready!", {
        action: { label: "See all", onClick: () => navigate({ to: "/scan" }) },
        duration: 6000,
      });
    },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't generate recipes"),
  });

  if (!signedIn) {
    return (
      <section className="mt-8 sm:mt-10">
        <div className="rounded-3xl border border-[oklch(0.88_0.04_280)] bg-gradient-to-br from-[oklch(0.97_0.04_300)] via-[oklch(0.98_0.03_270)] to-[oklch(0.96_0.06_220)] p-6 text-center shadow-[0_10px_40px_-20px_oklch(0.5_0.2_290/0.4)] sm:p-8">
          <div className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.6_0.2_290)] to-[oklch(0.55_0.22_220)] text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.45_0.15_290)]">
            Smart Food Rescue Center
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Your kitchen command center
          </h2>
          <p className="mt-2 max-w-xl mx-auto text-sm text-muted-foreground">
            Sign in and scan to see what to use today, what's hiding in the back,
            money at risk, one-tap meals, and beat last week's waste.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.6_0.2_290)] to-[oklch(0.55_0.22_220)] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02]"
          >
            Sign in to unlock <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  if (q.isLoading) {
    return (
      <section className="mt-8 sm:mt-10">
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Loading your rescue center…</p>
        </div>
      </section>
    );
  }

  const d = q.data;
  if (!d || d.scanCount === 0) {
    return (
      <section className="mt-8 sm:mt-10">
        <div className="rounded-3xl border border-[oklch(0.88_0.05_45)] bg-gradient-to-br from-[oklch(0.98_0.05_75)] via-[oklch(0.97_0.05_50)] to-[oklch(0.96_0.07_25)] p-6 text-center shadow-md sm:p-8">
          <div className="inline-block h-14 w-14 overflow-hidden rounded-2xl ring-2 ring-primary/40 shadow-md">
            <img src="/__l5e/assets-v1/6777100d-858a-4317-9496-734f32083459/chef-super-j.jpeg" alt="Chef Super J" className="h-full w-full object-cover object-top" />
          </div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.45_0.15_45)]">
            Smart Food Rescue Center
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Scan to power up your rescue center
          </h2>
          <p className="mt-2 max-w-xl mx-auto text-sm text-muted-foreground">
            Snap your fridge, cupboard, or leftovers and Chef Super J builds your
            personal command center — Use Today, Forgotten Treasures, money at risk,
            and one-tap meals.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/scan"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.6_0.2_45)] to-[oklch(0.55_0.22_25)] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02]"
            >
              <Camera className="h-4 w-4" /> Scan now
            </Link>
            <Link
              to="/rescue"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition hover:bg-secondary"
            >
              Use my leftovers
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const wc = d.weekChallenge;
  const delta = wc.thisWeekCents - wc.lastWeekCents;

  return (
    <section className="mt-8 sm:mt-10">
      <div className="rounded-3xl border border-[oklch(0.88_0.05_290)] bg-gradient-to-br from-[oklch(0.98_0.03_290)] via-[oklch(0.97_0.04_220)] to-[oklch(0.96_0.06_180)] p-5 shadow-[0_20px_60px_-30px_oklch(0.5_0.2_260/0.5)] sm:p-7">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.5_0.18_290)]">
              Smart Food Rescue Center
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Your command center
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              From your last {d.scanCount} scan{d.scanCount === 1 ? "" : "s"} + every meal you've cooked.
            </p>
          </div>
          <button
            type="button"
            onClick={() => q.refetch()}
            className="text-xs font-semibold text-[oklch(0.5_0.18_290)] hover:underline"
          >
            Refresh
          </button>
        </div>

        {/* Top stat row */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BigStat
            tone="rose"
            icon={<DollarSign className="h-5 w-5" />}
            label="Money at Risk"
            value={dollars(d.moneyAtRiskCents)}
            sub="If not used soon"
          />
          <BigStat
            tone="emerald"
            icon={<Trophy className="h-5 w-5" />}
            label="Rescue Score"
            value={d.rescueScore.score.toLocaleString()}
            sub={`${d.rescueScore.mealsCooked} meals rescued`}
          />
          <BigStat
            tone="amber"
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Use Today"
            value={`${d.useToday.length}`}
            sub="Eat first"
          />
          <BigStat
            tone="violet"
            icon={<Clock className="h-5 w-5" />}
            label="Use This Week"
            value={`${d.useThisWeek.length}`}
            sub="Approaching expiration"
          />
        </div>

        {/* One-tap meals CTA */}
        <div className="mt-5 rounded-2xl border border-[oklch(0.88_0.05_140)] bg-gradient-to-r from-[oklch(0.96_0.08_140)] via-[oklch(0.97_0.05_120)] to-[oklch(0.95_0.09_100)] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.55_0.18_140)] to-[oklch(0.5_0.2_120)] text-white shadow-md">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[oklch(0.35_0.12_140)]">
                  One-Tap Meals
                </p>
                <p className="text-sm font-semibold text-[oklch(0.22_0.05_140)]">
                  Cook from your highest-priority ingredients first.
                </p>
                {d.topPriorityIngredients.length > 0 && (
                  <p className="mt-1 text-xs text-[oklch(0.4_0.05_140)]">
                    {d.topPriorityIngredients.slice(0, 5).join(" • ")}
                    {d.topPriorityIngredients.length > 5 && " …"}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={oneTapMut.isPending || d.topPriorityIngredients.length === 0}
              onClick={() => oneTapMut.mutate(d.topPriorityIngredients)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition",
                "bg-gradient-to-r from-[oklch(0.55_0.18_140)] to-[oklch(0.5_0.2_120)]",
                "disabled:opacity-60",
                !oneTapMut.isPending && "hover:scale-[1.03] hover:brightness-110",
              )}
            >
              {oneTapMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Cooking ideas…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Get one-tap meals
                </>
              )}
            </button>
          </div>
          {oneTapMut.data?.recipes && oneTapMut.data.recipes.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {oneTapMut.data.recipes.slice(0, 4).map((r) => (
                <li
                  key={r.title}
                  className="rounded-xl bg-white/70 px-3 py-2 text-sm shadow-sm ring-1 ring-[oklch(0.88_0.05_140)]"
                >
                  <p className="font-semibold text-[oklch(0.22_0.05_140)]">{r.title}</p>
                  <p className="text-xs text-[oklch(0.4_0.05_140)]">
                    {r.timeMinutes} min · {r.difficulty}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Item lists */}
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <ItemList
            tone="rose"
            title="Use Today"
            icon={<AlertTriangle className="h-4 w-4" />}
            items={d.useToday}
            emptyText="Nothing critical — nice work!"
          />
          <ItemList
            tone="amber"
            title="Use This Week"
            icon={<Clock className="h-4 w-4" />}
            items={d.useThisWeek}
            emptyText="No items expiring this week."
          />
          <ItemList
            tone="violet"
            title="Forgotten Treasures"
            icon={<Lightbulb className="h-4 w-4" />}
            items={d.forgottenTreasures}
            emptyText="Scan your cupboard to surface forgotten gems."
          />
        </div>

        {/* Family Challenge */}
        <div className="mt-5 rounded-2xl border border-[oklch(0.88_0.05_30)] bg-gradient-to-br from-[oklch(0.97_0.07_45)] via-[oklch(0.96_0.08_25)] to-[oklch(0.95_0.1_10)] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.6_0.2_30)] to-[oklch(0.55_0.22_10)] text-white shadow-md">
              <Flame className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[oklch(0.4_0.15_30)]">
                Family Challenge
              </p>
              <p className="text-sm font-semibold text-[oklch(0.22_0.05_30)]">
                {wc.beatingLastWeek
                  ? `You're beating last week by ${dollars(Math.abs(delta))} 🎉`
                  : wc.lastWeekCents > 0
                    ? `Beat last week by saving ${dollars(Math.abs(delta) || 100)} more.`
                    : "Cook this week to start your challenge!"}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <ChallengeStat label="This week" value={dollars(wc.thisWeekCents)} meals={wc.thisWeekMeals} up />
                <ChallengeStat label="Last week" value={dollars(wc.lastWeekCents)} meals={wc.lastWeekMeals} />
                <ChallengeStat
                  label="Pounds rescued"
                  value={`${wc.thisWeekPounds.toFixed(1)} lb`}
                  meals={null}
                  up={wc.thisWeekPounds >= wc.lastWeekPounds}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.5_0.18_290)] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:scale-[1.02]"
          >
            <Camera className="h-3.5 w-3.5" /> Scan again
          </Link>
          <Link
            to="/rescue"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold transition hover:bg-secondary"
          >
            Use my leftovers
          </Link>
          <Link
            to="/savings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold transition hover:bg-secondary"
          >
            Full savings dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

type Tone = "emerald" | "amber" | "rose" | "violet";
const TONE: Record<Tone, { bg: string; ring: string; iconBg: string; chip: string; text: string }> = {
  emerald: {
    bg: "bg-gradient-to-br from-[oklch(0.96_0.07_150)] to-[oklch(0.94_0.09_130)]",
    ring: "ring-[oklch(0.7_0.16_150)]/30",
    iconBg: "bg-[oklch(0.55_0.15_150)]",
    chip: "bg-[oklch(0.55_0.15_150)] text-white",
    text: "text-[oklch(0.3_0.12_150)]",
  },
  amber: {
    bg: "bg-gradient-to-br from-[oklch(0.97_0.08_75)] to-[oklch(0.95_0.09_45)]",
    ring: "ring-[oklch(0.78_0.17_75)]/30",
    iconBg: "bg-[oklch(0.62_0.17_55)]",
    chip: "bg-[oklch(0.62_0.17_55)] text-white",
    text: "text-[oklch(0.4_0.12_55)]",
  },
  rose: {
    bg: "bg-gradient-to-br from-[oklch(0.96_0.07_25)] to-[oklch(0.94_0.09_355)]",
    ring: "ring-[oklch(0.7_0.18_25)]/30",
    iconBg: "bg-[oklch(0.6_0.2_25)]",
    chip: "bg-[oklch(0.6_0.2_25)] text-white",
    text: "text-[oklch(0.4_0.14_25)]",
  },
  violet: {
    bg: "bg-gradient-to-br from-[oklch(0.96_0.06_300)] to-[oklch(0.94_0.08_260)]",
    ring: "ring-[oklch(0.65_0.17_290)]/30",
    iconBg: "bg-[oklch(0.55_0.18_290)]",
    chip: "bg-[oklch(0.55_0.18_290)] text-white",
    text: "text-[oklch(0.4_0.14_290)]",
  },
};

function BigStat({
  tone,
  icon,
  label,
  value,
  sub,
}: {
  tone: Tone;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  const t = TONE[tone];
  return (
    <div className={cn("rounded-2xl p-4 ring-1 shadow-sm", t.bg, t.ring)}>
      <div className={cn("inline-grid h-9 w-9 place-items-center rounded-xl text-white shadow-md", t.iconBg)}>
        {icon}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.4_0.05_45)]">
        {label}
      </div>
      <div className="font-display text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">
        {value}
      </div>
      <div className={cn("mt-1 text-[11px]", t.text)}>{sub}</div>
    </div>
  );
}

function ItemList({
  tone,
  title,
  icon,
  items,
  emptyText,
}: {
  tone: Tone;
  title: string;
  icon: React.ReactNode;
  items: RescueItem[];
  emptyText: string;
}) {
  const t = TONE[tone];
  return (
    <div className={cn("rounded-2xl p-4 ring-1 shadow-sm", t.bg, t.ring)}>
      <div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", t.chip)}>
          {icon} {title}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className={cn("mt-3 text-xs", t.text)}>{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.slice(0, 6).map((it, i) => (
            <li
              key={`${it.scanId}-${it.name}-${i}`}
              className="rounded-lg bg-white/70 px-2.5 py-1.5 text-xs shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-foreground truncate">{it.name}</span>
                {it.timeLeftLabel && (
                  <span className={cn("shrink-0 text-[10px] font-semibold", t.text)}>
                    {it.timeLeftLabel}
                  </span>
                )}
              </div>
              {it.notes && (
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{it.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChallengeStat({
  label,
  value,
  meals,
  up,
}: {
  label: string;
  value: string;
  meals: number | null;
  up?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/70 px-2.5 py-2 ring-1 ring-[oklch(0.88_0.05_30)]">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.4_0.15_30)]">
        {label}
        {up !== undefined &&
          (up ? (
            <TrendingUp className="h-3 w-3 text-[oklch(0.55_0.15_150)]" />
          ) : (
            <TrendingDown className="h-3 w-3 text-[oklch(0.55_0.15_30)]" />
          ))}
      </div>
      <div className="font-display text-base font-extrabold text-[oklch(0.22_0.05_30)]">{value}</div>
      {meals !== null && <div className="text-[10px] text-muted-foreground">{meals} meals</div>}
    </div>
  );
}
