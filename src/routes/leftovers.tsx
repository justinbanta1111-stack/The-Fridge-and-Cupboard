import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  AlertTriangle,
  Camera,
  ChefHat,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import { getUseSoonItems, type UseSoonItem, type Urgency } from "@/lib/use-soon.functions";
import { planLeftoverItem, type LeftoverPlan } from "@/lib/leftovers-plan.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/leftovers")({
  component: LeftoversPage,
  head: () => ({
    meta: [
      { title: "Leftovers Dashboard — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "See every leftover and ingredient that needs using first, then get a short what-I-can-make plan for each one in seconds.",
      },
      { property: "og:title", content: "Leftovers Dashboard — Use It Before It's Gone" },
      {
        property: "og:description",
        content:
          "Your leftovers, ranked by what to eat first, each with three quick meal ideas from Chef Super J.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const TONE: Record<Urgency, { label: string; chip: string; ring: string }> = {
  red: { label: "Eat today", chip: "bg-rose-600 text-white", ring: "ring-rose-400/50" },
  orange: { label: "1–2 days", chip: "bg-orange-500 text-white", ring: "ring-orange-400/50" },
  yellow: { label: "This week", chip: "bg-yellow-500 text-yellow-950", ring: "ring-yellow-400/50" },
  green: { label: "Good for later", chip: "bg-emerald-600 text-white", ring: "ring-emerald-400/40" },
};

const ORDER: Record<Urgency, number> = { red: 0, orange: 1, yellow: 2, green: 3 };

function LeftoversPage() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => l.subscription.unsubscribe();
  }, []);

  const getItems = useServerFn(getUseSoonItems);
  const q = useQuery({
    queryKey: ["leftovers-use-soon"],
    queryFn: () => getItems(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const items = useMemo(() => {
    const all = q.data?.items ?? [];
    return [...all]
      .filter((i) => i.urgency !== "green")
      .sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency] || b.daysOld - a.daysOld)
      .slice(0, 20);
  }, [q.data]);

  const otherNames = useMemo(() => (q.data?.items ?? []).map((i) => i.name), [q.data]);

  const planFn = useServerFn(planLeftoverItem);
  const [plans, setPlans] = useState<Record<string, LeftoverPlan>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const makePlan = async (item: UseSoonItem) => {
    const key = item.name.toLowerCase();
    if (plans[key]) {
      setPlans((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
      return;
    }
    setLoadingKey(key);
    try {
      const plan = await planFn({
        data: {
          item: item.name,
          urgency: item.urgency,
          reason: item.reason,
          alsoHave: otherNames.filter((n) => n.toLowerCase() !== key).slice(0, 15),
        },
      });
      setPlans((p) => ({ ...p, [key]: plan }));
    } catch {
      toast.error("Couldn't build that plan. Try again in a moment.");
    } finally {
      setLoadingKey(null);
    }
  };

  const redCount = items.filter((i) => i.urgency === "red").length;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[oklch(0.98_0.02_85)] via-background to-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-700">
            <AlarmClock className="h-3.5 w-3.5" /> Leftovers
          </div>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            What to eat first — and what to make with it.
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Everything from your scans, ranked by what won't keep. Tap any item for three quick
            meal ideas built around it.
          </p>
        </header>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            {q.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button asChild>
            <Link to="/leftovers-builder">
              <Sparkles className="mr-2 h-4 w-4" /> Build step-by-step meals
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/">
              <Camera className="mr-2 h-4 w-4" /> Scan more
            </Link>
          </Button>

        </div>

        {!signedIn ? (
          <Card className="p-6 text-center">
            <p className="text-base font-semibold">Sign in to see your leftovers.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your scans stay private to your account.
            </p>
            <Button asChild className="mt-4">
              <Link to="/auth">Sign in</Link>
            </Button>
          </Card>
        ) : q.isLoading ? (
          <Card className="grid place-items-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-base font-semibold">Nothing needs rescuing right now.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan your fridge or cupboard and we'll track what to use first.
            </p>
            <Button asChild className="mt-4">
              <Link to="/scan">
                <Camera className="mr-2 h-4 w-4" /> Scan my fridge
              </Link>
            </Button>
          </Card>
        ) : (
          <>
            {redCount > 0 && (
              <Card className="mb-4 flex items-start gap-3 bg-gradient-to-r from-rose-50 to-orange-50 p-4 ring-1 ring-rose-300/60">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-500 text-white">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-rose-900">
                  {redCount} {redCount === 1 ? "item needs" : "items need"} cooking today. Start at
                  the top of the list.
                </p>
              </Card>
            )}

            <div className="space-y-3">
              {items.map((item) => {
                const key = item.name.toLowerCase();
                const tone = TONE[item.urgency];
                const plan = plans[key];
                const busy = loadingKey === key;
                return (
                  <Card key={`${item.scanId}-${item.name}`} className={cn("p-4 ring-1", tone.ring)}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                          tone.chip,
                        )}
                      >
                        {tone.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-lg font-semibold capitalize">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.reason} · from your {item.scanLabel}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => makePlan(item)} disabled={busy}>
                        {busy ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {plan ? "Hide plan" : "What I can make"}
                      </Button>
                    </div>

                    {plan && (
                      <div className="mt-4 border-t pt-4">
                        <p className="flex items-start gap-2 text-sm font-medium">
                          <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {plan.headline}
                        </p>
                        <ul className="mt-3 space-y-3">
                          {plan.ideas.map((idea, i) => (
                            <li key={i} className="rounded-xl bg-muted/50 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-semibold">{idea.title}</span>
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" /> {idea.time}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{idea.how}</p>
                            </li>
                          ))}
                        </ul>
                        <Button variant="outline" size="sm" className="mt-3" asChild>
                          <Link to="/rescue" search={{ ingredients: item.name }}>
                            <ChefHat className="mr-2 h-4 w-4" /> Cook with {item.name}
                          </Link>
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
