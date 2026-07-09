import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Heart,
  RotateCcw,
  Trash2,
  ChefHat,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { useMemoryKitchen } from "@/hooks/use-memory-kitchen";
import {
  getFavorites,
  getRecent,
  getTopCuisines,
  getTopStaples,
} from "@/lib/memory-kitchen";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { DIET_OPTIONS } from "@/lib/personalization";
import { toast } from "sonner";

export const Route = createFileRoute("/memory-kitchen")({
  head: () => ({
    meta: [
      { title: "Memory Kitchen — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Your kitchen, remembered. Favorite meals, repeat staples, and one-tap Cook It Again — Chef Super J learns what you actually cook.",
      },
    ],
  }),
  component: MemoryKitchenPage,
});

function MemoryKitchenPage() {
  const { state, toggleFavorite, forgetMeal, setEnabled, setFamilySize, clear } = useMemoryKitchen();
  const { prefs, toggle } = useDietaryPrefs();
  const [family, setFamily] = useState<string>(state.familySize ? String(state.familySize) : "");

  const favorites = useMemo(() => getFavorites(state), [state]);
  const recent = useMemo(() => getRecent(state, 20), [state]);
  const cuisines = useMemo(() => getTopCuisines(state, 6), [state]);
  const staples = useMemo(() => getTopStaples(state, 12), [state]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> Back home
      </Link>

      <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
        <Brain className="h-3.5 w-3.5" /> Memory Kitchen
      </div>
      <h1 className="mt-1 font-display text-3xl">Your kitchen, remembered.</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lightweight memory of meals you cook, staples you keep, cuisines you love, and your household size — used to make smarter, faster suggestions.
      </p>

      <Card className="ring-paper mt-5 border-accent/30 bg-gradient-to-br from-accent/8 via-card to-primary/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg">Memory is {state.enabled ? "on" : "off"}</div>
            <div className="text-xs text-muted-foreground">
              {state.enabled ? "Chef Super J is learning from what you cook." : "Memory is paused. Nothing new will be remembered."}
            </div>
          </div>
          <Switch checked={state.enabled} onCheckedChange={setEnabled} />
        </div>
      </Card>

      <Card className="ring-paper mt-4 p-5">
        <div className="font-display text-lg">Household</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="family" className="text-xs uppercase tracking-widest text-muted-foreground">Family size</Label>
            <Input
              id="family"
              type="number"
              min={1}
              max={12}
              inputMode="numeric"
              placeholder="e.g. 4"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const n = family ? Math.max(1, Math.min(12, Number(family))) : undefined;
              setFamilySize(n);
              toast.success(n ? `Cooking for ${n}.` : "Cleared family size.");
            }}
          >
            Save
          </Button>
        </div>
      </Card>

      <Card className="ring-paper mt-4 p-5">
        <div className="font-display text-lg">Dietary preferences</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DIET_OPTIONS.map((d) => {
            const on = prefs.includes(d.id);
            return (
              <button
                key={d.id}
                onClick={() => toggle(d.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  on
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-accent/50"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </Card>

      {cuisines.length > 0 && (
        <Card className="ring-paper mt-4 p-5">
          <div className="font-display text-lg">Cuisines you love</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cuisines.map((c) => (
              <Badge key={c} variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                {c}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {staples.length > 0 && (
        <Card className="ring-paper mt-4 p-5">
          <div className="font-display text-lg">Staples you usually keep</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {staples.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="ring-paper mt-4 p-5">
        <div className="flex items-center justify-between">
          <div className="font-display text-lg">Favorites — Cook It Again</div>
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        {favorites.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Cook a meal and we'll add it here. Tap the heart on any meal to pin it as a favorite.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {favorites.map((m) => (
              <div key={m.title} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/70 p-2.5">
                <div className="min-w-0">
                  <div className="truncate font-display text-sm">{m.title}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Cooked {m.count}×{m.cuisine ? ` • ${m.cuisine}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]" asChild>
                    <Link to="/">
                      <RotateCcw className="h-3 w-3" /> Again
                    </Link>
                  </Button>
                  <button
                    aria-label="Toggle favorite"
                    onClick={() => toggleFavorite(m.title)}
                    className="rounded p-1 text-accent hover:bg-accent/10"
                  >
                    <Heart className={`h-3.5 w-3.5 ${m.favorite ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="ring-paper mt-4 p-5">
        <div className="font-display text-lg">Recently cooked</div>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing yet — your last 20 cooked meals will show up here.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {recent.map((m) => (
              <div key={m.title} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/70 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ChefHat className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate text-sm">{m.title}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">×{m.count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Toggle favorite"
                    onClick={() => toggleFavorite(m.title)}
                    className="rounded p-1 text-accent hover:bg-accent/10"
                  >
                    <Heart className={`h-3.5 w-3.5 ${m.favorite ? "fill-current" : ""}`} />
                  </button>
                  <button
                    aria-label="Forget meal"
                    onClick={() => forgetMeal(m.title)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6 flex justify-end">
        <Button
          variant="ghost"
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (typeof window !== "undefined" && window.confirm("Clear all Memory Kitchen data? This can't be undone.")) {
              clear();
              toast.success("Memory cleared.");
            }
          }}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear all memory
        </Button>
      </div>
    </div>
  );
}
