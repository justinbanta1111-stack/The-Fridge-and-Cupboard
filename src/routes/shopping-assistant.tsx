import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Apple,
  Milk,
  Beef,
  Fish,
  Wheat,
  Snowflake,
  Cookie,
  CupSoda,
  Croissant,
  Package,
  Volume2,
  VolumeX,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhotoPicker } from "@/components/PhotoPicker";
import {
  analyzeShoppingPhoto,
  type ShoppingScanItem,
} from "@/lib/shopping.functions";
import { readMemory, getTopStaples } from "@/lib/memory-kitchen";
import { speak, getVoiceEnabled, setVoiceEnabled } from "@/lib/voice-assistant";

export const Route = createFileRoute("/shopping-assistant")({
  head: () => ({
    meta: [
      { title: "Shopping Assistant — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Snap products at the store. We compare them to what's already in your kitchen, warn you about duplicates, and suggest pairings — so you only buy what you actually need.",
      },
      { property: "og:title", content: "Shopping Assistant — The Fridge and Cupboard" },
      {
        property: "og:description",
        content:
          "Scan groceries while you shop. Get instant 'you already have this' warnings and pairing tips.",
      },
    ],
  }),
  component: ShoppingAssistantPage,
});

const CATEGORY_META: Record<
  ShoppingScanItem["category"],
  { label: string; icon: typeof Apple; color: string }
> = {
  produce: { label: "Produce", icon: Apple, color: "text-emerald-600 bg-emerald-500/10" },
  dairy: { label: "Dairy", icon: Milk, color: "text-sky-600 bg-sky-500/10" },
  meat: { label: "Meat", icon: Beef, color: "text-rose-600 bg-rose-500/10" },
  seafood: { label: "Seafood", icon: Fish, color: "text-cyan-600 bg-cyan-500/10" },
  pantry: { label: "Pantry", icon: Wheat, color: "text-amber-600 bg-amber-500/10" },
  frozen: { label: "Frozen", icon: Snowflake, color: "text-blue-600 bg-blue-500/10" },
  snacks: { label: "Snacks", icon: Cookie, color: "text-orange-600 bg-orange-500/10" },
  beverages: { label: "Beverages", icon: CupSoda, color: "text-violet-600 bg-violet-500/10" },
  bakery: { label: "Bakery", icon: Croissant, color: "text-yellow-700 bg-yellow-500/10" },
  other: { label: "Other", icon: Package, color: "text-muted-foreground bg-muted" },
};

type CheckedItem = ShoppingScanItem & {
  alreadyHave: string | null; // matched staple name if duplicate
  pairsWith: string | null;
};

const PAIRINGS: Record<string, string[]> = {
  mozzarella: ["tomato", "basil", "chicken", "pasta"],
  cheese: ["bread", "pasta", "crackers"],
  chicken: ["lemon", "rice", "garlic", "broccoli"],
  pasta: ["tomato", "garlic", "olive oil", "cheese"],
  rice: ["chicken", "beans", "onion"],
  tomato: ["basil", "mozzarella", "pasta"],
  egg: ["spinach", "cheese", "bread"],
  beef: ["onion", "potato", "garlic"],
  fish: ["lemon", "garlic", "butter"],
  bread: ["butter", "cheese", "egg"],
};

function findPairing(name: string, staples: string[]): string | null {
  const key = Object.keys(PAIRINGS).find((k) => name.toLowerCase().includes(k));
  if (!key) return null;
  const match = PAIRINGS[key].find((p) => staples.some((s) => s.includes(p)));
  return match ?? null;
}

function checkAgainstMemory(items: ShoppingScanItem[]): {
  checked: CheckedItem[];
  staples: string[];
} {
  const mem = readMemory();
  const staples = Object.keys(mem.staples ?? {});
  const checked: CheckedItem[] = items.map((it) => {
    const hay = [it.name.toLowerCase(), ...(it.matchKeywords ?? [])];
    const match = staples.find((s) => hay.some((h) => h.includes(s) || s.includes(h)));
    return {
      ...it,
      alreadyHave: match ?? null,
      pairsWith: !match ? findPairing(it.name, staples) : null,
    };
  });
  return { checked, staples };
}

