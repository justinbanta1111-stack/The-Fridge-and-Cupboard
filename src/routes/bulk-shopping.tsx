import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, PackageOpen, ShoppingCart, ThumbsDown, Recycle } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildBulkPlan, type BulkPlan } from "@/lib/bulk-shopping.functions";
import { getScanContext } from "@/lib/scan-context";
import { getTopStaples } from "@/lib/memory-kitchen";
import { addShoppingItem } from "@/lib/shopping-list";
import { ensureGuestSession } from "@/lib/guest";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";

export const Route = createFileRoute("/bulk-shopping")({
  head: () => ({
    meta: [
      { title: "Bulk & Costco Shopping Helper — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Warehouse-club shopping without the waste: which bulk buys make sense for your household, what to skip, and the meals each one feeds.",
      },
      { property: "og:title", content: "Bulk & Costco Shopping Helper — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Buy big only when it makes sense. Chef Super J plans your warehouse trip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BulkShoppingPage,
});

const FREEZER = [
  { id: "none", label: "No spare freezer" },
  { id: "small", label: "Freezer above the fridge" },
  { id: "large", label: "Chest freezer" },
] as const;

function BulkShoppingPage() {
  const run = useServerFn(buildBulkPlan);
  const { restrictions } = useDietaryPrefs();
  const [household, setHousehold] = useState(2);
  const [freezerSpace, setFreezerSpace] = useState<"none" | "small" | "large">("small");
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState<BulkPlan | null>(null);

  const scan = getScanContext();
  const haveAtHome = Array.from(
    new Set([...(scan?.items ?? []), ...getTopStaples()].map((s) => s.trim()).filter(Boolean)),
  ).slice(0, 80);

  const mutation = useMutation({
    mutationFn: async () => {
      await ensureGuestSession();
      return run({
        data: {
          household,
          freezerSpace,
          haveAtHome,
          useUpSoon: (scan?.useFirst ?? []).slice(0, 20),
          dietary: restrictions,
          note,
        },
      });
    },
    onSuccess: (result) => setPlan(result),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Something went wrong."),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
            <PackageOpen className="h-8 w-8 text-primary" aria-hidden />
            Bulk Shopping
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Costco-style trips, planned around what's already in your kitchen — so nothing goes to
            waste.
          </p>
        </header>

        <Card className="mb-6 space-y-4 p-4">
          <div>
            <label className="text-sm font-bold" htmlFor="household">
              How many people are you feeding?
            </label>
            <Input
              id="household"
              type="number"
              min={1}
              max={12}
              value={household}
              onChange={(e) => setHousehold(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 h-12 text-lg"
            />
          </div>

          <div>
            <p className="text-sm font-bold">Freezer space</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {FREEZER.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFreezerSpace(f.id)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    freezerSpace === f.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold" htmlFor="note">
              Anything else? (optional)
            </label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Kids are picky, we grill a lot…"
              className="mt-1 h-12 text-lg"
            />
          </div>

          <Button
            size="lg"
            className="h-14 w-full text-lg font-bold"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Let me take a look…
              </>
            ) : (
              "Plan my bulk trip"
            )}
          </Button>

          {haveAtHome.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tip:{" "}
              <Link to="/fridge-scan" className="font-semibold underline">
                scan your fridge
              </Link>{" "}
              first and this gets a lot smarter.
            </p>
          )}
        </Card>

        {plan && (
          <div className="space-y-5">
            <Card className="p-4">
              <p className="text-base leading-relaxed">{plan.summary}</p>
            </Card>

            {plan.buy.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-xl font-black">
                  <ShoppingCart className="h-5 w-5 text-primary" aria-hidden /> Worth buying big
                </h2>
                <div className="space-y-3">
                  {plan.buy.map((b) => (
                    <Card key={b.item} className="p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-lg font-bold">{b.item}</p>
                        <p className="text-sm font-semibold text-muted-foreground">{b.size}</p>
                      </div>
                      <p className="mt-1 text-sm">{b.why}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Keeps: {b.keeps}</p>
                      {b.meals.length > 0 && (
                        <p className="mt-1 text-sm">
                          <span className="font-semibold">Meals:</span> {b.meals.join(" · ")}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 font-bold"
                        onClick={() => {
                          addShoppingItem(b.item, b.size);
                          toast.success(`Added ${b.item} to your shopping list.`);
                        }}
                      >
                        Add to shopping list
                      </Button>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {plan.skip.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-xl font-black">
                  <ThumbsDown className="h-5 w-5 text-primary" aria-hidden /> Skip these this trip
                </h2>
                <Card className="space-y-2 p-4">
                  {plan.skip.map((s) => (
                    <p key={s.item} className="text-sm">
                      <span className="font-bold">{s.item}</span> — {s.why}
                    </p>
                  ))}
                </Card>
              </section>
            )}

            {plan.wasteTips.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-xl font-black">
                  <Recycle className="h-5 w-5 text-primary" aria-hidden /> Keep it from spoiling
                </h2>
                <Card className="space-y-2 p-4">
                  {plan.wasteTips.map((t) => (
                    <p key={t} className="text-sm">
                      • {t}
                    </p>
                  ))}
                </Card>
              </section>
            )}

            <Button asChild size="lg" className="h-14 w-full text-lg font-bold">
              <Link to="/shopping-list">Open my shopping list</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
