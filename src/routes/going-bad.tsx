import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  ChefHat,
  Loader2,
  Refrigerator,
  Sparkles,
  ArrowRight,
  Recycle,
  Play,
} from "lucide-react";
import { ChefAvatar } from "@/components/ChefAvatar";
import { CookingMode } from "@/components/CookingMode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SiteNav } from "@/components/SiteNav";
import { getUrgentItems } from "@/lib/scans.functions";
import { suggestRecipes } from "@/lib/fridge.functions";
import { supabase } from "@/integrations/supabase/client";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { dietLabel } from "@/lib/personalization";
import { toast } from "sonner";

export const Route = createFileRoute("/going-bad")({
  head: () => ({
    meta: [
      { title: "What's Going Bad First — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "See the ingredients about to spoil and get instant rescue recipes that use them up tonight. Save money, waste less, eat better.",
      },
      { property: "og:title", content: "What's Going Bad First — Rescue Tonight's Dinner" },
      {
        property: "og:description",
        content:
          "Triage your fridge in seconds. We sort what to use first and turn it into a real meal.",
      },
    ],
  }),
  component: GoingBadPage,
});

const FRESHNESS_STYLE: Record<string, { label: string; className: string }> = {
  questionable: {
    label: "Questionable",
    className: "bg-accent/15 text-accent border-accent/40",
  },
  "use-soon": {
    label: "Use Soon",
    className: "bg-warning/20 text-warning-foreground border-warning/40",
  },
  "throw-out": {
    label: "Risky",
    className: "bg-destructive/15 text-destructive border-destructive/40",
  },
};

