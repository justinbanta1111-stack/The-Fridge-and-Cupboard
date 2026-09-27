import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, ShoppingCart, Check, Store, Utensils } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StorePriceEditor } from "@/components/StorePriceEditor";
import { matchDishes } from "@/lib/recipe-match";
import { dishCost } from "@/lib/meal-cost";
import { formatMoney } from "@/lib/grocery-prices";
import { recipePhotoPath } from "@/lib/recipe-photo";
import { getScanContext } from "@/lib/scan-context";
import { getTopStaples } from "@/lib/memory-kitchen";
import { addShoppingItem } from "@/lib/shopping-list";
import { consolidateIngredients } from "@/lib/consolidate-ingredients";
import { DISHES } from "@/lib/seo/content";
import { useLivePrices } from "@/hooks/useLivePrices";
import { getActiveStore } from "@/hooks/useLivePrices";

const BUDGET_KEY = "tfc.budget.weekly.v1";
const MEALS_KEY = "tfc.budget.meals.v1";

export const Route = createFileRoute("/budget-plan")({
  component: BudgetPlanPage,
  head: () => ({
    meta: [
      { title: "Budget Plan — Meals That Fit Your Grocery Budget" },
      {
        name: "description",
        content:
          "Set your weekly grocery budget and see meals you can actually afford at your own store prices, what each one costs, and exactly what to buy next.",
      },
      { property: "og:title", content: "Budget Plan — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Meals priced at your store, a running total against your budget, and a buy-next list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function readNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = Number(window.localStorage.getItem(key));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function BudgetPlanPage() {
  const [budget, setBudget] = useState(75);
  const [mealCount, setMealCount] = useState(5);
  const [kitchen, setKitchen] = useState<string[]>([]);
  const [added, setAdded] = useState(false);
  const [store, setStore] = useState("My store");
  const prices = useLivePrices();

  useEffect(() => {
    setBudget(readNumber(BUDGET_KEY, 75));
    setMealCount(readNumber(MEALS_KEY, 5));
    setStore(getActiveStore());
    const scan = getScanContext();
    setKitchen([...(scan?.items ?? []), ...getTopStaples()]);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(BUDGET_KEY, String(budget));
      window.localStorage.setItem(MEALS_KEY, String(mealCount));
    } catch {
      /* ignore */
    }
  }, [budget, mealCount]);

  // Price every candidate dish with what's already in the kitchen subtracted,
  // then fill the week with the cheapest-to-finish meals that fit the budget.
  const { plan, spend, alsoConsidered } = useMemo(() => {
    const matched = matchDishes(kitchen, 60);
    const base =
      matched.length > 0
        ? matched.map((m) => ({ dish: m.dish, missing: m.missing }))
        : DISHES.slice(0, 40).map((d) => ({ dish: d, missing: d.ingredients }));

    const priced = base
      .map((b) => ({ ...b, cost: dishCost(b.dish, b.missing) }))
      .sort((a, b) => a.cost.toBuy - b.cost.toBuy || a.cost.perServing - b.cost.perServing);

    const chosen: typeof priced = [];
    let running = 0;
    for (const row of priced) {
      if (chosen.length >= mealCount) break;
      if (running + row.cost.toBuy > budget) continue;
      chosen.push(row);
      running += row.cost.toBuy;
    }
    const rest = priced.filter((p) => !chosen.includes(p)).slice(0, 6);
    return { plan: chosen, spend: running, alsoConsidered: rest };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchen, budget, mealCount, prices.ready, prices.count, prices.version]);

  const buyNext = useMemo(
    () =>
      consolidateIngredients(
        plan.map((p) => ({ title: p.dish.name, ingredients: p.missing })),
        kitchen,
      ).filter((l) => !l.have),
    [plan, kitchen],
  );

  const left = Math.max(0, budget - spend);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Budget plan</h1>
            <p className="text-sm text-muted-foreground">
              Meals you can afford this week at {prices.store || store} prices — and exactly what to buy next.
            </p>
          </div>
        </div>

        <Card className="mt-5 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Grocery budget this week</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-bold text-primary">$</span>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(5, Number(e.target.value) || 0))}
                  className="h-11"
                  aria-label="Weekly grocery budget in dollars"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Meals to plan</span>
              <Input
                type="number"
                min={1}
                max={14}
                value={mealCount}
                onChange={(e) => setMealCount(Math.min(14, Math.max(1, Number(e.target.value) || 1)))}
                className="mt-1 h-11"
                aria-label="How many meals to plan"
              />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-secondary p-3 text-center">
            <div>
              <div className="text-lg font-extrabold">{formatMoney(spend)}</div>
              <div className="text-[11px] text-muted-foreground">To spend</div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-primary">{formatMoney(left)}</div>
              <div className="text-[11px] text-muted-foreground">Left over</div>
            </div>
            <div>
              <div className="text-lg font-extrabold">{plan.length}</div>
              <div className="text-[11px] text-muted-foreground">Meals</div>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Store className="h-3.5 w-3.5" aria-hidden="true" /> {prices.note}
          </p>
        </Card>

        <h2 className="mt-8 font-display text-xl font-bold">Your meals</h2>
        {plan.length === 0 ? (
          <Card className="mt-3 p-5 text-sm text-muted-foreground">
            Nothing fits that budget yet. Try raising it a little, or scan your fridge first so we
            can count what you already own.
          </Card>
        ) : (
          <div className="mt-3 space-y-3">
            {plan.map(({ dish, missing, cost }) => (
              <Card key={dish.slug} className="flex items-center gap-3 p-3">
                <img
                  src={recipePhotoPath(dish.slug)}
                  alt={dish.name}
                  loading="lazy"
                  width={96}
                  height={96}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/how-to-make/$dish"
                    params={{ dish: dish.slug }}
                    className="font-semibold hover:underline"
                  >
                    {dish.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{dish.summary}</p>
                  <p className="mt-1 text-xs">
                    <span className="font-bold text-primary">{formatMoney(cost.toBuy)}</span> still to
                    buy · {formatMoney(cost.perServing)} a serving · {dish.servings} servings
                  </p>
                </div>
                <span className="hidden shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold sm:inline-flex">
                  <Utensils className="h-3 w-3" aria-hidden="true" /> {missing.length} to buy
                </span>
              </Card>
            ))}
          </div>
        )}

        {buyNext.length > 0 && (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold">Buy next</h2>
              <Button
                onClick={() => {
                  buyNext.forEach((line) => addShoppingItem(line.name, line.amount || undefined));
                  setAdded(true);
                  toast.success(`Added ${buyNext.length} items to your shopping list.`);
                }}
                className="h-10"
              >
                {added ? <Check className="mr-1.5 h-4 w-4" /> : <ShoppingCart className="mr-1.5 h-4 w-4" />}
                Add all to shopping list
              </Button>
            </div>
            <Card className="mt-3 p-4">
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {buyNext.map((line) => (
                  <li key={line.name} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      {line.amount ? `${line.amount} ` : ""}
                      {line.name}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        {alsoConsidered.length > 0 && (
          <>
            <h2 className="mt-8 font-display text-xl font-bold">Just over budget</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {alsoConsidered.map(({ dish, cost }) => (
                <Link
                  key={dish.slug}
                  to="/how-to-make/$dish"
                  params={{ dish: dish.slug }}
                  className="rounded-xl border border-border/60 px-3 py-2 text-sm hover:bg-secondary"
                >
                  <span className="font-semibold">{dish.name}</span>{" "}
                  <span className="text-muted-foreground">— {formatMoney(cost.toBuy)} to buy</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-8">
          <StorePriceEditor />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Want to compare every dish instead? <Link to="/meal-costs" className="underline">Cost per meal</Link>
        </p>
      </main>
    </div>
  );
}