function ShoppingAssistantPage() {
  const analyze = useServerFn(analyzeShoppingPhoto);
  const [preview, setPreview] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [results, setResults] = useState<CheckedItem[] | null>(null);
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    setVoiceOn(getVoiceEnabled());
  }, []);

  const mutation = useMutation({
    mutationFn: (imageDataUrl: string) => analyze({ data: { imageDataUrl } }),
    onSuccess: (data) => {
      const { checked } = checkAgainstMemory(data.items);
      setResults(checked);
      setSummary(data.summary);
      const duplicates = checked.filter((c) => c.alreadyHave);
      const pairs = checked.filter((c) => c.pairsWith);
      const lines: string[] = [];
      if (duplicates.length) {
        const first = duplicates[0];
        lines.push(
          duplicates.length === 1
            ? `Heads up — you already have ${first.alreadyHave} at home.`
            : `Heads up — you already have ${duplicates.length} of these at home, starting with ${first.alreadyHave}.`,
        );
      }
      if (pairs.length) {
        const p = pairs[0];
        lines.push(`This pairs well with your ${p.pairsWith}.`);
      }
      if (!lines.length) {
        lines.push(
          checked.length
            ? `Found ${checked.length} item${checked.length === 1 ? "" : "s"}. Nothing duplicate at home.`
            : "I couldn't spot a product. Try a closer shot of the label.",
        );
      }
      if (voiceOn) speak(lines.join(" "));
      else toast.success(lines.join(" "));
    },
    onError: (err: Error) => {
      toast.error(err.message || "Scan failed");
    },
  });

  function handlePick(_file: File, dataUrl: string) {
    setPreview(dataUrl);
    setResults(null);
    setSummary("");
    mutation.mutate(dataUrl);
  }

  function reset() {
    setPreview(null);
    setResults(null);
    setSummary("");
    mutation.reset();
  }

  const grouped = useMemo(() => {
    if (!results) return null;
    const out: Record<string, CheckedItem[]> = {};
    for (const r of results) {
      (out[r.category] ??= []).push(r);
    }
    return out;
  }, [results]);

  const duplicateCount = results?.filter((r) => r.alreadyHave).length ?? 0;
  const topStaples = getTopStaples(undefined, 6);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-5">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Shop smarter
              </p>
              <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
                Shopping Assistant
              </h1>
            </div>
          </div>
          <p className="mt-3 text-base text-muted-foreground">
            At the store? Snap a product. We'll check it against your kitchen and warn you if
            you already have it — and tell you what it pairs with.
          </p>
        </header>

        {/* Voice toggle */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Voice feedback {voiceOn ? "on" : "off"}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              setVoiceEnabled(next);
            }}
          >
            {voiceOn ? "Mute" : "Unmute"}
          </Button>
        </div>

        {/* Memory hint */}
        {topStaples.length > 0 && (
          <Card className="mb-4 border-primary/20 bg-primary/[0.04] p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              In your Memory Kitchen
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {topStaples.map((s) => (
                <Badge key={s} variant="secondary" className="capitalize">
                  {s}
                </Badge>
              ))}
            </div>
          </Card>
        )}
        {topStaples.length === 0 && (
          <Card className="mb-4 border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p className="text-muted-foreground">
              Tip: scan your{" "}
              <Link to="/scan" className="font-semibold text-primary underline">
                fridge
              </Link>{" "}
              or{" "}
              <Link to="/cupboard" className="font-semibold text-primary underline">
                cupboard
              </Link>{" "}
              first so we know what's already at home.
            </p>
          </Card>
        )}

        {/* Picker */}
        {!preview && (
          <PhotoPicker
            onPick={handlePick}
            label="Snap a product, label, or shelf"
          />
        )}

        {/* Preview + scanning */}
        {preview && (
          <Card className="overflow-hidden p-0">
            <div className="relative">
              <img src={preview} alt="Shopping item" className="w-full object-cover" />
              {mutation.isPending && (
                <div className="absolute inset-0 grid place-items-center bg-black/50 text-white">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-7 w-7 animate-spin" />
                    <div className="text-sm font-medium">Checking your kitchen…</div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border/60 p-3">
              <div className="text-sm text-muted-foreground line-clamp-1">{summary}</div>
              <Button size="sm" variant="outline" onClick={reset} className="gap-1.5">
                <Camera className="h-4 w-4" /> New photo
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <section className="mt-5 space-y-4">
            {duplicateCount > 0 && (
              <Card className="border-amber-500/40 bg-amber-500/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-200">
                      You already have {duplicateCount} of these
                    </div>
                    <div className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-200/80">
                      Skip the duplicates — your fridge or cupboard already has them.
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {grouped &&
              Object.entries(grouped).map(([cat, items]) => {
                const meta = CATEGORY_META[cat as ShoppingScanItem["category"]] ?? CATEGORY_META.other;
                const Icon = meta.icon;
                return (
                  <div key={cat}>
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className={`grid h-7 w-7 place-items-center rounded-full ${meta.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className="font-display text-lg">{meta.label}</h2>
                      <span className="text-xs text-muted-foreground">
                        {items.length} item{items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((it, i) => (
                        <Card
                          key={`${it.name}-${i}`}
                          className={`p-3 ${
                            it.alreadyHave
                              ? "border-amber-500/40 bg-amber-500/5"
                              : it.pairsWith
                                ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                                : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium capitalize">{it.name}</div>
                              {it.brand && (
                                <div className="text-xs text-muted-foreground">{it.brand}</div>
                              )}
                            </div>
                            {it.alreadyHave ? (
                              <Badge className="shrink-0 bg-amber-500/20 text-amber-900 hover:bg-amber-500/20 dark:text-amber-200">
                                Already have
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="shrink-0 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> New
                              </Badge>
                            )}
                          </div>
                          {it.alreadyHave && (
                            <div className="mt-1.5 text-xs text-amber-900/90 dark:text-amber-200/90">
                              Matches "{it.alreadyHave}" in your kitchen.
                            </div>
                          )}
                          {it.pairsWith && (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                              <Sparkles className="h-3 w-3" />
                              Pairs well with your {it.pairsWith}.
                            </div>
                          )}
                          {it.notes && !it.alreadyHave && !it.pairsWith && (
                            <div className="mt-1.5 text-xs text-muted-foreground">{it.notes}</div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={reset} className="gap-2">
                <Camera className="h-4 w-4" /> Scan another
              </Button>
              <Button asChild variant="outline">
                <Link to="/before-you-shop">See what to cook tonight</Link>
              </Button>
            </div>
          </section>
        )}

        {results && results.length === 0 && (
          <Card className="mt-5 p-4 text-sm text-muted-foreground">
            We didn't spot a clear product. Try a closer shot of the label or a single item.
          </Card>
        )}
      </main>
    </div>
  );
}
