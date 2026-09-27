import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, ChefHat, Clock, Loader2, Plus, ShoppingBasket, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import { getScanContext } from "@/lib/scan-context";
import { addRecipeToCart, isRecipeChosen, type CartRecipe } from "@/lib/recipe-cart";
import { styleIdeasForItems, type StyleGroup } from "@/lib/style-ideas.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/style-ideas")({
  component: StyleIdeasPage,
  head: () => ({
    meta: [
      { title: "Meal Style Ideas — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Turn the food you just scanned into recipe ideas grouped by meal style — American, Italian, Mexican and more — then tap to build a cook plan.",
      },
      { property: "og:title", content: "Meal Style Ideas — Cook What You Already Have" },
      {
        property: "og:description",
        content:
          "Recipe and ingredient ideas for every detected item, grouped by cuisine, with one-tap cook plan building.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STYLES = [
  "American",
  "Italian",
  "Mexican",
  "Asian",
  "Mediterranean",
  "Comfort Food",
  "BBQ / Grill",
  "Breakfast",
];

function StyleIdeasPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [styles, setStyles] = useState<string[]>(["American", "Italian", "Mexican"]);
  const [groups, setGroups] = useState<StyleGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);

  const generate = useServerFn(styleIdeasForItems);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    const scan = getScanContext();
    if (scan?.items?.length) setItems(scan.items);
    return () => l.subscription.unsubscribe();
  }, []);

  const canRun = items.length > 0 && styles.length > 0 && !loading;

  function toggleStyle(s: string) {
    setStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s].slice(0, 6)));
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    const v = newItem.trim();
    if (!v) return;
    setItems((prev) => (prev.includes(v) ? prev : [...prev, v].slice(0, 40)));
    setNewItem("");
  }

  async function run() {
    if (!canRun) return;
    setLoading(true);
    try {
      const res = await generate({ data: { items: items.slice(0, 40), styles } });
      setGroups(res.groups);
      if (res.groups.length === 0) toast.error("No ideas came back. Try different styles.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't build ideas. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function addToPlan(title: string, uses: string[], need: string[], why: string) {
    const ingredients = [...uses, ...need];
    const cart: CartRecipe[] = addRecipeToCart(title, ingredients, why);
    setChosen(cart.map((c) => c.title));
    toast.success(`${title} added to your cook plan`);
  }

  const chosenSet = useMemo(() => new Set(chosen), [chosen]);
  const isChosen = (title: string) => chosenSet.has(title) || isRecipeChosen(title);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ChefHat className="h-6 w-6 text-primary" />
            Ideas by meal style
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recipe and ingredient ideas for what you scanned, grouped by the kind of food you feel like.
            Tap any idea to build your cook plan.
          </p>
        </header>

        <Card className="mb-4 p-4">
          <h2 className="mb-2 text-sm font-semibold">Your items</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing detected yet — <Link to="/fridge-scan" className="underline">scan your fridge</Link> or add
              items below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map((it) => (
                <Badge key={it} variant="secondary" className="gap-1 py-1">
                  {it}
                  <button
                    type="button"
                    aria-label={`Remove ${it}`}
                    onClick={() => setItems((prev) => prev.filter((x) => x !== it))}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <form onSubmit={addItem} className="mt-3 flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an ingredient"
              aria-label="Add an ingredient"
            />
            <Button type="submit" variant="secondary">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        <Card className="mb-4 p-4">
          <h2 className="mb-2 text-sm font-semibold">Meal styles</h2>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => {
              const on = styles.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStyle(s)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <Button className="mt-4 w-full" onClick={run} disabled={!canRun}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chef is building your menu…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Get ideas
              </>
            )}
          </Button>
          {!signedIn && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              <Link to="/auth" className="underline">
                Sign in
              </Link>{" "}
              to generate ideas.
            </p>
          )}
        </Card>

        {groups.map((g) => (
          <section key={g.style} className="mb-5">
            <h2 className="mb-2 text-lg font-semibold">{g.style}</h2>
            <div className="grid gap-3">
              {g.ideas.map((idea) => (
                <Card key={`${g.style}-${idea.title}`} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-tight">{idea.title}</h3>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {idea.time_minutes} min
                    </span>
                  </div>
                  {idea.why && <p className="mt-1 text-sm text-muted-foreground">{idea.why}</p>}
                  {idea.uses.length > 0 && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Uses:</span> {idea.uses.join(", ")}
                    </p>
                  )}
                  {idea.need.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium">Still need:</span> {idea.need.join(", ")}
                    </p>
                  )}
                  <Button
                    className="mt-3 w-full"
                    variant={isChosen(idea.title) ? "secondary" : "default"}
                    onClick={() => addToPlan(idea.title, idea.uses, idea.need, idea.why)}
                  >
                    {isChosen(idea.title) ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> In your cook plan
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" /> Add to cook plan
                      </>
                    )}
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {chosen.length > 0 && (
          <Card className="p-4">
            <p className="mb-3 text-sm">
              {chosen.length} {chosen.length === 1 ? "meal" : "meals"} in your cook plan.
            </p>
            <Button asChild className="w-full">
              <Link to="/shopping-plan">
                <ShoppingBasket className="mr-2 h-4 w-4" /> View cook plan &amp; shopping list
              </Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
