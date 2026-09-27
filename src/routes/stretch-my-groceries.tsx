import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Coins,
  ShoppingBasket,
  Snowflake,
  AlarmClock,
  RefreshCcw,
  PiggyBank,
  Soup,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteNav } from "@/components/SiteNav";
import { getScanContext } from "@/lib/scan-context";
import { stretchMyGroceries, type StretchPlan } from "@/lib/stretch-groceries.functions";

export const Route = createFileRoute("/stretch-my-groceries")({
  head: () => ({
    meta: [
      { title: "Stretch My Groceries — Budget Meals | The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Make your groceries go further: budget meals from what you have, cheap add-ins, leftover stretchers, storage tips, and a budget-friendly shopping list.",
      },
    ],
  }),
  component: StretchMyGroceriesPage,
});

function ListCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </div>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {items.map((t, i) => (
          <li key={i}>• {t}</li>
        ))}
      </ul>
    </Card>
  );
}

function StretchMyGroceriesPage() {
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<StretchPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buildPlan() {
    setLoading(true);
    setError(null);
    try {
      const scan = getScanContext();
      const items = scan?.items ?? [];
      const result = await stretchMyGroceries({
        data: { items, notes: notes.trim() || undefined },
      });
      setPlan(result as StretchPlan);
    } catch {
      setError("Chef couldn't build the plan just now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-4 sm:pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <Card className="mt-3 border-0 bg-gradient-to-br from-jade/15 via-gold/10 to-background p-5 sm:p-7">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <PiggyBank className="h-4 w-4" /> Budget friendly
          </div>
          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">Stretch My Groceries</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
            Make what you have last longer and cost less. More meals from the same groceries,
            cheaper swaps, less waste — whether you're feeding a crowd, shopping a food bank, or
            just watching the budget.
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional: anything Chef should know? ('feeding 4 kids', 'mostly canned goods', '$25 for the week'…)"
            rows={2}
            maxLength={400}
            className="mt-4 bg-background/70"
          />
          <Button
            onClick={buildPlan}
            disabled={loading}
            className="mt-3 h-12 w-full gap-2 rounded-full text-base font-semibold"
          >
            <Sparkles className="h-5 w-5" />
            {loading ? "Chef is planning…" : plan ? "Build me a new plan" : "Build my stretch plan"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Uses your latest fridge &amp; cupboard scan automatically.
          </p>
          {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
        </Card>

        {plan && (
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm font-medium italic text-muted-foreground">
              “{plan.encouragement}”
            </p>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                <Soup className="h-4 w-4 text-primary" /> Meals from what you have
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.meals.map((m) => (
                  <Card key={m.title} className="p-4">
                    <div className="text-sm font-semibold">{m.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.why}</p>
                    {m.usesItems.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="font-semibold">Uses: </span>
                        {m.usesItems.join(", ")}
                      </div>
                    )}
                    {m.cheapAdds.length > 0 && (
                      <div className="mt-1 text-xs">
                        <span className="font-semibold">Cheap adds: </span>
                        {m.cheapAdds.join(", ")}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <ListCard
                icon={<AlarmClock className="h-4 w-4 text-destructive" />}
                title="Use these first"
                items={plan.useFirst}
              />
              <ListCard
                icon={<Snowflake className="h-4 w-4 text-teal" />}
                title="Store it so it lasts"
                items={plan.storageTips}
              />
              <ListCard
                icon={<RefreshCcw className="h-4 w-4 text-gold" />}
                title="Cheaper swaps"
                items={plan.swaps}
              />
              <ListCard
                icon={<ShoppingBasket className="h-4 w-4 text-jade" />}
                title="Budget shopping list"
                items={plan.budgetList}
              />
            </div>

            <ListCard
              icon={<Coins className="h-4 w-4 text-primary" />}
              title="Stretch every meal further"
              items={plan.stretchTips}
            />
          </div>
        )}
      </main>
    </div>
  );
}
