import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Replace, Scale, Sparkles } from "lucide-react";
import { ingredientSubstitute } from "@/lib/chef-ideas.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen-tools")({
  head: () => ({
    meta: [
      { title: "Kitchen Tools — Substitutions & Portion Adjuster" },
      {
        name: "description",
        content:
          "Out of an ingredient? Need to scale a recipe up or down? Chef Super J's kitchen tools handle substitutions and portion math.",
      },
    ],
  }),
  component: KitchenToolsPage,
});

function KitchenToolsPage() {
  const [tab, setTab] = useState<"sub" | "scale">("sub");

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl">Kitchen Tools</h1>
        <p className="mt-2 text-muted-foreground">Two of Chef's most-asked-for tools, one screen.</p>

        <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setTab("sub")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
              tab === "sub" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Replace className="h-4 w-4" /> Substitutions
          </button>
          <button
            onClick={() => setTab("scale")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
              tab === "scale" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Scale className="h-4 w-4" /> Portion Adjuster
          </button>
        </div>

        <div className="mt-6">{tab === "sub" ? <SubstitutionTool /> : <PortionTool />}</div>
      </main>
    </div>
  );
}

function SubstitutionTool() {
  const [ingredient, setIngredient] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ subs: { name: string; ratio: string; note: string }[] } | null>(null);

  async function lookup() {
    if (!ingredient.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await ingredientSubstitute({ data: { ingredient: ingredient.trim(), context: context.trim() || undefined } });
      setResult(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Chef couldn't find a sub. Try rephrasing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Out of something? Swap it.</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tell Chef what you're missing and what you're cooking.</p>
      <div className="mt-4 grid gap-3">
        <Input
          placeholder="Ingredient you're out of (e.g. buttermilk)"
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <Input
          placeholder="What you're making (optional, e.g. pancakes)"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <Button onClick={lookup} disabled={loading || !ingredient.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Asking Chef…" : "Find a swap"}
        </Button>
      </div>

      {result && (
        <div className="mt-5 space-y-2">
          {result.subs.map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-primary">{s.ratio}</div>
              </div>
              {s.note && <div className="mt-1 text-sm text-muted-foreground">{s.note}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const fractionLabels: [number, string][] = [
  [0, ""],
  [0.125, "⅛"],
  [0.25, "¼"],
  [0.333, "⅓"],
  [0.5, "½"],
  [0.667, "⅔"],
  [0.75, "¾"],
];

function prettyAmount(n: number): string {
  if (!isFinite(n) || n < 0) return "0";
  if (n === 0) return "0";
  if (n < 0.06) return "a pinch";
  const whole = Math.floor(n);
  const frac = n - whole;
  let bestLabel = "";
  let bestDiff = 1;
  for (const [v, label] of fractionLabels) {
    const d = Math.abs(frac - v);
    if (d < bestDiff) {
      bestDiff = d;
      bestLabel = label;
    }
  }
  if (bestDiff > 0.06) {
    return Number(n.toFixed(2)).toString();
  }
  if (whole === 0) return bestLabel || "0";
  return bestLabel ? `${whole} ${bestLabel}` : `${whole}`;
}

function PortionTool() {
  const [origServings, setOrigServings] = useState(4);
  const [newServings, setNewServings] = useState(6);
  const [recipe, setRecipe] = useState(
    "2 cups flour\n1 cup sugar\n0.5 tsp salt\n3 eggs\n1 cup milk",
  );

  const scale = useMemo(
    () => (origServings > 0 ? newServings / origServings : 1),
    [origServings, newServings],
  );

  const scaled = useMemo(() => {
    return recipe
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const m = line.match(/^\s*([\d.\/]+)\s+(.+)$/);
        if (!m) return { original: line, scaled: line, isScaled: false };
        let value = 0;
        if (m[1].includes("/")) {
          const [a, b] = m[1].split("/").map(Number);
          value = b ? a / b : 0;
        } else {
          value = parseFloat(m[1]);
        }
        if (!isFinite(value)) return { original: line, scaled: line, isScaled: false };
        const newVal = value * scale;
        return { original: line, scaled: `${prettyAmount(newVal)} ${m[2]}`, isScaled: true };
      });
  }, [recipe, scale]);

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Scale any recipe.</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste ingredients (one per line, amount first). Chef rounds to friendly fractions.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Original servings
          <Input
            type="number"
            min={1}
            value={origServings}
            onChange={(e) => setOrigServings(Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-1"
          />
        </label>
        <label className="text-sm">
          New servings
          <Input
            type="number"
            min={1}
            value={newServings}
            onChange={(e) => setNewServings(Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-1"
          />
        </label>
      </div>

      <Textarea
        value={recipe}
        onChange={(e) => setRecipe(e.target.value)}
        rows={6}
        className="mt-4 font-mono text-sm"
      />

      <div className="mt-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Scaled for {newServings} servings ({scale.toFixed(2)}×)
        </div>
        <ul className="mt-2 space-y-1.5">
          {scaled.map((line, i) => (
            <li
              key={i}
              className={`rounded-md px-3 py-2 text-sm ${
                line.isScaled ? "bg-primary/10 font-medium" : "bg-secondary/40 text-muted-foreground"
              }`}
            >
              {line.scaled}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
