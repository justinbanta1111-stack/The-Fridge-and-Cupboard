import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Plus, Refrigerator, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/SiteNav";
import { ExpiryReminderSettings } from "@/components/ExpiryReminderSettings";
import { cn } from "@/lib/utils";
import { getScanContext } from "@/lib/scan-context";
import {
  addExpiryItem,
  friendlyWindow,
  getExpiryItems,
  removeExpiryItem,
  statusOf,
  suggestBestBy,
  trackScannedItems,
  updateExpiryDate,
  type ExpiryItem,
} from "@/lib/expiry";

export const Route = createFileRoute("/expiry")({
  component: ExpiryPage,
  head: () => ({
    meta: [
      { title: "Expiration Alerts — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "See which fridge items are going past their best, how long you have left, and cook them before they go to waste.",
      },
      { property: "og:title", content: "Expiration Alerts — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Gentle reminders for food that needs using, with days left for every item.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ExpiryPage() {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [scanned, setScanned] = useState<string[]>([]);

  useEffect(() => {
    setItems(getExpiryItems());
    setScanned(getScanContext()?.items ?? []);
  }, []);

  const needSoon = useMemo(() => items.filter((i) => statusOf(i.bestBy) !== "fresh"), [items]);
  const fresh = useMemo(() => items.filter((i) => statusOf(i.bestBy) === "fresh"), [items]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setItems(addExpiryItem(name, date || undefined));
    setName("");
    setDate("");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
            <Clock className="h-8 w-8 text-primary" aria-hidden />
            Expiration Alerts
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Track what's in the fridge and we'll gently remind you before it goes past its best.
          </p>
        </header>

        <ExpiryReminderSettings className="mb-6" />

        <Card className="mb-6 p-4">
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add an item (e.g. spinach)"
              aria-label="Item name"
              className="h-14 flex-1 text-lg"
            />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Best by date"
              className="h-14 text-lg sm:w-44"
            />
            <Button type="submit" size="lg" className="h-14 text-lg font-bold">
              <Plus className="mr-1 h-5 w-5" aria-hidden /> Track
            </Button>
          </form>
          <p className="mt-2 text-sm text-muted-foreground">
            No date? We'll estimate one for you
            {name.trim() ? ` — ${name.trim()} around ${suggestBestBy(name)}` : ""}.
          </p>
        </Card>

        {scanned.length > 0 && (
          <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
            <Refrigerator className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 flex-1 text-base">
              Track the {scanned.length} item{scanned.length === 1 ? "" : "s"} from your latest
              fridge scan.
            </p>
            <Button onClick={() => setItems(trackScannedItems(scanned))} className="font-bold">
              Track them
            </Button>
          </Card>
        )}

        <Group
          title="Use these first"
          hint="Past their best, or close to it."
          items={needSoon}
          setItems={setItems}
          urgent
        />
        <Group title="Still good" items={fresh} setItems={setItems} />

        {items.length === 0 && (
          <Card className="p-6 text-center text-lg text-muted-foreground">
            Nothing tracked yet. Add an item above, or{" "}
            <Link to="/fridge-scan" className="font-semibold text-primary underline">
              scan your fridge
            </Link>
            .
          </Card>
        )}
      </main>
    </div>
  );
}

function Group({
  title,
  hint,
  items,
  setItems,
  urgent,
}: {
  title: string;
  hint?: string;
  items: ExpiryItem[];
  setItems: (i: ExpiryItem[]) => void;
  urgent?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {hint && <p className="mb-2 text-sm text-muted-foreground">{hint}</p>}
      <ul className="space-y-2">
        {items.map((item) => {
          const status = statusOf(item.bestBy);
          return (
            <li key={item.id}>
              <Card
                className={cn(
                  "flex flex-wrap items-center gap-3 p-3",
                  urgent && "ring-1 ring-primary/40",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{item.name}</p>
                  <p
                    className={cn(
                      "text-sm",
                      status === "past" || status === "today"
                        ? "font-semibold text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {friendlyWindow(item.bestBy)}
                  </p>
                </div>
                <Input
                  type="date"
                  value={item.bestBy}
                  aria-label={`Best by date for ${item.name}`}
                  onChange={(e) => setItems(updateExpiryDate(item.id, e.target.value))}
                  className="h-11 w-40 text-base"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Stop tracking ${item.name}`}
                  onClick={() => setItems(removeExpiryItem(item.id))}
                >
                  <Trash2 className="h-5 w-5" aria-hidden />
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
