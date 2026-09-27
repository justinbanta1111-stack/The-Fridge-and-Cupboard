/**
 * "Real recipes you can make right now" — tested dishes from the recipe
 * library, ranked by what the user already has, each opening a full detail
 * page with a photo, quantities and step-by-step instructions.
 */

import { Link } from "@tanstack/react-router";
import { Clock, UtensilsCrossed, ShoppingCart, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { matchDishes, totalMinutes } from "@/lib/recipe-match";
import { recipePhotoPath } from "@/lib/recipe-photo";
import { addShoppingItem } from "@/lib/shopping-list";
import { dishCost } from "@/lib/meal-cost";
import { formatMoney } from "@/lib/grocery-prices";

export function MatchedDishes({
  items,
  limit = 6,
  heading = "Real recipes you can make right now",
  className,
}: {
  items: string[];
  limit?: number;
  heading?: string;
  className?: string;
}) {
  const matches = useMemo(() => matchDishes(items, limit), [items, limit]);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  if (matches.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="font-display text-xl tracking-tight sm:text-2xl">{heading}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Full recipes with exact amounts, temperatures and steps — sorted by how much you already have.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {matches.map(({ dish, have, missing, coverage }) => {
          const isAdded = added[dish.slug] === true;
          const cost = dishCost(dish, missing);
          return (
            <Card key={dish.slug} className="overflow-hidden border-border/60 bg-card">
              <Link to="/how-to-make/$dish" params={{ dish: dish.slug }} className="block">
                <img
                  src={recipePhotoPath(dish.name, dish.summary)}
                  alt={dish.name}
                  loading="lazy"
                  className="h-36 w-full object-cover"
                />
              </Link>
              <div className="p-4">
                <Link
                  to="/how-to-make/$dish"
                  params={{ dish: dish.slug }}
                  className="font-display text-lg leading-tight hover:underline"
                >
                  {dish.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {totalMinutes(dish)} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UtensilsCrossed className="h-3.5 w-3.5" /> serves {dish.servings}
                  </span>
                  <span>{Math.round(coverage * 100)}% from your kitchen</span>
                  <span className="font-semibold text-foreground">
                    ~{formatMoney(cost.perServing)}/serving
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{dish.summary}</p>

                <p className="mt-3 text-xs">
                  <span className="font-semibold">You have:</span>{" "}
                  <span className="text-muted-foreground">{have.slice(0, 4).join(", ")}</span>
                </p>
                {missing.length > 0 && (
                  <p className="mt-1 text-xs">
                    <span className="font-semibold">Still need:</span>{" "}
                    <span className="text-muted-foreground">
                      {missing.join(", ")} — about {formatMoney(cost.toBuy)}
                    </span>
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" className="transition active:scale-95">
                    <Link to="/cook-with-chef" search={{ meal: dish.name }}>
                      Cook this with Chef
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/how-to-make/$dish" params={{ dish: dish.slug }}>
                      See full recipe
                    </Link>
                  </Button>

                  {missing.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        for (const line of missing) addShoppingItem(line);
                        setAdded((p) => ({ ...p, [dish.slug]: true }));
                        toast.success(`Added ${missing.length} item${missing.length === 1 ? "" : "s"} to your shopping list.`);
                      }}
                    >
                      {isAdded ? <Check className="mr-1 h-4 w-4" /> : <ShoppingCart className="mr-1 h-4 w-4" />}
                      {isAdded ? "Added" : "Add missing to list"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
