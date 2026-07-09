import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Heart,
  Soup,
  Sparkles,
  Clock,
  ChefHat,
  Droplets,
  Brain,
  Activity,
  ArrowRight,
  Loader2,
  Utensils,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { SaveButton } from "@/components/SaveButton";

import {
  suggestSeniorMeals,
  SENIOR_FILTERS,
  SENIOR_CATEGORIES,
  SENIOR_PRIORITY_INGREDIENTS,
  type SeniorMealsResult,
} from "@/lib/seniors.functions";
import { toast } from "sonner";

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong.";
}

export const Route = createFileRoute("/seniors")({
  component: SeniorsPage,
  head: () => ({
    meta: [
      { title: "Easy for Seniors — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Gentle, easy meals for seniors, caregivers, and people in recovery — soft bites, one-pot meals, brain & heart support, low-effort cooking.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-6 text-center">
      <p className="font-display text-xl">Something went wrong.</p>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-center">Not found.</div>,
});

const CAREGIVER_PROMPTS = [
  { id: "parent" as const, emoji: "👨‍👩‍👧", title: "Cooking for Mom or Dad?" },
  { id: "recovery" as const, emoji: "💗", title: "Need an easy meal for recovery?" },
  { id: "self" as const, emoji: "🧓", title: "Looking for something soft and simple?" },
  { id: "caregiver" as const, emoji: "🤝", title: "Caring for someone today?" },
];

const HEALTH_PILLARS = [
  { icon: Brain, title: "Brain support", foods: "salmon, blueberries, eggs, oats, walnuts" },
  { icon: Heart, title: "Heart-friendly", foods: "olive oil, leafy greens, beans, oats, salmon" },
  { icon: Droplets, title: "Hydration", foods: "broths, soups, melon, cucumber, herbal teas" },
  { icon: Activity, title: "Easy protein", foods: "eggs, yogurt, tofu, fish, lentils" },
  { icon: Utensils, title: "Fiber-rich & gentle", foods: "oatmeal, sweet potato, banana, soft veg" },
];

function SeniorsPage() {
  const [audience, setAudience] = useState<"self" | "parent" | "recovery" | "caregiver">("parent");
  const [filters, setFilters] = useState<string[]>([]);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [itemsText, setItemsText] = useState("");

  const suggestFn = useServerFn(suggestSeniorMeals);
  const mealsMut = useMutation({
    mutationFn: (input: { items: string[]; filters: string[]; category?: string; audience: typeof audience }) =>
      suggestFn({ data: input }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const data: SeniorMealsResult | undefined = mealsMut.data;

  const items = useMemo(
    () =>
      itemsText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [itemsText],
  );

  const matchedPriority = useMemo(
    () =>
      items.filter((it) =>
        SENIOR_PRIORITY_INGREDIENTS.some((p) => it.toLowerCase().includes(p)),
      ),
    [items],
  );

  function toggleFilter(f: string) {
    setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function run() {
    mealsMut.mutate({ items, filters, category, audience });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[oklch(0.98_0.02_260)] via-background to-background">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        {/* Hero */}
        <section className="rounded-3xl border border-[oklch(0.85_0.06_260)]/60 bg-gradient-to-br from-[oklch(0.96_0.05_260)] via-[oklch(0.98_0.03_280)] to-[oklch(0.95_0.06_230)] p-6 shadow-[0_20px_60px_-30px_oklch(0.5_0.14_260/0.4)] sm:p-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.45_0.14_260)]">
            <Heart className="h-3.5 w-3.5" /> Easy for Seniors
          </div>
          <h1 className="mt-2 font-display text-3xl leading-tight tracking-tight text-[oklch(0.22_0.05_260)] sm:text-5xl">
            Gentle meals for the people you love.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[oklch(0.35_0.04_260)] sm:text-lg">
            Soft bites, one-pot meals, and reheat-friendly ideas for seniors,
            caregivers, and anyone healing. Less effort, more nutrition, simple cleanup.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAREGIVER_PROMPTS.map((p) => {
              const on = audience === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setAudience(p.id)}
                  aria-pressed={on}
                  className={[
                    "rounded-2xl border p-4 text-left transition active:scale-[0.98]",
                    on
                      ? "border-[oklch(0.5_0.14_260)] bg-white shadow-md"
                      : "border-[oklch(0.85_0.06_260)]/60 bg-white/70 hover:bg-white",
                  ].join(" ")}
                >
                  <div className="text-2xl">{p.emoji}</div>
                  <div className="mt-1 font-display text-base font-semibold text-[oklch(0.22_0.05_260)]">
                    {p.title}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Filters */}
        <section className="mt-8">
          <h2 className="font-display text-xl text-foreground">Pick the meals that fit today</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose any combination — Chef Super J will only suggest what matches.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SENIOR_FILTERS.map((f) => {
              const on = filters.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFilter(f)}
                  aria-pressed={on}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-[0.97]",
                    on
                      ? "border-[oklch(0.5_0.14_260)] bg-[oklch(0.5_0.14_260)] text-white"
                      : "border-border bg-background hover:border-[oklch(0.5_0.14_260)]/40 hover:bg-[oklch(0.5_0.14_260)]/5",
                  ].join(" ")}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </section>

        {/* Categories */}
        <section className="mt-6">
          <h2 className="font-display text-xl text-foreground">Or pick a meal moment</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {SENIOR_CATEGORIES.map((c) => {
              const on = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(on ? undefined : c)}
                  aria-pressed={on}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-[0.97]",
                    on
                      ? "border-[oklch(0.55_0.15_150)] bg-[oklch(0.55_0.15_150)] text-white"
                      : "border-border bg-background hover:border-[oklch(0.55_0.15_150)]/40 hover:bg-[oklch(0.55_0.15_150)]/5",
                  ].join(" ")}
                >
                  <Soup className="h-3 w-3" /> {c}
                </button>
              );
            })}
          </div>
        </section>

        {/* Ingredients on hand */}
        <Card className="mt-8 border-[oklch(0.85_0.06_260)]/40 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[oklch(0.45_0.14_260)]">
            <ChefHat className="h-3.5 w-3.5" /> What's already on hand?
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Type a few items (commas or new lines). Leave blank for senior-friendly staples.
          </p>
          <textarea
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            placeholder="eggs, oatmeal, banana, leftover chicken, broth, sweet potato…"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-[oklch(0.5_0.14_260)]/30"
            rows={3}
          />
          {matchedPriority.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-[oklch(0.55_0.15_150)]">
                Great for seniors:
              </span>
              {matchedPriority.slice(0, 6).map((m) => (
                <Badge key={m} variant="outline" className="border-[oklch(0.55_0.15_150)]/40 bg-[oklch(0.55_0.15_150)]/5 text-[oklch(0.4_0.12_150)]">
                  {m}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={run}
              disabled={mealsMut.isPending}
              className="bg-[oklch(0.5_0.14_260)] text-white hover:bg-[oklch(0.45_0.14_260)]"
            >
              {mealsMut.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cooking up ideas…</>
              ) : data ? (
                <><RefreshCw className="mr-2 h-4 w-4" /> Suggest again</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Suggest gentle meals</>
              )}
            </Button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Use a fresh scan instead <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* AI results */}
        {data && (
          <section className="mt-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[oklch(0.45_0.14_260)]">
              <Sparkles className="h-3.5 w-3.5" /> Chef Super J suggests
            </div>
            <h2 className="mt-1 font-display text-2xl">{data.headline}</h2>
            {data.hydrationReminder && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                <Droplets className="mt-0.5 h-4 w-4" />
                <span><span className="font-semibold">Hydration reminder:</span> {data.hydrationReminder}</span>
              </div>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {data.meals.map((m) => (
                <Card key={m.title} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg leading-tight">{m.title}</h3>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <Clock className="h-3 w-3" /> {m.timeMinutes}m
                      </span>
                      <SaveButton
                        category="senior"
                        title={m.title}
                        subtitle={m.why}
                        ingredients={[...m.usesItems, ...m.alsoNeed]}
                        tags={m.benefits}
                        variant="icon"
                      />
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">{m.why}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                      {m.texture} texture
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                      {m.effort.replace("-", " ")} effort
                    </Badge>
                    {m.reheatFriendly && (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-widest">
                        reheats well
                      </Badge>
                    )}
                    {m.benefits.slice(0, 3).map((b) => (
                      <Badge key={b} variant="outline" className="border-[oklch(0.55_0.15_150)]/40 bg-[oklch(0.55_0.15_150)]/5 text-[oklch(0.4_0.12_150)] text-[10px] uppercase tracking-widest">
                        {b}
                      </Badge>
                    ))}
                  </div>

                  {m.usesItems.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Uses:</span> {m.usesItems.join(", ")}
                    </p>
                  )}
                  {m.alsoNeed.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Also need:</span> {m.alsoNeed.join(", ")}
                    </p>
                  )}

                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground">
                    {m.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>

                  {m.caregiverNote && (
                    <div className="mt-3 rounded-lg border border-[oklch(0.85_0.06_260)]/40 bg-[oklch(0.96_0.05_260)]/40 p-2 text-xs text-[oklch(0.3_0.08_260)]">
                      <span className="font-semibold">Caregiver tip:</span> {m.caregiverNote}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Health pillars */}
        <section className="mt-12">
          <h2 className="font-display text-2xl text-foreground">Foods that gently support health</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HEALTH_PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.title} className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[oklch(0.96_0.05_260)] text-[oklch(0.45_0.14_260)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="font-display text-base font-semibold">{p.title}</div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{p.foods}</p>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
