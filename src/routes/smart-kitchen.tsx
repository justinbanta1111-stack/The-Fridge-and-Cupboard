import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Sparkles,
  PiggyBank,
  Zap,
  AlarmClock,
  FlaskConical,
  Boxes,
  Repeat,
  Replace,
  Scale,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import {
  budgetMeals,
  emergencyMeal,
  flavorPairings,
  mealPrepPlan,
  leftoverTransform,
} from "@/lib/smart-kitchen.functions";

export const Route = createFileRoute("/smart-kitchen")({
  head: () => ({
    meta: [
      { title: "Smart Kitchen Assistant — Chef Super J's Intelligence Tools" },
      {
        name: "description",
        content:
          "Premium AI tools for your kitchen: substitutions, portion scaling, budget meals, emergency meals, flavor pairing, meal prep, and leftover transforms.",
      },
    ],
  }),
  component: SmartKitchenPage,
});

const TOOLS = [
  { id: "subs", icon: Replace, label: "Substitution Wizard", blurb: "Out of an ingredient? Smart swaps." },
  { id: "portion", icon: Scale, label: "Portion Adjuster", blurb: "Scale 1 person to a whole church." },
  { id: "budget", icon: PiggyBank, label: "Budget Meal Mode", blurb: "Cheapest meals from what you have." },
  { id: "emergency", icon: Zap, label: "Emergency Meal Mode", blurb: "Barely anything in the kitchen? Done." },
  { id: "expiring", icon: AlarmClock, label: "What's Going Bad First", blurb: "Use it tonight, freeze, or preserve." },
  { id: "flavor", icon: FlaskConical, label: "Flavor Pairing Engine", blurb: "Herbs, spices, oils, acids — why they work." },
  { id: "prep", icon: Boxes, label: "Meal Prep Mode", blurb: "Batch + freezer + weekly plan." },
  { id: "leftover", icon: Repeat, label: "Leftover Transformer", blurb: "One meal → 2–3 brand new meals." },
] as const;
type ToolId = typeof TOOLS[number]["id"];

function SmartKitchenPage() {
  const [active, setActive] = useState<ToolId>("subs");

  return (
    <div className="min-h-screen bg-background pb-20">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl">Smart Kitchen Assistant</h1>
            <p className="text-sm text-muted-foreground">8 premium intelligence tools, one screen.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-sm font-semibold leading-tight">{t.label}</div>
                <div className="text-[11px] leading-snug text-muted-foreground">{t.blurb}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {active === "subs" && <SubsPanel />}
          {active === "portion" && <PortionPanel />}
          {active === "budget" && <BudgetPanel />}
          {active === "emergency" && <EmergencyPanel />}
          {active === "expiring" && <ExpiringPanel />}
          {active === "flavor" && <FlavorPanel />}
          {active === "prep" && <PrepPanel />}
          {active === "leftover" && <LeftoverPanel />}
        </div>
      </main>
    </div>
  );
}

function SubsPanel() {
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Substitution Wizard</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Full wizard lives in Kitchen Tools — instant swaps, ratios, and chef notes.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
        <li className="rounded-lg bg-secondary/50 p-3">sour cream → Greek yogurt (1:1)</li>
        <li className="rounded-lg bg-secondary/50 p-3">eggs → flax egg or applesauce</li>
        <li className="rounded-lg bg-secondary/50 p-3">butter → oil (¾ amount)</li>
        <li className="rounded-lg bg-secondary/50 p-3">cream → milk + butter</li>
      </ul>
      <Button asChild className="mt-5">
        <Link to="/kitchen-tools">Open Substitution Wizard</Link>
      </Button>
    </Card>
  );
}

function PortionPanel() {
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Portion Adjuster</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Scale for 1, 2, 4, family, or church/catering size. Smart fraction rounding included.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 text-sm">
        {[
          { n: 1, l: "Just me" },
          { n: 2, l: "Couple" },
          { n: 4, l: "Family" },
          { n: 8, l: "Big family" },
          { n: 50, l: "Church/catering" },
        ].map((p) => (
          <div key={p.n} className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-lg font-bold text-primary">{p.n}</div>
            <div className="text-[11px] text-muted-foreground">{p.l}</div>
          </div>
        ))}
      </div>
      <Button asChild className="mt-5">
        <Link to="/kitchen-tools">Open Portion Adjuster</Link>
      </Button>
    </Card>
  );
}

