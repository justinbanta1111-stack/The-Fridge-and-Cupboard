import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, DollarSign, MapPin, Plus, Refrigerator, ShoppingCart, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/SiteNav";
import { ShoppingListActions } from "@/components/ShoppingListActions";

import { cn } from "@/lib/utils";
import { groupByAisle } from "@/lib/aisles";
import { estimatePrice, estimateTotal, formatMoney } from "@/lib/grocery-prices";
import { useLivePrices } from "@/hooks/useLivePrices";
import { getScanContext } from "@/lib/scan-context";
import { getTopStaples } from "@/lib/memory-kitchen";
import {
  addShoppingItem,
  clearDoneShoppingItems,
  getShoppingList,
  haveInKitchen,
  removeShoppingItem,
  toggleShoppingItem,
  type ShoppingListItem,
} from "@/lib/shopping-list";

export const Route = createFileRoute("/shopping-list")({
  component: ShoppingListPage,
  head: () => ({
    meta: [
      { title: "Shopping List — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Add what you need, check it off as you shop, and instantly see which items are missing from your fridge and cupboard.",
      },
      { property: "og:title", content: "Shopping List — The Fridge & Cupboard" },
      {
        property: "og:description",
        content:
          "A simple shopping list that knows what you already have and flags what's missing from your kitchen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/** Price a list row using its quantity, e.g. "2 lb" + "chicken thighs". */
function lineOf(item: ShoppingListItem): string {
  return `${item.qty ?? ""} ${item.name}`.trim();
}

function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const prices = useLivePrices();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [kitchen, setKitchen] = useState<string[]>([]);

  useEffect(() => {
    setItems(getShoppingList());
    const scan = getScanContext();
    const staples = getTopStaples();
    setKitchen([...(scan?.items ?? []), ...staples]);
  }, []);

  const missing = useMemo(
    () => items.filter((i) => !i.done && !haveInKitchen(i.name, kitchen)),
    [items, kitchen],
  );
  const alreadyHave = useMemo(
    () => items.filter((i) => !i.done && haveInKitchen(i.name, kitchen)),
    [items, kitchen],
  );

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setItems(addShoppingItem(name, qty));
    setName("");
    setQty("");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
            <ShoppingCart className="h-8 w-8 text-primary" aria-hidden />
            Shopping List
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Add what you need. We'll flag what's missing from your fridge and cupboard.
          </p>
        </header>

        <Card className="mb-6 flex items-center gap-3 p-4">
          <MapPin className="h-7 w-7 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight">Plan your trip</p>
            <p className="text-sm text-muted-foreground">
              See grocery stores near you on a map and get directions.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 font-bold">
            <Link to="/nearby-stores">Nearby stores</Link>
          </Button>
        </Card>

        <Card className="mb-6 flex items-center gap-3 p-4">
          <ShoppingCart className="h-7 w-7 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight">Cooking a few recipes?</p>
            <p className="text-sm text-muted-foreground">
              We'll merge everything they need into one list and skip what you already have.
            </p>
          </div>
          <Button asChild size="lg" variant="outline" className="shrink-0 font-bold">
            <Link to="/shopping-plan">Shopping plan</Link>
          </Button>
        </Card>

        <Card className="mb-6 flex items-center gap-3 p-4">
          <DollarSign className="h-7 w-7 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight">
              About {formatMoney(estimateTotal(items.filter((i) => !i.done).map(lineOf)).total)} left
              to buy
            </p>
            <p className="text-sm text-muted-foreground">
              {prices.ready ? prices.note : "Loading real grocery prices…"}
            </p>
          </div>
          <Button asChild size="lg" variant="outline" className="shrink-0 font-bold">
            <Link to="/meal-costs">Cost per meal</Link>
          </Button>
        </Card>

        <ShoppingListActions items={items} />




        <Card className="mb-6 p-4">
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add an item (e.g. eggs)"
              aria-label="Item name"
              className="h-14 flex-1 text-lg"
            />
            <Input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qty"
              aria-label="Quantity"
              className="h-14 text-lg sm:w-28"
            />
            <Button type="submit" size="lg" className="h-14 text-lg font-bold">
              <Plus className="mr-1 h-5 w-5" aria-hidden /> Add
            </Button>
          </form>
        </Card>

        <Section
          title="Missing from your kitchen"
          hint="Not in your latest scan or your usual staples — buy these."
          items={missing}
          tone="missing"
          setItems={setItems}
        />

        <Section
          title="You may already have these"
          hint="These look like they're already in your fridge or cupboard."
          items={alreadyHave}
          tone="have"
          setItems={setItems}
        />

        <Section
          title="Picked up"
          items={items.filter((i) => i.done)}
          tone="done"
          setItems={setItems}
          onClear={() => setItems(clearDoneShoppingItems())}
        />

        {items.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">
            Your list is empty. Add an item above, or{" "}
            <Link to="/fridge-scan" className="underline">
              scan your fridge
            </Link>{" "}
            first so we know what you already have.
          </p>
        )}

        {kitchen.length === 0 && items.length > 0 && (
          <Card className="mt-6 flex items-center gap-3 p-4">
            <Refrigerator className="h-6 w-6 text-primary" aria-hidden />
            <p className="text-sm">
              We don't know what's in your kitchen yet.{" "}
              <Link to="/fridge-scan" className="font-semibold underline">
                Scan your fridge
              </Link>{" "}
              and we'll mark what you already have.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  hint,
  items,
  tone,
  setItems,
  onClear,
}: {
  title: string;
  hint?: string;
  items: ShoppingListItem[];
  tone: "missing" | "have" | "done";
  setItems: (i: ShoppingListItem[]) => void;
  onClear?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
      <div className="space-y-4">
        {groupByAisle(items).map((group) => (
          <div key={group.aisle}>
            <h3 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <span aria-hidden>{group.emoji}</span>
              {group.label}
              <span className="font-semibold normal-case tracking-normal opacity-70">
                ({group.items.length} · ~{formatMoney(estimateTotal(group.items.map(lineOf)).total)})
              </span>
            </h3>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Card
                    className={cn(
                      "flex items-center gap-3 p-3",
                      tone === "missing" && "ring-1 ring-primary/30",
                      tone === "done" && "opacity-60",
                    )}
                  >
                    <Button
                      variant={item.done ? "default" : "outline"}
                      size="icon"
                      aria-label={
                        item.done
                          ? `Mark ${item.name} as needed`
                          : `Mark ${item.name} as picked up`
                      }
                      onClick={() => setItems(toggleShoppingItem(item.id))}
                    >
                      <Check className="h-5 w-5" aria-hidden />
                    </Button>
                    <span className={cn("flex-1 text-lg", item.done && "line-through")}>
                      {item.name}
                      {item.qty && (
                        <span className="ml-2 text-sm text-muted-foreground">{item.qty}</span>
                      )}
                      <span className="ml-2 text-sm font-semibold text-muted-foreground">
                        ~{formatMoney(estimatePrice(lineOf(item)).dollars)}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => setItems(removeShoppingItem(item.id))}
                    >
                      {tone === "done" ? (
                        <Trash2 className="h-5 w-5" aria-hidden />
                      ) : (
                        <X className="h-5 w-5" aria-hidden />
                      )}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
