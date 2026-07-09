import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SiteNav } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  ALLERGY_CHOICES, CUISINE_CHOICES, DIET_CHOICES, GOAL_CHOICES,
  getPremiumPrefs, savePremiumPrefs, type PremiumPrefs,
} from "@/lib/premium-prefs";
import { generatePremiumRecs, type PremiumRecsResult } from "@/lib/premium-recs.functions";
import {
  addFavorite, listFavorites, removeFavorite, importFavorites,
  type FavoriteKind, type FavoriteRow,
} from "@/lib/premium-favorites.functions";
import {
  Sparkles, Crown, ChefHat, Clock, Utensils, ShoppingBasket,
  CalendarDays, ArrowRight, Loader2, Lock, Check, Heart, Trash2,
  Download, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/premium-recommendations")({
  head: () => ({
    meta: [
      { title: "Premium Personalized Recommendations | The Fridge and Cupboard" },
      { name: "description", content: "Tell Chef Super J your food preferences and get personalized ingredient ideas, recipes, and a weekly meal plan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PremiumRecsPage,
});

type AuthState = "loading" | "anon" | "no-sub" | "ok";

function PremiumRecsPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [prefs, setPrefs] = useState<PremiumPrefs>(() => getPremiumPrefs());
  const [results, setResults] = useState<PremiumRecsResult | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!alive) return;
      if (!userRes.user) { setAuthState("anon"); return; }
      const env = getStripeEnvironment();
      const { data } = await supabase
        .from("subscriptions")
        .select("status,current_period_end")
        .eq("user_id", userRes.user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const active = !!data && (
        (["active", "trialing", "past_due"].includes(data.status) &&
          (!data.current_period_end || new Date(data.current_period_end) > new Date()))
        || (data.status === "canceled" && data.current_period_end && new Date(data.current_period_end) > new Date())
      );
      setAuthState(active ? "ok" : "no-sub");
    })();
    return () => { alive = false; };
  }, []);

  const runFn = useServerFn(generatePremiumRecs);
  const mutation = useMutation({
    mutationFn: async () => runFn({ data: {
      diets: prefs.diets, allergies: prefs.allergies, cuisines: prefs.cuisines,
      goals: prefs.goals, household: prefs.household,
      budgetPerMeal: prefs.budgetPerMeal, notes: prefs.notes,
    } }),
    onSuccess: (r) => { setResults(r); toast.success("Your personalized plan is ready"); },
    onError: (e: Error) => {
      if (e.message.includes("PREMIUM_REQUIRED")) {
        toast.error("Premium subscription required");
        setAuthState("no-sub");
      } else {
        toast.error(e.message || "Couldn't generate recommendations");
      }
    },
  });

  function toggle(key: "diets" | "allergies" | "cuisines" | "goals", v: string) {
    setPrefs((p) => {
      const cur = p[key];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...p, [key]: next };
    });
  }

  function onGenerate() {
    savePremiumPrefs(prefs);
    setResults(null);
    mutation.mutate();
  }

  if (authState === "loading") {
    return <Shell><div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div></Shell>;
  }

  if (authState === "anon") {
    return (
      <Shell>
        <Card className="p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 font-display text-2xl">Sign in to personalize</h2>
          <p className="mt-2 text-muted-foreground">Create an account or sign in to start your free 3-day trial and unlock personalized recommendations.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild><Link to="/auth">Sign in</Link></Button>
            <Button asChild variant="outline"><Link to="/pro">See plans</Link></Button>
          </div>
        </Card>
      </Shell>
    );
  }

  if (authState === "no-sub") {
    return (
      <Shell>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-8 text-center">
          <Crown className="mx-auto h-10 w-10 text-accent" />
          <h2 className="mt-3 font-display text-2xl">Premium feature</h2>
          <p className="mt-2 text-muted-foreground">Personalized ingredient ideas, full recipes, and a weekly meal plan tailored to your preferences are part of Premium ($5.99/mo). Start your free 3-day trial.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild><Link to="/pro">Start free trial</Link></Button>
            <Button asChild variant="outline"><Link to="/">Back home</Link></Button>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card className="p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Your food preferences
        </div>
        <h1 className="mt-1 font-display text-3xl">Tell Chef Super J what you eat</h1>
        <p className="mt-1 text-sm text-muted-foreground">We'll generate ingredient ideas, full recipes, and a 7-day plan tailored to you.</p>

        <ChipGroup title="Diet & restrictions" choices={DIET_CHOICES} selected={prefs.diets} onToggle={(v) => toggle("diets", v)} />
        <ChipGroup title="Allergies (we'll strictly avoid)" choices={ALLERGY_CHOICES} selected={prefs.allergies} onToggle={(v) => toggle("allergies", v)} accent="destructive" />
        <ChipGroup title="Cuisines you love" choices={CUISINE_CHOICES} selected={prefs.cuisines} onToggle={(v) => toggle("cuisines", v)} />
        <ChipGroup title="Goals" choices={GOAL_CHOICES} selected={prefs.goals} onToggle={(v) => toggle("goals", v)} />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Household size</span>
            <Input type="number" min={1} max={20} value={prefs.household}
              onChange={(e) => setPrefs((p) => ({ ...p, household: Math.max(1, Number(e.target.value) || 1) }))} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Budget per meal (USD, optional)</span>
            <Input type="number" min={0} step={0.5} value={prefs.budgetPerMeal ?? ""}
              onChange={(e) => setPrefs((p) => ({ ...p, budgetPerMeal: e.target.value ? Number(e.target.value) : undefined }))} />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Anything else? (optional)</span>
          <Textarea rows={2} maxLength={500} value={prefs.notes ?? ""}
            placeholder="e.g., kids hate mushrooms, my partner is bulking, I cook on weekends only"
            onChange={(e) => setPrefs((p) => ({ ...p, notes: e.target.value }))} />
        </label>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Saved automatically on your device. Update anytime.</p>
          <Button onClick={onGenerate} disabled={mutation.isPending} size="lg" className="bg-primary uppercase tracking-widest">
            {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <>Generate my plan <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      </Card>

      <FavoritesSection />

      {results && <ResultsWithFavs data={results} />}
    </Shell>
  );
}

function ResultsWithFavs({ data }: { data: PremiumRecsResult }) {
  const fav = useFavorites();
  return <Results data={data} fav={fav} />;
}

function useFavorites() {
  const qc = useQueryClient();
  const listFn = useServerFn(listFavorites);
  const addFn = useServerFn(addFavorite);
  const removeFn = useServerFn(removeFavorite);

  const query = useQuery({
    queryKey: ["premium-favorites"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const keys = useMemo(() => {
    const s = new Set<string>();
    (query.data ?? []).forEach((f) => s.add(`${f.kind}::${f.title}`));
    return s;
  }, [query.data]);

  const isFav = (kind: FavoriteKind, title: string) => keys.has(`${kind}::${title}`);

  const add = useMutation({
    mutationFn: (v: { kind: FavoriteKind; title: string; payload: unknown }) =>
      addFn({ data: { kind: v.kind, title: v.title, payload: v.payload } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["premium-favorites"] }); toast.success("Saved to favorites"); },
    onError: (e: Error) => toast.error(e.message || "Couldn't save"),
  });

  const remove = useMutation({
    mutationFn: (v: { kind: FavoriteKind; title: string }) =>
      removeFn({ data: { kind: v.kind, title: v.title } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["premium-favorites"] }); },
    onError: (e: Error) => toast.error(e.message || "Couldn't remove"),
  });

  const toggle = (kind: FavoriteKind, title: string, payload: unknown) => {
    if (isFav(kind, title)) remove.mutate({ kind, title });
    else add.mutate({ kind, title, payload });
  };

  return { favorites: query.data ?? [], isLoading: query.isLoading, isFav, toggle, remove };
}

function FavBtn({
  kind, title, payload, fav,
}: {
  kind: FavoriteKind; title: string; payload: unknown;
  fav: ReturnType<typeof useFavorites>;
}) {
  const active = fav.isFav(kind, title);
  return (
    <button
      type="button"
      onClick={() => fav.toggle(kind, title, payload)}
      aria-label={active ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
        active ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary",
      )}
    >
      <Heart className={cn("h-4 w-4", active && "fill-current")} />
    </button>
  );
}

function FavoritesSection() {
  const fav = useFavorites();
  const qc = useQueryClient();
  const importFn = useServerFn(importFavorites);
  const [open, setOpen] = useState(true);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    const items = fav.favorites.map((f) => ({ kind: f.kind, title: f.title, payload: f.payload }));
    const blob = new Blob(
      [JSON.stringify({ app: "fridge-cupboard", type: "premium-favorites", version: 1, exportedAt: new Date().toISOString(), items }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `premium-favorites-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} favorite${items.length === 1 ? "" : "s"}`);
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : parsed?.items;
      if (!Array.isArray(items) || items.length === 0) throw new Error("No favorites found in file");
      const res = await importFn({ data: { items } });
      await qc.invalidateQueries({ queryKey: ["premium-favorites"] });
      toast.success(`Imported ${res.imported} favorite${res.imported === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't import file");
    } finally {
      setImporting(false);
    }
  };

  if (fav.isLoading) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading your favorites…
      </Card>
    );
  }
  const items = fav.favorites;
  return (
    <Card className="p-6">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Heart className="h-5 w-5 text-destructive" /> Your saved favorites
          <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
        </h2>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={items.length === 0}>
              <Download className="mr-1.5 h-4 w-4" /> Export backup
            </Button>
            <label className={cn(
              "inline-flex h-9 cursor-pointer items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent",
              importing && "pointer-events-none opacity-60",
            )}>
              {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
              {importing ? "Importing…" : "Import backup"}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void handleImportFile(f);
                }}
              />
            </label>
            <span className="text-xs text-muted-foreground">JSON backup — restores across devices.</span>
          </div>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Tap the heart on any recipe, quick idea, or ingredient below to save it here. Favorites stay with you across devices and sessions.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <FavGroup label="Recipes" kind="recipe" items={items} fav={fav} />
              <FavGroup label="Quick ideas" kind="quick" items={items} fav={fav} />
              <FavGroup label="Ingredient ideas" kind="ingredient" items={items} fav={fav} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function FavGroup({
  label, kind, items, fav,
}: { label: string; kind: FavoriteKind; items: FavoriteRow[]; fav: ReturnType<typeof useFavorites> }) {
  const list = items.filter((i) => i.kind === kind);
  if (list.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {list.map((f) => {
          const p = f.payload as Record<string, unknown>;
          const blurb = (p?.description as string) || (p?.blurb as string) || (p?.why as string) || "";
          return (
            <div key={f.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="min-w-0">
                <div className="truncate font-display text-base">{f.title}</div>
                {blurb && <p className="line-clamp-2 text-sm text-muted-foreground">{blurb}</p>}
              </div>
              <button
                type="button"
                onClick={() => fav.remove.mutate({ kind: f.kind, title: f.title })}
                aria-label="Remove favorite"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <SiteNav />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function ChipGroup({
  title, choices, selected, onToggle, accent,
}: { title: string; choices: string[]; selected: string[]; onToggle: (v: string) => void; accent?: "destructive" }) {
  return (
    <div className="mt-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {choices.map((c) => {
          const active = selected.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => onToggle(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                active
                  ? accent === "destructive"
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
              )}
            >
              {active && <Check className="mr-1 inline h-3 w-3" />}
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Results({ data, fav }: { data: PremiumRecsResult; fav: ReturnType<typeof useFavorites> }) {
  return (
    <div className="space-y-6">
      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-card to-primary/5 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
          <ChefHat className="h-3.5 w-3.5" /> From Chef Super J
        </div>
        <p className="mt-2 text-base">{data.summary}</p>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl"><ShoppingBasket className="h-5 w-5 text-primary" /> Ingredient ideas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.ingredientIdeas.map((i, k) => (
            <div key={k} className="rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-base">{i.name}</div>
                  <p className="text-sm text-muted-foreground">{i.why}</p>
                </div>
                <FavBtn kind="ingredient" title={i.name} payload={i} fav={fav} />
              </div>
              {i.usedIn.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {i.usedIn.map((u, j) => <Badge key={j} variant="outline" className="text-[10px]">{u}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl"><Clock className="h-5 w-5 text-primary" /> Quick ideas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.quickIdeas.map((q, k) => (
            <div key={k} className="rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-base">{q.title}</div>
                  <p className="text-sm text-muted-foreground">{q.blurb}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{q.minutes} min</span>
                  <FavBtn kind="quick" title={q.title} payload={q} fav={fav} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl"><Utensils className="h-5 w-5 text-primary" /> Full recipes</h2>
        <div className="mt-4 space-y-5">
          {data.recipes.map((r, k) => (
            <div key={k} className="rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display text-xl">{r.title}</div>
                    <FavBtn kind="recipe" title={r.title} payload={r} fav={fav} />
                  </div>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.cuisine} · {r.totalMinutes} min · serves {r.servings}
                  {r.estimatedCostUsd ? ` · ~$${r.estimatedCostUsd.toFixed(2)}` : ""}
                </div>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Ingredients</div>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {r.ingredients.map((i, j) => <li key={j}>{i}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Steps</div>
                  <ol className="mt-1 list-decimal pl-5 text-sm">
                    {r.steps.map((s, j) => <li key={j}>{s}</li>)}
                  </ol>
                </div>
              </div>
              {r.nutritionHighlights?.length ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.nutritionHighlights.map((n, j) => <Badge key={j} variant="outline" className="text-[10px]">{n}</Badge>)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>


      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl"><CalendarDays className="h-5 w-5 text-primary" /> Your 7-day plan</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2 pr-3">Day</th>
                <th className="py-2 pr-3">Breakfast</th>
                <th className="py-2 pr-3">Lunch</th>
                <th className="py-2">Dinner</th>
              </tr>
            </thead>
            <tbody>
              {data.weeklyPlan.map((d, k) => (
                <tr key={k} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pr-3 font-semibold">{d.day}</td>
                  <td className="py-2 pr-3">{d.breakfast}</td>
                  <td className="py-2 pr-3">{d.lunch}</td>
                  <td className="py-2">{d.dinner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
