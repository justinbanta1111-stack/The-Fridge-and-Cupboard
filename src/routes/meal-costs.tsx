import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DollarSign, Clock, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { matchDishes, totalMinutes } from "@/lib/recipe-match";
import { dishCost } from "@/lib/meal-cost";
import { formatMoney } from "@/lib/grocery-prices";
import { recipePhotoPath } from "@/lib/recipe-photo";
import { getScanContext } from "@/lib/scan-context";
import { getTopStaples } from "@/lib/memory-kitchen";
import { addShoppingItem } from "@/lib/shopping-list";
import { DISHES } from "@/lib/seo/content";
import { useLivePrices } from "@/hooks/useLivePrices";
import { StorePriceEditor } from "@/components/StorePriceEditor";

export const Route = createFileRoute("/meal-costs")({
  component: MealCostsPage,
  head: () => ({
    meta: [
      { title: "Cost Per Meal — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "See what each meal costs to make, what's left to buy after your own kitchen is counted, and which dish feeds your family for the least.",
      },
      { property: "og:title", content: "Cost Per Meal — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Compare real dinners by price per serving and by what you still need to buy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Sort = "perServing" | "toBuy" | "time";

function MealCostsPage() {
  const [kitchen, setKitchen] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("perServing");
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const prices = useLivePrices();

  useEffect(() => {
    const scan = getScanContext();
    setKitchen([...(scan?.items ?? []), ...getTopStaples()]);
  }, []);

  const rows = useMemo(() => {
    const matched = matchDishes(kitchen, 40);
    const base =
      matched.length > 0
        ? matched.map((m) => ({ dish: m.dish, missing: m.missing, coverage: m.coverage }))
        : DISHES.slice(0, 24).map((dish) => ({
            dish,
            missing: dish.ingredients,
            coverage: 0,
          }));

    const priced = base.map((b) => ({ ...b, cost: dishCost(b.dish, b.missing) }));
    return priced.sort((a, b) =>
      sort === "time"
        ? totalMinutes(a.dish) - totalMinutes(b.dish)
        : sort === "toBuy"
          ? a.cost.toBuy - b.cost.toBuy
          : a.cost.perServing - b.cost.perServing,
    );
  }, [kitchen, sort, prices.ready, prices.note, prices.version]);

  const cheapest = rows[0];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
            <DollarSign className="h-8 w-8 text-primary" aria-hidden />
            Cost Per Meal
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            What each dinner costs to make, and what's left to buy once we count what's already in
            your kitchen.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {prices.ready
              ? `${prices.note} — ${prices.count} grocery items priced from the database.`
              : "Loading real grocery prices…"}
          </p>
        </header>

        {cheapest && (
          <Card className="mb-6 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cheapest right now
            </p>
            <p className="mt-1 text-xl font-bold">{cheapest.dish.name}</p>
            <p className="text-sm text-muted-foreground">
              About {formatMoney(cheapest.cost.perServing)} a serving ·{" "}
              {formatMoney(cheapest.cost.toBuy)} still to buy
            </p>
          </Card>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              ["perServing", "Cheapest per serving"],
              ["toBuy", "Least to buy"],
              ["time", "Quickest"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={sort === key ? "default" : "outline"}
              onClick={() => setSort(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <ul className="space-y-3">
          {rows.map(({ dish, missing, coverage, cost }) => (
            <li key={dish.slug}>
              <Card className="flex gap-3 overflow-hidden p-3">
                <Link
                  to="/how-to-make/$dish"
                  params={{ dish: dish.slug }}
                  className="shrink-0"
                  aria-label={dish.name}
                >
                  <img
                    src={recipePhotoPath(dish.name, dish.summary)}
                    alt={dish.name}
                    loading="lazy"
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/how-to-make/$dish"
                    params={{ dish: dish.slug }}
                    className="text-lg font-bold leading-tight hover:underline"
                  >
                    {dish.name}
                  </Link>
                  <p className="mt-0.5 text-sm">
                    <span className="font-bold text-primary">
                      {formatMoney(cost.perServing)} a serving
                    </span>{" "}
                    <span className="text-muted-foreground">
                      · {formatMoney(cost.full)} for {dish.servings}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {missing.length === 0
                      ? "Nothing to buy — you have it all."
                      : `${formatMoney(cost.toBuy)} still to buy (${missing.length} item${missing.length === 1 ? "" : "s"})`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> {totalMinutes(dish)} min
                    </span>
                    {coverage > 0 && <span>{Math.round(coverage * 100)}% from your kitchen</span>}
                  </div>
                  {missing.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        for (const line of missing) addShoppingItem(line);
                        setAdded((p) => ({ ...p, [dish.slug]: true }));
                        toast.success(`Added ${missing.length} items to your shopping list.`);
                      }}
                    >
                      {added[dish.slug] ? (
                        <Check className="mr-1 h-4 w-4" aria-hidden />
                      ) : (
                        <ShoppingCart className="mr-1 h-4 w-4" aria-hidden />
                      )}
                      {added[dish.slug] ? "Added" : "Add missing to list"}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
              <StorePriceEditor />

      </main>
    </div>
  );
}
