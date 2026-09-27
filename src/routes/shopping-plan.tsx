import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ListPlus, Refrigerator, ShoppingCart, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { cn } from "@/lib/utils";
import { getScanContext } from "@/lib/scan-context";
import { getTopStaples } from "@/lib/memory-kitchen";
import { addShoppingItem } from "@/lib/shopping-list";
import {
  clearRecipeCart,
  getRecipeCart,
  removeRecipeFromCart,
  type CartRecipe,
} from "@/lib/recipe-cart";
import { consolidateIngredients, type ConsolidatedLine } from "@/lib/consolidate-ingredients";
import { toast } from "sonner";

export const Route = createFileRoute("/shopping-plan")({
  component: ShoppingPlanPage,
  head: () => ({
    meta: [
      { title: "One-Tap Shopping Plan — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Pick the recipes you want to cook and we'll merge every missing ingredient into one shopping list — no duplicates, nothing you already have.",
      },
      { property: "og:title", content: "One-Tap Shopping Plan — Every Recipe, One List" },
      {
        property: "og:description",
        content:
          "Consolidate ingredients across the recipes you choose and add everything you're missing to your shopping list in one tap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ShoppingPlanPage() {
  const [recipes, setRecipes] = useState<CartRecipe[]>([]);
  const [kitchen, setKitchen] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);

  useEffect(() => {
    setRecipes(getRecipeCart());
    const scan = getScanContext();
    setKitchen([...(scan?.items ?? []), ...getTopStaples()]);
  }, []);

  const lines = useMemo(
    () => consolidateIngredients(recipes.map((r) => ({ title: r.title, ingredients: r.ingredients })), kitchen),
    [recipes, kitchen],
  );

  const missing = useMemo(
    () => lines.filter((l) => !l.have && !skipped.includes(l.name)),
    [lines, skipped],
  );
  const alreadyHave = useMemo(() => lines.filter((l) => l.have), [lines]);

  const addAll = () => {
    if (!missing.length) {
      toast.info("Nothing missing — you've already got it all.");
      return;
    }
    for (const line of missing) addShoppingItem(line.name, line.amount || undefined);
    toast.success(`Added ${missing.length} item${missing.length === 1 ? "" : "s"} to your shopping list.`);
  };

  const toggleSkip = (name: string) =>
    setSkipped((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  const row = (line: ConsolidatedLine, muted: boolean) => (
    <li
      key={line.name}
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border p-3",
        muted ? "border-dashed opacity-70" : "bg-card",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold capitalize">
          {line.name}
          {line.amount && <span className="ml-2 font-normal text-muted-foreground">{line.amount}</span>}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {line.recipes.length > 1 ? `${line.recipes.length} recipes · ` : ""}
          {line.recipes.join(", ")}
        </p>
      </div>
      {!line.have && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => toggleSkip(line.name)}
          aria-label={skipped.includes(line.name) ? `Include ${line.name}` : `Skip ${line.name}`}
        >
          {skipped.includes(line.name) ? <ListPlus className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      )}
    </li>
  );

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[oklch(0.98_0.02_85)] via-background to-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            <ShoppingCart className="h-3.5 w-3.5" /> Shopping plan
          </div>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Every recipe you chose, one list.
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            We merge the ingredients across your chosen recipes, add up the amounts, and leave out
            whatever's already in your kitchen.
          </p>
        </header>

        {recipes.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-base font-semibold">No recipes chosen yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap “Add to shopping plan” on any recipe and it'll show up here.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/leftovers-builder">Build leftover meals</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/recipes">Browse recipes</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Cooking {recipes.length} recipe{recipes.length === 1 ? "" : "s"}
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    clearRecipeCart();
                    setRecipes([]);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Clear
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recipes.map((r) => (
                  <Badge key={r.id} variant="secondary" className="gap-2 py-1.5 pl-3 pr-1.5 text-sm">
                    {r.title}
                    <button
                      type="button"
                      aria-label={`Remove ${r.title}`}
                      onClick={() => setRecipes(removeRecipeFromCart(r.id))}
                      className="rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="mt-4 p-4 sm:p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                You need to buy ({missing.length})
              </h2>
              {missing.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nothing missing — your kitchen already covers these recipes.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">{missing.map((l) => row(l, false))}</ul>
              )}

              {skipped.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Skipping {skipped.length} item{skipped.length === 1 ? "" : "s"} — tap the plus to put
                  them back.
                </p>
              )}

              <Button className="mt-5 w-full" size="lg" onClick={addAll} disabled={missing.length === 0}>
                <ListPlus className="mr-2 h-5 w-5" />
                Add {missing.length || ""} item{missing.length === 1 ? "" : "s"} to my shopping list
              </Button>
              <Button variant="ghost" className="mt-2 w-full" asChild>
                <Link to="/shopping-list">
                  <Check className="mr-2 h-4 w-4" /> Open my shopping list
                </Link>
              </Button>
            </Card>

            {alreadyHave.length > 0 && (
              <Card className="mt-4 p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Refrigerator className="h-4 w-4" /> Already in your kitchen ({alreadyHave.length})
                </h2>
                <ul className="mt-3 space-y-2">{alreadyHave.map((l) => row(l, true))}</ul>
              </Card>
            )}

            {skipped.length > 0 && (
              <Card className="mt-4 p-4 sm:p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Skipped ({skipped.length})
                </h2>
                <ul className="mt-3 space-y-2">
                  {lines.filter((l) => skipped.includes(l.name)).map((l) => row(l, true))}
                </ul>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
