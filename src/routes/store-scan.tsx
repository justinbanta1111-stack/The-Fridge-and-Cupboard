import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { ScanLine, Loader2, Flame, ShoppingBasket, Snowflake, CheckCircle2, MapPin, ArrowRight, Plus } from "lucide-react";
import { addShoppingItem } from "@/lib/shopping-list";
import type { ScannedProduct } from "@/lib/store-scan.functions";
import { toast } from "sonner";
import { recordStoreScanItem } from "@/lib/store-scan-context";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoPicker } from "@/components/PhotoPicker";
import { scanStoreItem, type StoreScanResult } from "@/lib/store-scan.functions";
import { getTopStaples } from "@/lib/memory-kitchen";
import { getScanContext } from "@/lib/scan-context";
import { ensureGuestSession } from "@/lib/guest";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { findDish } from "@/lib/seo/content";
import { StorePicker } from "@/components/StorePicker";
import { StoreAskPanel } from "@/components/StoreAskPanel";
import type { SavedStore } from "@/lib/store-location";

export const Route = createFileRoute("/store-scan")({
  head: () => ({
    meta: [
      { title: "Scan Something at the Store — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Snap a photo of any grocery item and find out what it is, how to pick a good one, how to cook it, and what to make with it.",
      },
      { property: "og:title", content: "Scan Something at the Store — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Curious about an item in the aisle? Take a picture and Chef Super J explains it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreScanPage,
});

function StoreScanPage() {
  const run = useServerFn(scanStoreItem);
  const { restrictions } = useDietaryPrefs();
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<StoreScanResult | null>(null);
  const [scan] = useState(() => getScanContext());
  const [store, setStore] = useState<SavedStore | null>(null);
  const scanAreaRef = useRef<HTMLElement>(null);

  const haveAtHome = Array.from(
    new Set([...(scan?.items ?? []), ...getTopStaples()].map((s) => s.trim()).filter(Boolean)),
  ).slice(0, 60);
  const useUpSoon = (scan?.useFirst ?? []).slice(0, 20);

  const mutation = useMutation({
    mutationFn: async (imageDataUrl: string) => {
      await ensureGuestSession();
      const res = await run({
        data: {
          imageDataUrl,
          storeLocationId: store?.locationId ?? "",
          question: "",
          haveAtHome,
          useUpSoon,
          kitchenSummary: scan?.summary ?? "",
          dietary: restrictions,
        },
      });
      if (!res || !res.itemName) {
        throw new Error("I couldn't read that photo. Try another picture.");
      }
      return res;
    },
    onSuccess: (res) => {
      setResult(res);
      recordStoreScanItem(res.itemName);
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "I couldn't read that photo. Try another picture.",
      );
    },
  });

  useEffect(() => {
    if (!image) return;
    const frame = window.requestAnimationFrame(() => {
      scanAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [image]);

  function listLabel(p: ScannedProduct) {
    return [p.brand, p.name].filter(Boolean).join(" ");
  }

  function addOneToList(p: ScannedProduct) {
    addShoppingItem(listLabel(p), [p.count > 1 ? `${p.count} ×` : "", p.packSize].filter(Boolean).join(" "));
    toast.success(`${listLabel(p)} added to your grocery list.`);
  }

  function addAllToList(products: ScannedProduct[]) {
    products.forEach((p) =>
      addShoppingItem(listLabel(p), [p.count > 1 ? `${p.count} ×` : "", p.packSize].filter(Boolean).join(" ")),
    );
    toast.success(`${products.length} items added to your grocery list.`);
  }

  function startScan(dataUrl: string) {
    setImage(dataUrl);
    setResult(null);
    mutation.mutate(dataUrl);
  }


  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-36 pt-3 sm:px-6 sm:pt-4">
        <header className="mb-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-jade/40 bg-jade/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-jade">
            <ScanLine className="h-3.5 w-3.5" /> At the store
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Scan Something at the Store
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Photograph an item, shelf, produce display, meat case, package, or cart. I'll identify
            what I can see and suggest what you could make.
          </p>
        </header>

        <div className="space-y-3">
          <StorePicker store={store} onChange={setStore} />

          <PhotoPicker
            compact
            label="Take or choose a picture"
            onPick={(_file, dataUrl) => startScan(dataUrl)}
          />

          {image && (
            <section ref={scanAreaRef} className="scroll-mt-32" aria-live="polite">
              <Card className="overflow-hidden border-primary/40">
                <div className="relative bg-secondary/40">
                  <img
                    src={image}
                    alt="The grocery picture being scanned"
                    className="max-h-[52vh] min-h-64 w-full object-contain sm:min-h-80"
                  />
                  {mutation.isPending && (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-primary/10" />
                      <div className="store-scan-line pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary shadow-[0_0_18px_4px_var(--primary)]" />
                      <div className="absolute inset-x-3 bottom-3 rounded-md border border-border/70 bg-background/90 px-4 py-3 text-center shadow-lg backdrop-blur">
                        <div className="flex items-center justify-center gap-2 font-semibold text-foreground">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                          Scanning your picture…
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Chef Super J is identifying what you photographed.</p>
                      </div>
                    </>
                  )}
                </div>

                {result && (
                  <div className="space-y-4 p-4 sm:p-5">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Scan complete
                      </div>
                      <h2 className="mt-1 font-display text-2xl font-semibold">{result.itemName}</h2>
                      <p className="mt-1.5 text-sm">{result.whatItIs}</p>
                      {result.answer && <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm">{result.answer}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md border border-border p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold"><ShoppingBasket className="h-4 w-4 text-gold" /> Which one to buy</div>
                        <p className="mt-1 text-sm text-muted-foreground">{result.howToChoose}</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Where to find it</div>
                        <p className="mt-1 text-sm text-muted-foreground">{result.whereToFind}</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-gold" /> How to cook it</div>
                        <p className="mt-1 text-sm text-muted-foreground">{result.howToCook}</p>
                      </div>
                    </div>

                    {result.products.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold">What's in the picture</div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full px-3 text-[13px]"
                            onClick={() => addAllToList(result.products)}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add all to list
                          </Button>
                        </div>
                        <ul className="mt-2 space-y-2">
                          {result.products.map((p, i) => (
                            <li
                              key={`${p.name}-${i}`}
                              className="rounded-md border border-border bg-muted/30 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-sm font-semibold">
                                  {p.brand ? `${p.brand} ` : ""}
                                  {p.name}
                                </div>
                                {(p.livePrice ?? p.estimatedPrice) !== null && (
                                  <div className="shrink-0 text-right">
                                    <div className="text-sm font-semibold text-primary">
                                      {p.priceSource === "live"
                                        ? `$${p.livePrice!.toFixed(2)}`
                                        : `~$${p.estimatedPrice!.toFixed(2)}`}
                                    </div>
                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                      {p.priceSource === "live" ? "Store price today" : "Estimate"}
                                    </div>
                                    {p.pricePerServing !== null && (
                                      <div className="text-xs text-muted-foreground">
                                        ${p.pricePerServing.toFixed(2)} / serving
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {[
                                  p.count > 1 ? `${p.count} ×` : null,
                                  p.packSize || null,
                                  p.form,
                                  p.totalPounds ? `${p.totalPounds} lb total` : null,
                                  p.aisle,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                              {(p.caloriesPerServing !== null || p.servings !== null) && (
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  {[
                                    p.servings !== null ? `About ${p.servings} servings` : null,
                                    p.caloriesPerServing !== null
                                      ? `~${p.caloriesPerServing} cal per ${p.servingLabel ?? "serving"}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                              {p.sizeSource === "typical" && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Size not readable — using the usual shelf size.
                                </p>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="mt-1.5 h-8 px-2 text-[13px] text-primary"
                                onClick={() => addOneToList(p)}
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" /> Add to grocery list
                              </Button>
                            </li>
                          ))}
                        </ul>
                        {result.estimatedBasketTotal !== null && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Total for what I can see: about $
                            {result.estimatedBasketTotal.toFixed(2)}
                            {result.pricesAreLive && store
                              ? ` — using today's prices at ${store.name}. Prices can change and some items fall back to estimates.`
                              : " — an estimate, not your store's price."}{" "}
                            Calories are rough estimates too, not a nutrition label.
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-4">
                          <Link
                            to="/shopping-trip"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                          >
                            Start my shopping trip <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            to="/grocery-list"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                          >
                            Open my grocery list <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {result.goesWellWith.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold">Goes well with</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.goesWellWith.map((g) => <span key={g} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[13px]">{g}</span>)}
                        </div>
                      </div>
                    )}


                    {result.mealIdeas.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold">What you could make</div>
                        <ul className="mt-2 space-y-2">
                          {result.mealIdeas.map((m) => {
                            const dish = findDish(m.recipeSlug);
                            if (!dish) return null;
                            return (
                              <li key={dish.slug}>
                                <Link
                                  to="/how-to-make/$dish"
                                  params={{ dish: dish.slug }}
                                  className="group block rounded-md border border-border bg-muted/40 p-3 transition active:scale-[0.98] active:brightness-95 hover:border-primary/50"
                                  aria-label={`Open the full ${dish.name} recipe`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="font-display text-base font-semibold">{dish.name}</div>
                                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                  </div>
                                  <p className="mt-0.5 text-sm text-muted-foreground">{m.why}</p>
                                  {m.needToBuy.length > 0 && <p className="mt-1.5 text-sm"><span className="font-semibold">Grab too:</span> {m.needToBuy.join(", ")}</p>}
                                  {m.alreadyHave.length > 0 && <p className="mt-0.5 text-sm text-muted-foreground">You already have: {m.alreadyHave.join(", ")}</p>}
                                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                                    Open full recipe <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="rounded-md border border-border p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold"><Snowflake className="h-4 w-4 text-teal" /> Storing it</div>
                      <p className="mt-1 text-sm text-muted-foreground">{result.storageTip}</p>
                    </div>
                  </div>
                )}
              </Card>
            </section>
          )}

          <StoreAskPanel
            context={{
              imageDataUrl: image,
              itemName: result?.itemName ?? "",
              itemSummary: [result?.whatItIs, result?.howToChoose, result?.storageTip]
                .filter(Boolean)
                .join(" "),
              products: (result?.products ?? []).map((p) =>
                [p.brand, p.name, p.packSize].filter(Boolean).join(" "),
              ),
              haveAtHome,
              useUpSoon,
              dietary: restrictions,
              storeName: store?.name ?? "",
            }}
          />

        </div>

        <style>{`
          @keyframes store-scan-sweep {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(min(52vh, 360px)); opacity: 0; }
          }
          .store-scan-line { animation: store-scan-sweep 1.8s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .store-scan-line { animation: none; top: 50%; opacity: 1; }
          }
        `}</style>
      </main>
    </div>
  );
}
