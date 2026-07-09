import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, ChefHat, Trash2, Sparkles, Flame } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScanAuthGate } from "@/components/ScanAuthGate";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  listSaved,
  recordCooked,
  removeSaved,
  subscribeSaved,
  topCooked,
  type SavedCategory,
  type SavedItem,
} from "@/lib/saved-items";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved — The Fridge & Cupboard" },
      { name: "description", content: "Your personal vault of saved recipes, leftovers, and meal ideas." },
      { property: "og:title", content: "Saved — The Fridge & Cupboard" },
      { property: "og:description", content: "Your personal vault of saved recipes, leftovers, and meal ideas." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [filter, setFilter] = useState<SavedCategory | "all">("all");
  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setSignedIn(!!data.user);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user);
      setAuthChecked(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    const refresh = () => setItems(listSaved());
    refresh();
    return subscribeSaved(refresh);
  }, [signedIn]);


  const counts = useMemo(() => {
    const c: Partial<Record<SavedCategory, number>> = {};
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1;
    return c;
  }, [items]);

  const visible = filter === "all" ? items : items.filter((i) => i.category === filter);
  const mostCooked = useMemo(() => topCooked(3), [items]);

  if (authChecked && !signedIn) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <ScanAuthGate message="Sign in to view your saved recipes, leftovers, and meal ideas." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Bookmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">Your saved vault</h1>
            <p className="text-sm text-muted-foreground">
              Recipes, leftovers, and meal ideas you've tucked away.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="mt-8 p-8 text-center">
            <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-3 font-display text-lg font-semibold">Nothing saved yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap the <Bookmark className="inline h-4 w-4 align-text-bottom" /> Save button on any recipe, leftover idea, or tip and it lands here.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/"><Button variant="outline">Back to home</Button></Link>
              <Link to="/rescue"><Button>Find leftover ideas</Button></Link>
            </div>
          </Card>
        ) : (
          <>
            {mostCooked.length > 0 && (
              <Card className="mt-6 border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Flame className="h-4 w-4" />
                  <span className="font-display text-sm font-bold">Make again?</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your top cooks. The ingredients might already be in your kitchen.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {mostCooked.map((i) => (
                    <div key={i.id} className="rounded-lg border border-border/60 bg-card p-3">
                      <div className="text-sm font-semibold">{i.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        You made this {i.cookedCount} {i.cookedCount === 1 ? "time" : "times"}.
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Category filter chips */}
            <div className="mt-6 -mx-4 overflow-x-auto px-4 pb-1">
              <div className="flex w-max gap-2">
                <FilterChip
                  label={`All (${items.length})`}
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                />
                {CATEGORY_ORDER.filter((c) => counts[c]).map((c) => (
                  <FilterChip
                    key={c}
                    label={`${CATEGORY_LABELS[c]} (${counts[c]})`}
                    active={filter === c}
                    onClick={() => setFilter(c)}
                  />
                ))}
              </div>
            </div>

            {/* List */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {visible.map((item) => (
                <SavedRow key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-card text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );
}

function SavedRow({ item }: { item: SavedItem }) {
  const [justCooked, setJustCooked] = useState(false);

  function handleCooked() {
    recordCooked(item.id);
    setJustCooked(true);
    window.setTimeout(() => setJustCooked(false), 1500);
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
            {CATEGORY_LABELS[item.category]}
          </Badge>
          <div className="mt-1 font-display text-base font-semibold leading-tight">{item.title}</div>
          {item.subtitle && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => removeSaved(item.id)}
          aria-label="Remove from saved"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {item.ingredients && item.ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.ingredients.slice(0, 6).map((ing) => (
            <Badge key={ing} variant="secondary" className="text-[10px]">{ing}</Badge>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          {item.cookedCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Sparkles className="h-3 w-3" /> Made {item.cookedCount} {item.cookedCount === 1 ? "time" : "times"}
            </span>
          ) : (
            <span>Saved {timeAgo(item.savedAt)}</span>
          )}
        </div>
        <Button
          size="sm"
          variant={justCooked ? "secondary" : "outline"}
          onClick={handleCooked}
          className="h-8 gap-1 text-xs"
        >
          <ChefHat className="h-3.5 w-3.5" />
          {justCooked ? "Logged!" : item.cookedCount > 0 ? "Make again" : "Cooked this"}
        </Button>
      </div>
    </Card>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