function GoingBadPage() {
  const [user, setUser] = useState<any>(undefined); // undefined = loading, null = signed out
  const [cooking, setCooking] = useState<null | { title: string; subtitle?: string; steps: string[] }>(null);
  const { prefs } = useDietaryPrefs();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const getUrgentFn = useServerFn(getUrgentItems);
  const suggestRecipesFn = useServerFn(suggestRecipes);

  const urgentQuery = useQuery({
    queryKey: ["urgent-items"],
    queryFn: () => getUrgentFn(),
    enabled: !!user,
  });

  const recipesMut = useMutation({
    mutationFn: (items: string[]) =>
      suggestRecipesFn({
        data: {
          items,
          cuisine: "Anything Goes — prioritize using these urgent items",
          restrictions: prefs.map((p) => dietLabel(p)),
        },
      }),
    onError: (e: Error) => toast.error(e.message ?? "Couldn't fetch rescue recipes"),
  });

  const items = urgentQuery.data?.items ?? [];
  const heroImage = items.find((i) => i.imageUrl)?.imageUrl ?? null;

  // Auto-trigger rescue recipes the first time items load.
  useEffect(() => {
    if (items.length > 0 && !recipesMut.data && !recipesMut.isPending && !recipesMut.isError) {
      recipesMut.mutate(items.map((i) => i.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof items> = {
      questionable: [],
      "use-soon": [],
      "throw-out": [],
    };
    for (const it of items) g[it.freshness]?.push(it);
    return g;
  }, [items]);

  return (
    <div className="min-h-screen bg-background bg-welcome">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <section className="relative overflow-hidden rounded-3xl border border-destructive/30 bg-gradient-to-br from-[oklch(0.97_0.05_30)] via-[oklch(0.98_0.03_45)] to-[oklch(0.96_0.06_65)] p-6 shadow-[0_20px_60px_-20px_oklch(0.6_0.18_30/0.4)] sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">
              <AlertTriangle className="mr-1 h-3 w-3" /> Rescue mission
            </Badge>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Save money · Waste less
            </Badge>
          </div>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-[oklch(0.22_0.05_45)] sm:text-5xl md:text-6xl">
            What's going bad first
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[oklch(0.35_0.04_45)] sm:text-lg">
            We scan your saved fridge photos for items running out of time, then Chef Super J builds
            a meal around them — so you eat what you already paid for.
          </p>
        </section>

        {user === undefined ? (
          <Card className="mt-8 grid place-items-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Card>
        ) : user === null ? (
          <SignInPrompt />
        ) : urgentQuery.isLoading ? (
          <Card className="mt-8 grid place-items-center p-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              Reading your recent fridge scans…
            </p>
          </Card>
        ) : items.length === 0 ? (
          <EmptyState scanCount={urgentQuery.data?.scanCount ?? 0} />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-5">
              {heroImage && (
                <Card className="ring-paper overflow-hidden border-border/60 p-0">
                  <div className="relative aspect-[5/4] w-full bg-muted">
                    <img
                      src={heroImage}
                      alt="Your most recent fridge scan"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <span className="text-xs font-medium text-white/90">
                        From your most recent scan
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="ring-paper border-border/60 bg-card p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-2xl">Use these first</h2>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {items.length} items
                  </span>
                </div>
                <UrgentGroup
                  title="Inspect first — questionable"
                  freshness="questionable"
                  items={grouped.questionable}
                  icon={AlertTriangle}
                />
                <UrgentGroup
                  title="Use within 1–2 days"
                  freshness="use-soon"
                  items={grouped["use-soon"]}
                  icon={Clock}
                />
                <UrgentGroup
                  title="Risky — verify before eating"
                  freshness="throw-out"
                  items={grouped["throw-out"]}
                  icon={AlertTriangle}
                />
              </Card>

              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => recipesMut.mutate(items.map((i) => i.name))}
                disabled={recipesMut.isPending}
              >
                {recipesMut.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cooking up new ideas…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Suggest different rescue meals</>
                )}
              </Button>
            </div>

            <div className="space-y-5">
              <RescueRecipesPanel
                loading={recipesMut.isPending}
                error={recipesMut.error as Error | null}
                data={recipesMut.data}
                onRetry={() => recipesMut.mutate(items.map((i) => i.name))}
                onCook={(r) => setCooking({ title: r.title, subtitle: r.description, steps: r.steps })}
              />
            </div>
          </div>
        )}
      </main>
      {cooking && (
        <CookingMode
          open
          onClose={() => setCooking(null)}
          title={cooking.title}
          subtitle={cooking.subtitle}
          steps={cooking.steps}
        />
      )}
    </div>
  );
}

function UrgentGroup({
  title,
  freshness,
  items,
  icon: Icon,
}: {
  title: string;
  freshness: "questionable" | "use-soon" | "throw-out";
  items: { name: string; category: string; timeLeftLabel: string; notes: string }[];
  icon: typeof Clock;
}) {
  if (!items || items.length === 0) return null;
  const style = FRESHNESS_STYLE[freshness];
  return (
    <div className="mt-5">
      <div className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", style.className.split(" ").find((c) => c.startsWith("text-")))}>
        <Icon className="h-4 w-4" /> {title} ({items.length})
      </div>
      <div className="grid gap-2">
        {items.map((it, idx) => (
          <div
            key={`${it.name}-${idx}`}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium text-foreground">{it.name}</span>
                {it.category && (
                  <span className="text-xs text-muted-foreground">· {it.category}</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {it.timeLeftLabel || "Use soon"}
                {it.notes ? ` · ${it.notes}` : ""}
              </div>
            </div>
            <Badge variant="outline" className={cn("shrink-0 border", style.className)}>
              {style.label}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function RescueRecipesPanel({
  loading,
  error,
  data,
  onRetry,
  onCook,
}: {
  loading: boolean;
  error: Error | null;
  data: { recipes: any[] } | undefined;
  onRetry: () => void;
  onCook?: (recipe: any) => void;
}) {
  if (loading) {
    return (
      <Card className="ring-paper grid place-items-center border-dashed border-border/70 bg-card/60 p-8 text-center">
        <ChefAvatar className="h-14 w-14 animate-pulse" />
        <p className="mt-3 font-display text-lg">Chef Super J is plating up rescue meals…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Building dinner around the items about to spoil.
        </p>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="ring-paper border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="flex-1">
            <h2 className="font-display text-xl text-destructive">Couldn't build rescue meals</h2>
            <p className="mt-1 text-sm text-foreground/90">{error.message}</p>
            <Button onClick={onRetry} size="sm" className="mt-3">Try again</Button>
          </div>
        </div>
      </Card>
    );
  }
  if (!data) return null;
  const recipes = data.recipes ?? [];
  return (
    <Card className="ring-paper border-primary/30 bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Rescue meals tonight</h2>
        <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
          <ChefHat className="mr-1 h-3 w-3" /> Chef Super J
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Designed to use up what's going bad first.
      </p>
      <div className="mt-4 space-y-4">
        {recipes.map((r: any, i: number) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-background/60 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg">{r.title}</h3>
              {typeof r.timeMinutes === "number" && (
                <Badge variant="outline" className="border-border/60 text-xs">
                  {r.timeMinutes}m
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>

            {Array.isArray(r.usesFromFridge) && r.usesFromFridge.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-success">
                  Uses from your fridge
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {r.usesFromFridge.map((u: string, j: number) => (
                    <span
                      key={j}
                      className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(r.alsoNeed) && r.alsoNeed.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold">Also need:</span> {r.alsoNeed.join(", ")}
              </div>
            )}

            {r.chefTip && (
              <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-2.5 text-xs text-foreground/90">
                <span className="font-semibold text-accent">Chef tip ·</span> {r.chefTip}
              </div>
            )}
            {onCook && Array.isArray(r.steps) && r.steps.length > 0 && (
              <div className="mt-4">
                <Button onClick={() => onCook(r)} className="w-full font-semibold">
                  <Play className="mr-2 h-4 w-4" /> Start cooking — guide me step by step
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function SignInPrompt() {
  return (
    <Card className="mt-8 border-primary/30 bg-primary/5 p-8 text-center">
      <Refrigerator className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-3 font-display text-2xl">Sign in to triage your fridge</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        We use your saved fridge scans to spot what's about to spoil. Sign in to save scans and
        unlock the rescue list.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Scan a fridge first</Link>
        </Button>
      </div>
    </Card>
  );
}

function EmptyState({ scanCount }: { scanCount: number }) {
  return (
    <Card className="mt-8 border-success/30 bg-success/5 p-8 text-center">
      <Sparkles className="mx-auto h-10 w-10 text-success" />
      <h2 className="mt-3 font-display text-2xl">
        {scanCount === 0 ? "No saved scans yet" : "Nothing about to spoil — nice!"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {scanCount === 0
          ? "Save a fridge scan and we'll start triaging what to use first."
          : "Your recent scans look fresh. Scan your fridge again later — we'll keep watch."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/">
            <Refrigerator className="mr-2 h-4 w-4" /> Scan my fridge
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/rescue">
            <Recycle className="mr-2 h-4 w-4" /> Leftover rescue
          </Link>
        </Button>
      </div>
    </Card>
  );
}
