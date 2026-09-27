import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleDollarSign,
  Plus,
  Printer,
  ShoppingCart,
  Store,
  Trash2,
  Undo2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SiteNav } from "@/components/SiteNav";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/native-bridge";
import { useLivePrices } from "@/hooks/useLivePrices";
import { estimatePrice, formatMoney } from "@/lib/grocery-prices";
import { AISLE_LABEL, AISLE_ORDER, aisleFor, type Aisle } from "@/lib/aisles";
import {
  addShoppingItem,
  clearDoneShoppingItems,
  getShoppingList,
  removeShoppingItem,
  toggleShoppingItem,
  type ShoppingListItem,
} from "@/lib/shopping-list";

export const Route = createFileRoute("/shopping-trip")({
  component: ShoppingTripPage,
  head: () => ({
    meta: [
      { title: "Shopping Trip — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Take your grocery list to the store: prices as you go, a running total, and a tap to mark each item bought.",
      },
      { property: "og:title", content: "Shopping Trip — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Your store run, sorted by aisle, with a running total that updates as you shop.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type PricedItem = ShoppingListItem & { dollars: number; known: boolean; aisle: Aisle };

function ShoppingTripPage() {
  const prices = useLivePrices();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");

  useEffect(() => {
    setItems(getShoppingList());
  }, []);

  const priced = useMemo<PricedItem[]>(() => {
    void prices.version;
    return items.map((item) => {
      const line = [item.qty, item.name].filter(Boolean).join(" ");
      const { dollars, known } = estimatePrice(line);
      return { ...item, dollars, known, aisle: aisleFor(item.name) };
    });
  }, [items, prices.version]);

  const toBuy = useMemo(() => priced.filter((i) => !i.done), [priced]);
  const bought = useMemo(() => priced.filter((i) => i.done), [priced]);

  const spent = bought.reduce((sum, i) => sum + i.dollars, 0);
  const remaining = toBuy.reduce((sum, i) => sum + i.dollars, 0);
  const anyGuessed = priced.some((i) => !i.known);
  const doneCount = bought.length;
  const total = priced.length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const byAisle = useMemo(() => {
    const groups = new Map<Aisle, PricedItem[]>();
    for (const item of toBuy) {
      const list = groups.get(item.aisle) ?? [];
      list.push(item);
      groups.set(item.aisle, list);
    }
    return AISLE_ORDER.filter((a) => groups.has(a)).map(
      (a) => [AISLE_LABEL[a], groups.get(a)!] as const,
    );
  }, [toBuy]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setItems(addShoppingItem(name, qty));
    setName("");
    setQty("");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print">
        <SiteNav />
      </div>
      <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6">
        <header className="mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
              <ShoppingCart className="h-8 w-8 text-primary" aria-hidden />
              Shopping Trip
            </h1>
            <Button
              type="button"
              variant="outline"
              className="no-print font-bold"
              onClick={() => window.print()}
            >
              <Printer className="mr-1 h-4 w-4" aria-hidden /> Print
            </Button>
          </div>
          <p className="mt-2 text-base text-muted-foreground">
            Everything you added from Grocery Store scans and your list, grouped by store section.
            Tap an item when it's in your cart.
          </p>
        </header>

        <Card className="mb-5 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Still to buy</p>
              <p className="text-3xl font-black tabular-nums">{formatMoney(remaining)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-muted-foreground">In the cart</p>
              <p className="text-2xl font-bold tabular-nums text-primary">{formatMoney(spent)}</p>
            </div>
          </div>
          <Progress value={percent} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {doneCount} of {total} items in the cart · Trip total{" "}
            <strong className="text-foreground">{formatMoney(spent + remaining)}</strong>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleDollarSign className="h-3.5 w-3.5" aria-hidden />
            {prices.note}
            {anyGuessed ? " · some items are rough estimates" : ""} — estimates only, your receipt
            may differ.
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Store className="h-3.5 w-3.5" aria-hidden /> {prices.store}
          </p>
        </Card>

        <Card className="no-print mb-6 p-4">
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add an item (e.g. olive oil)"
              aria-label="Item name"
              className="h-14 flex-1 text-lg"
            />
            <Input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="How much"
              aria-label="Quantity"
              className="h-14 text-lg sm:w-36"
            />
            <Button type="submit" className="h-14 px-6 text-base font-bold">
              <Plus className="mr-1 h-5 w-5" aria-hidden /> Add
            </Button>
          </form>
        </Card>

        {total === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-base font-semibold">Your trip is empty.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan a shelf or your cart in Grocery Store mode and tap "Add to list", or add items
              above.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild className="font-bold">
                <Link to="/store-scan">Scan the store</Link>
              </Button>
              <Button asChild variant="outline" className="font-bold">
                <Link to="/grocery-list">Open grocery list</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {byAisle.map(([aisle, list]) => (
              <section key={aisle}>
                <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-muted-foreground">
                  {aisle}
                </h2>
                <ul className="space-y-2">
                  {list.map((item) => (
                    <li key={item.id}>
                      <Card className="flex items-center gap-3 p-3">
                        <button
                          type="button"
                          onClick={() => {
                            void haptic(item.done ? "light" : "success");
                            setItems(toggleShoppingItem(item.id));
                          }}
                          aria-label={`Mark ${item.name} as bought`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 text-primary transition-transform active:scale-90"
                        >
                          <Check className="h-5 w-5" aria-hidden />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold">{item.name}</p>
                          {item.qty ? (
                            <p className="text-xs text-muted-foreground">{item.qty}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-base font-bold tabular-nums">
                          {item.dollars > 0 ? formatMoney(item.dollars) : "—"}
                          {!item.known && item.dollars > 0 ? (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              est.
                            </span>
                          ) : null}
                        </p>
                        <button
                          type="button"
                          onClick={() => setItems(removeShoppingItem(item.id))}
                          aria-label={`Remove ${item.name}`}
                          className="no-print shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {bought.length > 0 && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                    In the cart
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="no-print font-bold"
                    onClick={() => setItems(clearDoneShoppingItems())}
                  >
                    Clear bought
                  </Button>
                </div>
                <ul className="space-y-2">
                  {bought.map((item) => (
                    <li key={item.id}>
                      <Card
                        className={cn(
                          "flex items-center gap-3 p-3 opacity-70",
                          "bg-muted/40",
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-5 w-5" aria-hidden />
                        </span>
                        <p className="min-w-0 flex-1 truncate text-base font-semibold line-through">
                          {item.name}
                        </p>
                        <p className="shrink-0 text-base font-bold tabular-nums">
                          {item.dollars > 0 ? formatMoney(item.dollars) : "—"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void haptic(item.done ? "light" : "success");
                            setItems(toggleShoppingItem(item.id));
                          }}
                          aria-label={`Put ${item.name} back on the list`}
                          className="no-print shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Undo2 className="h-4 w-4" aria-hidden />
                        </button>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