function BudgetPanel() {
  const [items, setItems] = useState("rice, beans, eggs, onion, garlic, canned tomatoes, cheese");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof budgetMeals>> | null>(null);
  async function go() {
    const list = items.split(",").map((s) => s.trim()).filter(Boolean);
    if (!list.length) return;
    setLoading(true);
    setData(null);
    try {
      const r = await budgetMeals({ data: { items: list } });
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fetch budget meals.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Budget Meal Mode</h2>
      <p className="mt-1 text-sm text-muted-foreground">Cheapest meals from what's in your kitchen, with cost per serving.</p>
      <Textarea value={items} onChange={(e) => setItems(e.target.value)} rows={2} className="mt-4" placeholder="Comma-separated items" />
      <Button onClick={go} disabled={loading} className="mt-3">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PiggyBank className="mr-2 h-4 w-4" />}
        Find cheapest meals
      </Button>
      {data && (
        <div className="mt-5 space-y-3">
          {data.meals.map((m, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/60 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold">{m.title}</div>
                <div className="text-sm font-bold text-primary">{m.cost_per_serving}/serving</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{m.why_cheap}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.uses.map((u, j) => (
                  <span key={j} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{u}</span>
                ))}
              </div>
              {!m.needs_shopping && (
                <div className="mt-2 inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                  No shopping needed
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EmergencyPanel() {
  const [items, setItems] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof emergencyMeal>> | null>(null);
  async function go(useBareMin = false) {
    const fallback = useBareMin ? ["eggs", "bread"] : items.split(",").map((s) => s.trim()).filter(Boolean);
    if (!fallback.length) {
      toast.error("Add 2–3 ingredients or tap 'I barely have anything'.");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const r = await emergencyMeal({ data: { items: fallback.slice(0, 8) } });
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Emergency Meal Mode</h2>
      <p className="mt-1 text-sm text-muted-foreground">2–3 ingredients is enough. Chef has your back.</p>
      <Input value={items} onChange={(e) => setItems(e.target.value)} placeholder="e.g. eggs, pasta, butter" className="mt-4" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => go(false)} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          Make me a meal
        </Button>
        <Button variant="outline" onClick={() => go(true)} disabled={loading}>
          I barely have anything
        </Button>
      </div>
      {data && (
        <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-display text-lg">{data.title}</div>
            <div className="text-xs text-muted-foreground">~{data.time_minutes} min</div>
          </div>
          <p className="mt-1 text-sm italic text-primary">{data.pep_talk}</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            {data.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}
    </Card>
  );
}

function ExpiringPanel() {
  const labels = [
    { l: "Use Tonight", c: "bg-destructive/15 text-destructive border-destructive/30" },
    { l: "Use in 24 Hours", c: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
    { l: "Freeze Now", c: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    { l: "Preserve Now", c: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  ];
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">What's Going Bad First</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your live expiration tracker lives in the Going Bad room — prioritized by urgency.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {labels.map((x) => (
          <div key={x.l} className={`rounded-lg border p-3 text-center text-xs font-semibold ${x.c}`}>{x.l}</div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/going-bad">Open Going Bad room</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/preserve">Preserve It</Link>
        </Button>
      </div>
    </Card>
  );
}

function FlavorPanel() {
  const [ing, setIng] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof flavorPairings>> | null>(null);
  async function go() {
    if (!ing.trim()) return;
    setLoading(true);
    setData(null);
    try {
      const r = await flavorPairings({ data: { ingredient: ing.trim() } });
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? "No pairings found.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Flavor Pairing Engine</h2>
      <p className="mt-1 text-sm text-muted-foreground">Herbs, spices, oils, acids, sauces — and the why.</p>
      <div className="mt-4 flex gap-2">
        <Input value={ing} onChange={(e) => setIng(e.target.value)} placeholder="e.g. chicken, salmon, sweet potato" onKeyDown={(e) => e.key === "Enter" && go()} />
        <Button onClick={go} disabled={loading || !ing.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
      </div>
      {data && (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {data.pairings.map((p, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold">{p.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-primary">{p.type}</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{p.why}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PrepPanel() {
  const [items, setItems] = useState("chicken, rice, broccoli, carrots, olive oil, garlic, soy sauce");
  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof mealPrepPlan>> | null>(null);
  async function go() {
    const list = items.split(",").map((s) => s.trim()).filter(Boolean);
    if (!list.length) return;
    setLoading(true);
    setData(null);
    try {
      const r = await mealPrepPlan({ data: { items: list, people, days } });
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't build prep plan.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Meal Prep Mode</h2>
      <p className="mt-1 text-sm text-muted-foreground">Batch cook + freezer meals + weekly plan + leftover ideas.</p>
      <Textarea value={items} onChange={(e) => setItems(e.target.value)} rows={2} className="mt-4" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-sm">People<Input type="number" min={1} max={20} value={people} onChange={(e) => setPeople(Math.max(1, parseInt(e.target.value) || 1))} className="mt-1" /></label>
        <label className="text-sm">Days<Input type="number" min={2} max={7} value={days} onChange={(e) => setDays(Math.max(2, Math.min(7, parseInt(e.target.value) || 5)))} className="mt-1" /></label>
      </div>
      <Button onClick={go} disabled={loading} className="mt-3">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Boxes className="mr-2 h-4 w-4" />}
        Build prep plan
      </Button>
      {data && (
        <div className="mt-5 space-y-3">
          {data.batches.map((b, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/60 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold">{b.title}</div>
                <div className="text-xs text-primary">{b.makes_servings} servings{b.freezer_friendly && " · freezer-friendly"}</div>
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {b.steps.map((s, j) => <li key={j}>{s}</li>)}
              </ol>
            </div>
          ))}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm italic text-primary">
            {data.weekly_tip}
          </div>
        </div>
      )}
    </Card>
  );
}

function LeftoverPanel() {
  const [meal, setMeal] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof leftoverTransform>> | null>(null);
  async function go() {
    if (!meal.trim()) return;
    setLoading(true);
    setData(null);
    try {
      const r = await leftoverTransform({ data: { meal: meal.trim() } });
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't transform.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl">Leftover Transformer</h2>
      <p className="mt-1 text-sm text-muted-foreground">Turn one meal into 2–3 brand-new ones.</p>
      <div className="mt-4 flex gap-2">
        <Input value={meal} onChange={(e) => setMeal(e.target.value)} placeholder="e.g. roast chicken, rice, roasted veggies" onKeyDown={(e) => e.key === "Enter" && go()} />
        <Button onClick={go} disabled={loading || !meal.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
        </Button>
      </div>
      {data && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {data.transforms.map((t, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/60 p-4">
              <div className="font-semibold">{t.new_meal}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t.how}</div>
              {t.bonus_items.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.bonus_items.map((b, j) => (
                    <span key={j} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">+ {b}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
