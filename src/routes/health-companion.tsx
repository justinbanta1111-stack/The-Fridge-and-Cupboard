import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Baby,
  Sparkles,
  Loader2,
  ChefHat,
  Clock,
  Utensils,
  Smile,
  Sandwich,
  Moon,
  Carrot,
  Cookie,
  RefreshCw,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { batchKIdea } from "@/lib/batch-k.functions";

export const Route = createFileRoute("/health-companion")({
  head: () => ({
    meta: [
      { title: "Make It Easy for Mom — Kid-Friendly Meals · The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Fast, simple meals for busy moms. Picky eater solutions, quick lunches, easy family dinners, leftover ideas, hidden veggie meals, and after-school snacks.",
      },
    ],
  }),
  component: MakeItEasyForMom,
});

type Category = {
  id: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
};

const CATEGORIES: Category[] = [
  { id: "picky", label: "Picky Eater Meals", sub: "Mild flavors · familiar shapes", icon: <Smile className="h-5 w-5" /> },
  { id: "lunchbox", label: "Quick Kid Lunch", sub: "Packs well · tastes great cold", icon: <Sandwich className="h-5 w-5" /> },
  { id: "dinner20", label: "Easy Family Dinner", sub: "Ready in 20 minutes", icon: <Moon className="h-5 w-5" /> },
  { id: "leftovers", label: "Leftovers for Kids", sub: "Transform what you have", icon: <RefreshCw className="h-5 w-5" /> },
  { id: "hidden-veggie", label: "Hidden Veggie Ideas", sub: "Sneaky nutrition they will eat", icon: <Carrot className="h-5 w-5" /> },
  { id: "snacks", label: "Easy Snacks", sub: "Fast after-school bites", icon: <Cookie className="h-5 w-5" /> },
];

function MakeItEasyForMom() {
  const [ingredients, setIngredients] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [idea, setIdea] = useState<Awaited<ReturnType<typeof batchKIdea>> | null>(null);

  const fn = useServerFn(batchKIdea);

  const mut = useMutation({
    mutationFn: (variant: string) =>
      fn({
        data: {
          mode: "mom-easy",
          variant,
          items: ingredients
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: (r) => setIdea(r),
    onError: (e: Error) => toast.error(e.message ?? "Chef couldn't think of one. Try again."),
  });

  function pickCategory(id: string) {
    setActiveCategory(id);
    setIdea(null);
    mut.mutate(id);
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-2 text-primary">
          <Baby className="h-5 w-5" />
          <span className="text-xs uppercase tracking-widest">Family Kitchen</span>
        </div>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Make It Easy for Mom</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Real meals for real life. Pick a category, tell Chef what you have (or don't), and get a simple kid-friendly idea in seconds.
        </p>

        {/* Category Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => pickCategory(cat.id)}
                disabled={mut.isPending}
                className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/40 hover:bg-secondary/70"
                }`}
              >
                <div className={`${active ? "text-primary" : "text-muted-foreground"}`}>{cat.icon}</div>
                <div>
                  <div className="text-sm font-semibold leading-tight">{cat.label}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{cat.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Ingredients Input */}
        <Card className="mt-5 p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            What do you already have? (optional)
          </div>
          <Textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="e.g. chicken, rice, broccoli, cheese, eggs, bread"
            className="mt-2 min-h-[64px]"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Chef Super J will use these to build your meal idea.
          </p>
        </Card>

        {/* Loading */}
        {mut.isPending && (
          <Card className="mt-5 flex items-center justify-center gap-2 border-primary/30 bg-primary/5 p-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Chef Super J is cooking up an idea…</span>
          </Card>
        )}

        {/* Error */}
        {mut.error && (
          <Card className="mt-5 border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(mut.error as Error).message}
          </Card>
        )}

        {/* Result */}
        {idea && (
          <Card className="mt-5 border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
              <ChefHat className="h-3.5 w-3.5" />
              Chef's Pick
            </div>
            <h2 className="mt-1 font-display text-2xl">{idea.title}</h2>
            {idea.tagline && (
              <p className="mt-1 text-sm italic text-muted-foreground">{idea.tagline}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {idea.time_minutes} min
              </Badge>
              <Badge variant="outline" className="text-xs">
                {CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </Badge>
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Steps</div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                {idea.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (activeCategory) pickCategory(activeCategory);
                }}
                disabled={mut.isPending}
                className="gap-1"
              >
                <Sparkles className="h-4 w-4" /> Another idea
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIdea(null);
                  setActiveCategory(null);
                }}
              >
                Clear
              </Button>
            </div>
          </Card>
        )}

        {/* Empty state when no selection yet */}
        {!activeCategory && !idea && !mut.isPending && (
          <Card className="mt-5 flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <Utensils className="h-8 w-8 text-primary/40" />
            <p>Pick a category above to get a simple, kid-friendly meal idea.</p>
            <p className="text-xs">No personal questions. No health check-ins. Just fast family food.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
