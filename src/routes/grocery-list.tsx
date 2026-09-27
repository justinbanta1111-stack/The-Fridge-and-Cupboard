import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, MapPin, Plus, Printer, ShoppingBasket, Store, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/SiteNav";
import { ExpiryAlerts } from "@/components/ExpiryAlerts";
import { cn } from "@/lib/utils";
import { getScanContext } from "@/lib/scan-context";
import { getTopStaples } from "@/lib/memory-kitchen";
import { getStoreScanNames } from "@/lib/store-scan-context";
import {
  addShoppingItem,
  clearDoneShoppingItems,
  getShoppingList,
  haveInKitchen,
  removeShoppingItem,
  toggleShoppingItem,
  type ShoppingListItem,
} from "@/lib/shopping-list";

export const Route = createFileRoute("/grocery-list")({
  component: GroceryListPage,
  head: () => ({
    meta: [
      { title: "Grocery List — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Add what you want to buy and see it side by side: what you already have in the fridge and what you spotted on your store scan.",
      },
      { property: "og:title", content: "Grocery List — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "One list, three answers: in your fridge, seen at the store, still to find.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function GroceryListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [fridge, setFridge] = useState<string[]>([]);
  const [storeSeen, setStoreSeen] = useState<string[]>([]);

  useEffect(() => {
    setItems(getShoppingList());
    const scan = getScanContext();
    setFridge([...(scan?.items ?? []), ...getTopStaples()]);
    setStoreSeen(getStoreScanNames());
  }, []);

  const open = useMemo(() => items.filter((i) => !i.done), [items]);
  const inFridge = useMemo(
    () => open.filter((i) => haveInKitchen(i.name, fridge)),
    [open, fridge],
  );
  const atStore = useMemo(
    () => open.filter((i) => !haveInKitchen(i.name, fridge) && haveInKitchen(i.name, storeSeen)),
    [open, fridge, storeSeen],
  );
  const stillToFind = useMemo(
    () => open.filter((i) => !haveInKitchen(i.name, fridge) && !haveInKitchen(i.name, storeSeen)),
    [open, fridge, storeSeen],
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
      <div className="no-print">
        <SiteNav />
      </div>
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
              <ShoppingBasket className="h-8 w-8 text-primary" aria-hidden />
              Grocery List
            </h1>
            <Button
              type="button"
              variant="outline"
              className="no-print font-bold"
              onClick={() => window.print()}
            >
              <Printer className="mr-1 h-4 w-4" aria-hidden /> Print list
            </Button>
          </div>
          <p className="mt-2 text-base text-muted-foreground">
            Add what you want to buy. We'll sort it into what's already in your fridge, what you
            spotted on a store scan, and what's still to find.
          </p>
        </header>

        <div className="no-print">
          <ExpiryAlerts className="mb-6" />
        </div>

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
              placeholder="Qty"
              aria-label="Quantity"
              className="h-14 text-lg sm:w-28"
            />
            <Button type="submit" size="lg" className="h-14 text-lg font-bold">
              <Plus className="mr-1 h-5 w-5" aria-hidden /> Add
            </Button>
          </form>
        </Card>

        <Card className="no-print mb-6 flex flex-wrap items-center gap-3 p-4">
          <ShoppingBasket className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-base">
            Heading to the store? Shop this list by aisle with prices and a running total.
          </p>
          <Button asChild className="font-bold">
            <Link to="/shopping-trip">Start shopping trip</Link>
          </Button>
        </Card>

        <Section
          title="Still to find"
          hint="Not in your fridge and not on a store scan yet."
          items={stillToFind}
          tone="missing"
          setItems={setItems}
        />
        <Section
          title="Seen on your store scan"
          hint="You scanned these at the store — grab them while you're there."
          items={atStore}
          tone="store"
          setItems={setItems}
        />
        <Section
          title="Already in your fridge"
          hint="Your latest scan says you have these. Skip unless you want more."
          items={inFridge}
          tone="have"
          setItems={setItems}
        />
        <Section
          title="In the cart"
          items={items.filter((i) => i.done)}
          tone="done"
          setItems={setItems}
          onClear={() => setItems(clearDoneShoppingItems())}
        />

        <Card className="no-print mt-6 flex flex-wrap items-center gap-3 p-4">
          <Store className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-base">Scan an item at the store or map your trip.</p>
          <Button asChild variant="outline">
            <Link to="/store-scan">Store scan</Link>
          </Button>
          <Button asChild className="font-bold">
            <Link to="/nearby-stores">
              <MapPin className="mr-1 h-4 w-4" aria-hidden /> Nearby stores
            </Link>
          </Button>
        </Card>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            main { padding: 0 !important; max-width: none !important; }
            body { background: #fff !important; color: #000 !important; }
            .print-check {
              display: inline-block !important;
              width: 14px; height: 14px;
              border: 1px solid #000; border-radius: 2px;
              margin-right: 10px;
            }
          }
        `}</style>
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
  tone: "missing" | "store" | "have" | "done";
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
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Card
              className={cn(
                "flex items-center gap-3 p-3",
                tone === "missing" && "ring-1 ring-primary/30",
                tone === "store" && "ring-1 ring-accent/40",
                tone === "done" && "opacity-60",
              )}
            >
              <span className="print-check hidden" aria-hidden />
              <Button
                variant={item.done ? "default" : "outline"}
                size="icon"
                className="no-print"
                aria-label={item.done ? `Move ${item.name} back to the list` : `Mark ${item.name} as in the cart`}
                onClick={() => setItems(toggleShoppingItem(item.id))}
              >
                <Check className="h-5 w-5" aria-hidden />
              </Button>
              <span className={cn("flex-1 text-lg", item.done && "line-through")}>
                {item.name}
                {item.qty && <span className="ml-2 text-sm text-muted-foreground">{item.qty}</span>}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="no-print"
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
    </section>
  );
}
