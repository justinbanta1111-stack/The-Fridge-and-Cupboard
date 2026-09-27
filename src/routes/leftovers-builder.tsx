import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  ChefHat,
  Clock,
  Flame,
  Loader2,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/SiteNav";
import { CookingMode } from "@/components/CookingMode";
import { AddRecipeToPlanButton } from "@/components/AddRecipeToPlanButton";
import { supabase } from "@/integrations/supabase/client";
import { getUseSoonItems, type Urgency } from "@/lib/use-soon.functions";
import { getExpiringSoon, friendlyWindow } from "@/lib/expiry";
import {
  buildLeftoverMeals,
  COOK_METHODS,
  type CookMethod,
  type LeftoverMealBuild,
  type LeftoverRecipe,
} from "@/lib/leftovers-builder.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/leftovers-builder")({
  component: LeftoversBuilderPage,
  head: () => ({
    meta: [
      { title: "Leftovers Meal Builder — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Pick the food that's about to go bad and get three full step-by-step recipes, each with its own cooking option and hands-free cook-along.",
      },
      { property: "og:title", content: "Leftovers Meal Builder — Cook What's Going First" },
      {
        property: "og:description",
        content:
          "Turn soon-to-expire ingredients into step-by-step recipes with stovetop, oven, air fryer and no-cook options.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const METHOD_LABEL: Record<CookMethod, string> = {
  any: "Surprise me",
  stovetop: "Stovetop",
  oven: "Oven",
  "air-fryer": "Air fryer",
  "slow-cooker": "Slow cooker",
  microwave: "Microwave",
  "no-cook": "No cook",
};

const URGENCY_CHIP: Record<Urgency, string> = {
  red: "bg-rose-600 text-white",
  orange: "bg-orange-500 text-white",
  yellow: "bg-yellow-500 text-yellow-950",
  green: "bg-emerald-600 text-white",
};

const TIME_OPTIONS = [15, 30, 45, 60];

type Candidate = { name: string; note: string; urgency: Urgency };

function LeftoversBuilderPage() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => l.subscription.unsubscribe();
  }, []);

  const getItems = useServerFn(getUseSoonItems);
  const scans = useQuery({
    queryKey: ["leftovers-builder-use-soon"],
    queryFn: () => getItems(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const [tracked, setTracked] = useState<Candidate[]>([]);
  useEffect(() => {
    setTracked(
      getExpiringSoon().map((i) => ({
        name: i.name,
        note: friendlyWindow(i.bestBy),
        urgency: "orange" as Urgency,
      })),
    );
  }, []);

  const [extra, setExtra] = useState<Candidate[]>([]);
  const [typed, setTyped] = useState("");

  const candidates = useMemo(() => {
    const fromScans: Candidate[] = (scans.data?.items ?? [])
      .filter((i) => i.urgency !== "green")
      .map((i) => ({ name: i.name, note: i.reason, urgency: i.urgency }));
    const seen = new Set<string>();
    return [...fromScans, ...tracked, ...extra].filter((c) => {
      const k = c.name.trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [scans.data, tracked, extra]);

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    // Preselect the most urgent items the first time they load.
    setSelected((prev) => {
      if (prev.length) return prev;
      const urgent = candidates.filter((c) => c.urgency === "red" || c.urgency === "orange");
      return (urgent.length ? urgent : candidates).slice(0, 4).map((c) => c.name);
    });
  }, [candidates]);

  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  const addTyped = () => {
    const clean = typed.trim();
    if (!clean) return;
    if (!candidates.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      setExtra((e) => [...e, { name: clean, note: "Added by you", urgency: "orange" }]);
    }
    setSelected((s) => (s.includes(clean) ? s : [...s, clean]));
    setTyped("");
  };

  const [method, setMethod] = useState<CookMethod>("any");
  const [maxMinutes, setMaxMinutes] = useState(30);
  const [servings, setServings] = useState(2);

  const buildFn = useServerFn(buildLeftoverMeals);
  const [build, setBuild] = useState<LeftoverMealBuild | null>(null);
  const [busy, setBusy] = useState(false);
  const [cook, setCook] = useState<LeftoverRecipe | null>(null);

  const run = async () => {
    if (!selected.length) {
      toast.error("Pick at least one item that needs using up.");
      return;
    }
    setBusy(true);
    setBuild(null);
    try {
      const result = await buildFn({
        data: {
          items: selected.slice(0, 12),
          alsoHave: candidates
            .map((c) => c.name)
            .filter((n) => !selected.includes(n))
            .slice(0, 20),
          method,
          maxMinutes,
          servings,
        },
      });
      setBuild(result);
    } catch {
      toast.error("Couldn't build those meals. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[oklch(0.98_0.02_85)] via-background to-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 sm:px-6">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-700">
            <AlarmClock className="h-3.5 w-3.5" /> Leftovers first
          </div>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Turn what's going bad into dinner.
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Choose the items that need using up, pick how you feel like cooking, and get three full
            step-by-step recipes you can cook hands-free.
          </p>
        </header>

        {!signedIn && (
          <Card className="mb-5 p-4 text-sm">
            <p className="font-semibold">Sign in to pull in your scanned food.</p>
            <p className="mt-1 text-muted-foreground">
              You can still type ingredients below and build meals.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/auth">Sign in</Link>
            </Button>
          </Card>
        )}

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              1. What needs using up
            </h2>
            {scans.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {candidates.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing tracked yet — type an ingredient below, or{" "}
              <Link to="/scan" className="font-semibold underline">
                scan your fridge
              </Link>
              .
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {candidates.map((c) => {
                const on = selected.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggle(c.name)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-left text-sm transition",
                      on
                        ? "border-transparent bg-foreground text-background shadow-sm"
                        : "border-border bg-card hover:border-foreground/30",
                    )}
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold", URGENCY_CHIP[c.urgency])}>
                      {c.note}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTyped();
                }
              }}
              placeholder="Add another ingredient…"
              aria-label="Add another ingredient"
            />
            <Button variant="outline" onClick={addTyped}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card className="mt-4 p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            2. How do you want to cook?
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {COOK_METHODS.map((m) => (
              <Button
                key={m}
                size="sm"
                variant={method === m ? "default" : "outline"}
                onClick={() => setMethod(m)}
              >
                {METHOD_LABEL[m]}
              </Button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Time you've got
              </div>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={maxMinutes === t ? "default" : "outline"}
                    onClick={() => setMaxMinutes(t)}
                  >
                    {t} min
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Feeding
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 4, 6].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={servings === s ? "default" : "outline"}
                    onClick={() => setServings(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Button className="mt-5 w-full" size="lg" onClick={run} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your meals…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Build my leftover meals
              </>
            )}
          </Button>
        </Card>

        {build && (
          <section className="mt-8">
            <p className="mb-4 flex items-start gap-2 text-base font-medium">
              <ChefHat className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
              {build.headline}
            </p>
            <div className="space-y-4">
              {build.recipes.map((r) => (
                <Card key={r.title} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="gap-1">
                      <Flame className="h-3 w-3" /> {r.method}
                    </Badge>
                    <Badge variant="secondary">{r.time}</Badge>
                    <Badge variant="secondary">{r.servings}</Badge>
                  </div>
                  <h3 className="mt-2 font-display text-xl">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{r.blurb}</p>

                  {r.uses.length > 0 && (
                    <p className="mt-3 text-sm">
                      <span className="font-semibold">Uses up:</span> {r.uses.join(", ")}
                    </p>
                  )}
                  {r.alsoNeed.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-semibold">Also need:</span> {r.alsoNeed.join(", ")}
                    </p>
                  )}

                  <ol className="mt-4 space-y-2">
                    {r.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>

                  {r.chefTip && (
                    <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
                      <span className="font-semibold">Chef's tip:</span> {r.chefTip}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => setCook(r)}>
                      <ChefHat className="mr-2 h-4 w-4" /> Cook with me, step by step
                    </Button>
                    <AddRecipeToPlanButton
                      title={r.title}
                      ingredients={[...r.uses, ...r.alsoNeed]}
                      note={`${r.method} · ${r.time}`}
                    />
                  </div>

                </Card>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Want the quick version?{" "}
          <Link to="/leftovers" className="font-semibold underline">
            See your leftovers dashboard
          </Link>
          .
        </p>
      </main>

      <CookingMode
        open={!!cook}
        onClose={() => setCook(null)}
        title={cook?.title ?? ""}
        subtitle={cook ? `${cook.method} · ${cook.time} · ${cook.servings}` : undefined}
        steps={cook?.steps ?? []}
      />
    </div>
  );
}
