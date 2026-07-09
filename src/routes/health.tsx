import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Sparkles, Heart, Loader2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HEALTH_CATEGORIES, type HealthCategory } from "@/lib/health-content";
import { surpriseMeRecipe } from "@/lib/chef-ideas.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/health")({
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ cat: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Health & Specialized Meals — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Anti-inflammatory, brain-health, diabetic-friendly, keto, vegan, workout-fuel, elderly-friendly, and cancer-support meal ideas from Chef Super J.",
      },
    ],
  }),
  component: HealthPage,
});

function HealthPage() {
  const { cat } = Route.useSearch();
  const initial = HEALTH_CATEGORIES.find((c) => c.slug === cat) ?? HEALTH_CATEGORIES[0];
  const [active, setActive] = useState<HealthCategory>(initial);

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-primary">
          <Heart className="h-5 w-5" />
          <span className="text-xs uppercase tracking-widest">Health Modes</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl">Eat for how you feel.</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Chef Super J's curated meal modes — designed around real health goals, not fads. Pick a mode
          and Chef will pull a meal you can cook tonight.
        </p>
        <a
          href="/health-companion"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/15"
        >
          <Sparkles className="h-4 w-4" />
          New: Health Companion — symptom-aware meals, swaps & 5-min mode
        </a>

        <div className="mt-6 flex flex-wrap gap-2">
          {HEALTH_CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setActive(c)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active.slug === c.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-foreground hover:bg-secondary/70"
              }`}
            >
              <span className="mr-1">{c.emoji}</span>
              {c.title}
            </button>
          ))}
        </div>

        <CategoryDetail key={active.slug} category={active} />
      </main>
    </div>
  );
}

function CategoryDetail({ category }: { category: HealthCategory }) {
  const [loading, setLoading] = useState(false);
  const [idea, setIdea] = useState<{ title: string; why: string; steps: string[]; time_minutes: number } | null>(
    null,
  );

  async function generate() {
    setLoading(true);
    setIdea(null);
    try {
      const res = await surpriseMeRecipe({ data: { mood: category.aiPrompt } });
      setIdea(res);
    } catch (e: any) {
      toast.error(e?.message ?? "Chef is busy. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <Card className="p-6">
        <div className="text-3xl">{category.emoji}</div>
        <h2 className="mt-2 font-display text-2xl">{category.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{category.tagline}</p>
        <p className="mt-4 text-sm">{category.why}</p>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Pantry staples</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {category.staples.map((s) => (
              <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Quick meal ideas</div>
          <ul className="mt-2 space-y-2">
            {category.meals.map((m) => (
              <li key={m.name} className="rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.note}</div>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs uppercase tracking-widest">Chef's pick</span>
        </div>
        <h3 className="mt-2 font-display text-xl">Make me a {category.title} meal</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Chef Super J pulls a fresh idea aligned with this mode.
        </p>
        <Button onClick={generate} disabled={loading} className="mt-4">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Cooking it up…" : "Generate a meal"}
        </Button>

        {idea && (
          <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
            <div className="font-display text-lg">{idea.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">~{idea.time_minutes} min</div>
            {idea.why && <p className="mt-2 text-sm">{idea.why}</p>}
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              {idea.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
      </Card>
    </div>
  );
}
