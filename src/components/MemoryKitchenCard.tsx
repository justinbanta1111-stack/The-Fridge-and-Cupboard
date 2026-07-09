import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Brain, ChefHat, Heart, RotateCcw, Sparkles, X } from "lucide-react";
import { useMemoryKitchen } from "@/hooks/use-memory-kitchen";
import { getFavorites, getRecent, getTopCuisines } from "@/lib/memory-kitchen";

export function MemoryKitchenCard({ compact = false }: { compact?: boolean }) {
  const { state, toggleFavorite, forgetMeal } = useMemoryKitchen();
  if (!state.enabled) return null;

  const favorites = getFavorites(state).slice(0, compact ? 3 : 6);
  const recent = getRecent(state, compact ? 4 : 8);
  const cuisines = getTopCuisines(state);

  if (favorites.length === 0 && recent.length === 0) {
    return (
      <Card className="ring-paper border-accent/30 bg-gradient-to-br from-accent/8 via-card to-primary/5 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
          <Brain className="h-3.5 w-3.5" /> Memory Kitchen
        </div>
        <h3 className="mt-1 font-display text-xl">Your kitchen, remembered.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cook a meal and tap <span className="font-semibold">Cooked it</span> — Chef Super J will remember it so you can{" "}
          <span className="font-semibold">Cook It Again</span> in one tap.
        </p>
      </Card>
    );
  }

  return (
    <Card className="ring-paper border-accent/30 bg-gradient-to-br from-accent/8 via-card to-primary/5 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
          <Brain className="h-3.5 w-3.5" /> Memory Kitchen
        </div>
        <Link to="/memory-kitchen" className="text-xs font-medium text-accent hover:underline">
          Manage
        </Link>
      </div>
      <h3 className="mt-1 font-display text-xl">Cook It Again</h3>

      {cuisines.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cuisines.map((c) => (
            <Badge key={c} variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px] uppercase tracking-widest">
              {c}
            </Badge>
          ))}
        </div>
      )}

      {favorites.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Your favorites</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {favorites.map((m) => (
              <div
                key={m.title}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/70 p-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-sm leading-tight">{m.title}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Cooked {m.count}×{m.cuisine ? ` • ${m.cuisine}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-[11px]"
                    asChild
                  >
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
        </div>
      )}

      {recent.length > 0 && !compact && (
        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Recently cooked</div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((m) => (
              <span
                key={m.title}
                className="group inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs"
              >
                <ChefHat className="h-3 w-3 text-primary" />
                {m.title}
                <button
                  aria-label="Forget"
                  onClick={() => forgetMeal(m.title)}
                  className="opacity-0 transition group-hover:opacity-100"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/8 p-2.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        Suggestions get smarter the more you cook.
      </div>
    </Card>
  );
}
