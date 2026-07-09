import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import {
  detectPatterns, predictAlerts, forecastMeals, missingPiece,
  restockSuggestions, personalityScore,
} from "@/lib/smart-insights";
import { getRecentInventory } from "@/lib/savings.functions";
import { hiddenPotential } from "@/lib/smart-insights.functions";
import {
  Brain, AlertTriangle, Utensils, ShoppingBag, PackagePlus, Sparkles, ArrowLeft, Loader2, Wand2,
} from "lucide-react";

export const Route = createFileRoute("/smart-insights")({
  head: () => ({
    meta: [
      { title: "Smart Insights — The Fridge and Cupboard" },
      { name: "description", content: "Patterns, predictions, and hidden meal potential from your fridge — Smart Fridge Vision Layer." },
    ],
  }),
  component: SmartInsightsPage,
});

function SmartInsightsPage() {
  const getInventoryFn = useServerFn(getRecentInventory);
  const hiddenFn = useServerFn(hiddenPotential);

  const inventoryQuery = useQuery({
    queryKey: ["recent-inventory-insights"],
    queryFn: () => getInventoryFn(),
  });

  // Pull a quick freshness map from local inventory if available
  const inventory = inventoryQuery.data?.items ?? [];
  const itemsWithFresh = useMemo(() => inventory.map((n: string) => ({ name: n })), [inventory]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const patterns = useMemo(() => detectPatterns(), [tick]);
  const predictions = useMemo(() => predictAlerts(itemsWithFresh), [itemsWithFresh, tick]);
  const forecast = useMemo(() => forecastMeals(inventory), [inventory]);
  const missing = useMemo(() => missingPiece(inventory), [inventory]);
  const restock = useMemo(() => restockSuggestions(inventory), [inventory, tick]);
  const score = useMemo(() => personalityScore(itemsWithFresh), [itemsWithFresh, tick]);

  const hiddenMut = useMutation({
    mutationFn: () => hiddenFn({ data: { items: inventory.slice(0, 30) } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Home</Link>
          </Button>
        </div>

        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">Smart Insights</div>
          <h1 className="mt-1 font-display text-3xl leading-tight md:text-4xl">Your kitchen, learned.</h1>
          <p className="mt-2 text-muted-foreground">
            Patterns, predictions, and hidden meal potential — powered by your scans.
          </p>
        </div>

        {inventory.length === 0 && (
          <Card className="mb-6 border-dashed border-border/60 bg-secondary/40 p-5 text-sm">
            Scan your fridge or cupboard first — insights get smarter with every scan.
          </Card>
        )}

        {/* Personality Score */}
        <Card className="ring-paper border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3 w-3" /> Fridge Personality
              </div>
              <div className="mt-1 font-display text-2xl">{score.tagline}</div>
              <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {score.notes.map((n, i) => <li key={i}>• {n}</li>)}
              </ul>
            </div>
            <div className="text-center">
              <div className="font-display text-5xl leading-none">{score.overall}</div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["protein", "produce", "leftovers", "variety"] as const).map((k) => (
              <Bar key={k} label={k} value={(score as any)[k]} />
            ))}
          </div>
        </Card>

        {/* Auto Meal Forecast */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Utensils className="h-3 w-3" /> Meal Forecast
          </div>
          <div className="mt-1 font-display text-2xl">
            You have enough for <span className="text-primary">{forecast.total}</span> meal{forecast.total === 1 ? "" : "s"}.
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Breakfast" value={forecast.breakfast} />
            <Stat label="Lunch" value={forecast.lunch} />
            <Stat label="Dinner" value={forecast.dinner} />
            <Stat label="Snacks" value={forecast.snacks} />
          </div>
        </Card>

        {/* Missing Piece */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <PackagePlus className="h-3 w-3" /> Missing Piece
          </div>
          <div className="mt-1 font-display text-xl">
            You're one ingredient away from <span className="text-primary">{missing.unlocked}</span> more meals.
          </div>
          {missing.suggestions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {missing.suggestions.map((s) => (
                <Badge key={s} variant="outline" className="text-sm">{s}</Badge>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">You've got the common multipliers covered.</div>
          )}
        </Card>

        {/* Predictive Alerts */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <AlertTriangle className="h-3 w-3" /> Predictive Alerts
          </div>
          {predictions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No urgent predictions yet — scan more and patterns will appear.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {predictions.map((p, i) => (
                <li key={i}>• {p.message}</li>
              ))}
            </ul>
          )}
        </Card>

        {/* Patterns */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Brain className="h-3 w-3" /> Patterns
          </div>
          {patterns.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Scan a few more times and we'll surface your habits.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {patterns.map((p, i) => (
                <li key={i}>• {p.detail}</li>
              ))}
            </ul>
          )}
        </Card>

        {/* Restock */}
        <Card className="ring-paper mt-4 border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <ShoppingBag className="h-3 w-3" /> Smart Restock
          </div>
          {restock.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">You're stocked on your staples — nice.</p>
          ) : (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {restock.map((r) => (
                <div key={r.name} className="rounded-lg border border-border/60 bg-secondary/30 p-2 text-sm">
                  <div className="font-medium capitalize">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.reason}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Hidden Potential */}
        <Card className="ring-paper mt-4 border-border/60 bg-gradient-to-br from-accent/10 via-card to-card p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
            <Wand2 className="h-3 w-3" /> Hidden Potential
          </div>
          <div className="mt-1 font-display text-xl">Show me what I'm missing.</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Chef Super J finds creative combos from what you have right now.
          </p>
          <Button
            className="mt-3"
            onClick={() => hiddenMut.mutate()}
            disabled={hiddenMut.isPending || inventory.length === 0}
          >
            {hiddenMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking…</>
            ) : (
              <>Reveal hidden meals</>
            )}
          </Button>
          {hiddenMut.data && (
            <div className="mt-4 space-y-2">
              <div className="font-display text-lg">{hiddenMut.data.headline}</div>
              {hiddenMut.data.meals.map((m, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-sm text-muted-foreground">{m.tagline}</div>
                  {m.usesItems.length > 0 && (
                    <div className="mt-1 text-xs">
                      <span className="text-muted-foreground">Uses: </span>{m.usesItems.join(", ")}
                    </div>
                  )}
                  {m.missingOne && (
                    <div className="text-xs text-accent">+ only missing: {m.missingOne}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {hiddenMut.error && (
            <div className="mt-2 text-sm text-destructive">
              {(hiddenMut.error as Error).message}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-center">
      <div className="font-display text-2xl">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
