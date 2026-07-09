import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { DollarSign, Leaf, ChefHat, Flame, ArrowRight, Share2 } from "lucide-react";
import { getSavingsSummary } from "@/lib/savings.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SavingsShareModal } from "@/components/SavingsShareCard";

type Tone = "emerald" | "amber" | "rose" | "violet";

const TONE: Record<Tone, { bg: string; ring: string; iconBg: string; iconText: string; accent: string }> = {
  emerald: {
    bg: "bg-gradient-to-br from-[oklch(0.96_0.07_150)] via-[oklch(0.98_0.04_140)] to-[oklch(0.94_0.09_130)]",
    ring: "ring-[oklch(0.72_0.16_150)]/30",
    iconBg: "bg-[oklch(0.55_0.15_150)]",
    iconText: "text-white",
    accent: "text-[oklch(0.35_0.12_150)]",
  },
  amber: {
    bg: "bg-gradient-to-br from-[oklch(0.97_0.08_75)] via-[oklch(0.98_0.05_60)] to-[oklch(0.95_0.09_45)]",
    ring: "ring-[oklch(0.78_0.17_75)]/30",
    iconBg: "bg-[oklch(0.62_0.17_55)]",
    iconText: "text-white",
    accent: "text-[oklch(0.4_0.12_55)]",
  },
  rose: {
    bg: "bg-gradient-to-br from-[oklch(0.96_0.07_25)] via-[oklch(0.97_0.05_15)] to-[oklch(0.94_0.09_355)]",
    ring: "ring-[oklch(0.7_0.18_25)]/30",
    iconBg: "bg-[oklch(0.6_0.2_25)]",
    iconText: "text-white",
    accent: "text-[oklch(0.4_0.14_25)]",
  },
  violet: {
    bg: "bg-gradient-to-br from-[oklch(0.96_0.06_300)] via-[oklch(0.97_0.04_280)] to-[oklch(0.94_0.08_260)]",
    ring: "ring-[oklch(0.65_0.17_290)]/30",
    iconBg: "bg-[oklch(0.55_0.18_290)]",
    iconText: "text-white",
    accent: "text-[oklch(0.4_0.14_290)]",
  },
};

function formatMoney(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(dollars < 10 ? 2 : 0)}`;
}

export function SavingsDashboard() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => l.subscription.unsubscribe();
  }, []);

  const getSummary = useServerFn(getSavingsSummary);
  const q = useQuery({
    queryKey: ["savings-summary-home"],
    queryFn: () => getSummary(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const month = q.data?.monthCents ?? 0;
  const pounds = q.data?.totalPounds ?? 0;
  const meals = q.data?.mealsCount ?? 0;
  const streak = q.data?.streakDays ?? 0;
  const isEmpty = signedIn && !q.isLoading && meals === 0;
  const [shareOpen, setShareOpen] = useState(false);
  const canShare = signedIn && !isEmpty;

  return (
    <section className="mt-8 sm:mt-10">
      <div className="rounded-3xl border border-[oklch(0.9_0.04_75)] bg-gradient-to-br from-[oklch(0.99_0.02_85)] via-[oklch(0.98_0.03_70)] to-[oklch(0.97_0.05_45)] p-5 shadow-[0_10px_40px_-20px_oklch(0.6_0.15_45/0.35)] sm:p-7">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.55_0.15_45)] sm:text-xs">
              Your Kitchen Wins
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[oklch(0.22_0.05_45)] sm:text-3xl">
              {signedIn ? "You're saving real money & food" : "See what you'll save"}
            </h2>
            <p className="mt-1 text-sm text-[oklch(0.4_0.05_45)]">
              {signedIn
                ? isEmpty
                  ? "Cook a recipe from a scan and your stats start here."
                  : "Logged from every meal you cook from a scan."
                : "Sign in to track every dollar and pound you rescue from waste."}
            </p>
          </div>
          <Link
            to="/savings"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.5_0.18_30)] hover:underline sm:text-sm"
          >
            See full dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            tone="emerald"
            icon={<DollarSign className="h-5 w-5" />}
            label="Saved This Month"
            value={signedIn ? formatMoney(month) : "$0"}
            sub={signedIn ? "vs. eating out / extra groceries" : "Start scanning"}
            loading={q.isLoading}
          />
          <StatCard
            tone="amber"
            icon={<Leaf className="h-5 w-5" />}
            label="Food Saved From Waste"
            value={signedIn ? `${pounds.toFixed(1)} lb` : "0 lb"}
            sub={signedIn ? "Rescued before it spoiled" : "Every meal counts"}
            loading={q.isLoading}
          />
          <StatCard
            tone="rose"
            icon={<ChefHat className="h-5 w-5" />}
            label="Meals From What You Had"
            value={signedIn ? `${meals}` : "0"}
            sub={signedIn ? "Cooked from your scans" : "Log meals to track"}
            loading={q.isLoading}
          />
          <StatCard
            tone="violet"
            icon={<Flame className="h-5 w-5" />}
            label="Monthly Savings Streak"
            value={signedIn ? `${streak} ${streak === 1 ? "day" : "days"}` : "0 days"}
            sub={signedIn ? (streak > 0 ? "Keep it going!" : "Cook today to start") : "Daily cooking wins"}
            loading={q.isLoading}
          />
        </div>

        {canShare && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.6_0.2_25)] via-[oklch(0.6_0.22_350)] to-[oklch(0.55_0.2_290)] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.03] hover:brightness-110"
            >
              <Share2 className="h-4 w-4" /> Share my wins
            </button>
            <span className="text-xs text-[oklch(0.4_0.05_45)]">
              One tap to post to Instagram, Facebook, or text a friend.
            </span>
          </div>
        )}

        {!signedIn && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.55_0.18_30)] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02] hover:brightness-110"
            >
              Sign in to track your savings <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-xs text-[oklch(0.4_0.05_45)]">
              Free — no card, no spam.
            </span>
          </div>
        )}
      </div>

      <SavingsShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={{ monthCents: month, totalPounds: pounds, meals, streakDays: streak }}
      />
    </section>
  );
}


function StatCard({
  tone,
  icon,
  label,
  value,
  sub,
  loading,
}: {
  tone: Tone;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 ring-1 transition-transform hover:-translate-y-0.5 sm:p-5",
        t.bg,
        t.ring,
      )}
    >
      <div className={cn("inline-grid h-10 w-10 place-items-center rounded-xl shadow-md", t.iconBg, t.iconText)}>
        {icon}
      </div>
      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.4_0.05_45)] sm:text-xs">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-2xl font-extrabold leading-none tracking-tight text-[oklch(0.2_0.05_45)] sm:text-3xl",
          loading && "animate-pulse opacity-50",
        )}
      >
        {loading ? "—" : value}
      </div>
      <div className={cn("mt-1.5 text-[11px] leading-snug sm:text-xs", t.accent)}>{sub}</div>
    </div>
  );
}
