import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { ShoppingBasket, Loader2, Crown, Sparkles, ThumbsUp, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoPicker } from "@/components/PhotoPicker";
import { recommendStorePick, type StoreHelpResult } from "@/lib/store-help.functions";
import { getTopStaples } from "@/lib/memory-kitchen";
import { getScanContext } from "@/lib/scan-context";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/store-help")({
  head: () => ({
    meta: [
      { title: "Help Me Choose at the Store — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Snap a store shelf and get one clear pick based on what you're cooking, what's already at home, value, health, and your dietary needs.",
      },
      { property: "og:title", content: "Help Me Choose at the Store — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Take a photo in the aisle and we'll tell you which item to buy — and why.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreHelpPage,
});

const FREE_TRY_KEY = "fac:store-help:free-try-used";

function freeTryUsed() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(FREE_TRY_KEY) === "1";
}

function StoreHelpPage() {
  const run = useServerFn(recommendStorePick);
  const { tier, loading } = useSubscription();
  const { restrictions } = useDietaryPrefs();
  const [image, setImage] = useState<string | null>(null);
  const [cookingFor, setCookingFor] = useState("");
  const [result, setResult] = useState<StoreHelpResult | null>(null);
  const [usedFreeTry, setUsedFreeTry] = useState(() => freeTryUsed());
  const [scan] = useState(() => getScanContext());

  const haveAtHome = Array.from(
    new Set([...(scan?.items ?? []), ...getTopStaples()].map((s) => s.trim()).filter(Boolean)),
  ).slice(0, 60);
  const useUpSoon = (scan?.useFirst ?? []).slice(0, 20);

  const isPremium = tier === "premium";
  const locked = !loading && !isPremium && usedFreeTry;

  const mutation = useMutation({
    mutationFn: (imageDataUrl: string) =>
      run({
        data: {
          imageDataUrl,
          cookingFor,
          haveAtHome,
          useUpSoon,
          kitchenSummary: scan?.summary ?? "",
          dietary: restrictions,
        },
      }),
    onSuccess: (data) => {
      setResult(data);
      if (!isPremium) {
        try {
          window.localStorage.setItem(FREE_TRY_KEY, "1");
        } catch {
          /* ignore */
        }
        setUsedFreeTry(true);
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "We couldn't read that shelf. Try another photo.");
    },
  });

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6">
        <header className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
            <ShoppingBasket className="h-3.5 w-3.5" /> At the store
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Help Me Choose
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            Take a photo of the shelf — cheese, bread, sauces, meats, produce — and I'll tell you which
            one to grab and why.
          </p>
        </header>

        {locked ? (
          <Card className="p-5">
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <Crown className="h-5 w-5 text-gold" /> You've used your free store scan
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Unlimited store help is part of Premium ($5.99/month). Upgrade to keep getting the best pick
              in every aisle.
            </p>
            <Button asChild className="mt-4">
              <Link to="/pro">See Premium</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">1. Take a photo of the shelf</div>
              <PhotoPicker
                compact
                label="Photograph the shelf"
                onPick={(_file, dataUrl) => {
                  setImage(dataUrl);
                  setResult(null);
                }}
              />
              {image && (
                <img
                  src={image}
                  alt="Store shelf you photographed"
                  className="mt-3 max-h-56 w-full rounded-xl object-cover"
                />
              )}
            </Card>

            <Card className="p-4">
              <label htmlFor="cookingFor" className="text-sm font-semibold">
                2. What are you shopping for?
              </label>
              <input
                id="cookingFor"
                value={cookingFor}
                onChange={(e) => setCookingFor(e.target.value)}
                placeholder="Taco night, sandwiches for the week, pasta dinner…"
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-jade"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                I'll also use what's already in your kitchen and your dietary preferences.
              </p>
              {haveAtHome.length > 0 && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">Using your kitchen</div>
                  {useUpSoon.length > 0 && (
                    <p className="mt-1">
                      Use up soon: <span className="text-foreground">{useUpSoon.join(", ")}</span>
                    </p>
                  )}
                  <p className="mt-1">At home: {haveAtHome.slice(0, 12).join(", ")}</p>
                </div>
              )}
            </Card>

            <Button
              size="lg"
              className="w-full"
              disabled={!image || mutation.isPending}
              onClick={() => image && mutation.mutate(image)}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Looking at the shelf…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> 3. Get my recommendation
                </>
              )}
            </Button>

            {!isPremium && !loading && (
              <p className="text-center text-xs text-muted-foreground">
                Premium feature — your first store scan is free to try.
              </p>
            )}
          </div>
        )}

        {result && (
          <section className="mt-6 space-y-4">
            <Card className="border-jade/40 p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-jade">Best pick</div>
              <div className="mt-1 font-display text-2xl font-semibold">{result.topPick.name}</div>
              <p className="mt-1.5 text-sm">{result.topPick.whyBest}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li>💵 {result.topPick.valueNote}</li>
                <li>🥗 {result.topPick.healthNote}</li>
                <li>🧾 {result.topPick.ingredientNote}</li>
              </ul>
              <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">{result.useItTonight}</p>
            </Card>

            {result.runnerUp && (
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ThumbsUp className="h-4 w-4 text-gold" /> Also good: {result.runnerUp.name}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{result.runnerUp.whyBest}</p>
              </Card>
            )}

            {result.skip.length > 0 && (
              <Card className="p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MinusCircle className="h-4 w-4 text-muted-foreground" /> I'd skip these
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {result.skip.map((s) => (
                    <li key={s.name}>
                      <span className="font-medium text-foreground">{s.name}</span> — {s.reason}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <p className="text-sm text-muted-foreground">{result.summary}</p>
          </section>
        )}
      </main>
    </div>
  );
}
