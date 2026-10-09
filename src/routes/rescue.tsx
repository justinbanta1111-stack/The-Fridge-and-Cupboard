import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Camera,
  Loader2,
  AlertTriangle,
  Clock,
  Trash2,
  Sparkles,
  ChefHat,
  Recycle,
  ArrowRight,
  Flame,
  CheckCircle2,
  Lightbulb,
  Play,
} from "lucide-react";
import { CookingMode } from "@/components/CookingMode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SiteNav } from "@/components/SiteNav";
import { SaveButton } from "@/components/SaveButton";

import { DietaryPicker } from "@/components/DietaryPicker";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { analyzeFridge, suggestRecipes, transformLeftovers } from "@/lib/fridge.functions";
import { playSizzle } from "@/lib/sound-effects";
import { PhotoPicker } from "@/components/PhotoPicker";
import { ScanAuthGate } from "@/components/ScanAuthGate";
import { ensureGuestSession } from "@/lib/guest";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { setScanContext } from "@/lib/scan-context";

export const Route = createFileRoute("/rescue")({
  head: () => ({
    meta: [
      { title: "Leftover Rescue — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Scan your leftovers, see what's going bad first, and transform them into meals nobody will recognize as leftovers.",
      },
      { property: "og:title", content: "Leftover Rescue" },
      {
        property: "og:description",
        content:
          "Snap your leftovers — Chef Super J flags what to use tonight and turns the rest into real dinners.",
      },
    ],
  }),
  component: RescuePage,
});

type Analyze = Awaited<ReturnType<typeof analyzeFridge>>;
type Recipes = Awaited<ReturnType<typeof suggestRecipes>>;
type Transformed = Awaited<ReturnType<typeof transformLeftovers>>;

type Step = "scan" | "triage" | "ideas" | "transform";

const URGENCY_ORDER: Record<string, number> = {
  "throw-out": 0,
  questionable: 1,
  "use-soon": 2,
  fresh: 3,
};

const URGENCY_META: Record<string, { label: string; cls: string; icon: typeof Clock; blurb: string }> = {
  "throw-out": {
    label: "Toss it",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: Trash2,
    blurb: "When in doubt, throw it out.",
  },
  questionable: {
    label: "Inspect",
    cls: "border-accent/40 bg-accent/10 text-accent",
    icon: AlertTriangle,
    blurb: "Sniff, look, decide. If unsure — toss.",
  },
  "use-soon": {
    label: "Tonight",
    cls: "border-warning/40 bg-warning/15 text-warning-foreground",
    icon: Clock,
    blurb: "Cook within 24-48 hours.",
  },
  fresh: {
    label: "This week",
    cls: "border-success/40 bg-success/10 text-success",
    icon: Sparkles,
    blurb: "Plenty of time — use as filler.",
  },
};

function getErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/^(SCAN_INVALID:|Scanner API|Store scan failed|Unauthorized)|undefined is not|Cannot read|TypeError|is not a function/i.test(raw)) {
    console.error("[scan] technical error", raw);
    return "I couldn't finish that scan. Tap Retry scan and I'll try that photo again.";
  }
  if (raw) return raw.replace(/^[A-Z_]+:\s*/, "");
  if (typeof error === "string" && error) return error;
  return "The scanner API connection failed. Please try another photo or retry in a moment.";
}

type StorageOpt = "fridge" | "freezer" | "pantry" | "counter" | "delivery-just-arrived";
type PackagingOpt = "sealed" | "opened" | "loose" | "mixed";
type SourceOpt = "grocery-store" | "delivery" | "farmers-market" | "leftovers-from-home" | "restaurant-takeout" | "other";

function RescuePage() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("scan");
  const [storage, setStorage] = useState<StorageOpt>("fridge");
  const [packaging, setPackaging] = useState<PackagingOpt>("mixed");
  const [source, setSource] = useState<SourceOpt>("grocery-store");
  const [purchasedDaysAgo, setPurchasedDaysAgo] = useState<number>(0);
  const [ctxDone, setCtxDone] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [cooking, setCooking] = useState<null | { title: string; subtitle?: string; steps: string[] }>(null);
  const { prefs, toggle, clear, restrictions } = useDietaryPrefs();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) return setUser(data.session.user);
      // Free to try: guests get an anonymous session automatically.
      try {
        setUser(await ensureGuestSession());
      } catch {
        setUser(null);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) setUser(s.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);


  const analyzeFn = useServerFn(analyzeFridge);
  const recipesFn = useServerFn(suggestRecipes);
  const transformFn = useServerFn(transformLeftovers);

  const mode: "lenten" | "fasting" | "holiday" | "default" = prefs.includes("orthodox-fasting")
    ? "fasting"
    : prefs.includes("lenten")
      ? "lenten"
      : "default";

  const analyzeMut = useMutation({
    mutationFn: async (dataUrl: string) => {
      const res = await analyzeFn({
        data: {
          imageDataUrl: dataUrl,
          restrictions,
          mode,
          storage,
          packaging,
          source,
          purchasedDaysAgo,
        },
      });
      if (!res || typeof res !== "object" || !Array.isArray((res as any).items)) {
        console.error("[scan] invalid analysis response", res);
        throw new Error("SCAN_INVALID: The scan reply was incomplete.");
      }
      return res;
    },
    onSuccess: (result) => {
      // Let the voice chef see the same leftovers the user just scanned,
      // so the conversation can continue from them.
      try {
        const usableItems = result.items.filter((i) => i.freshness !== "throw-out" && !i.unsafe);
        setScanContext({
          items: usableItems.map((i) => i.name),
          useFirst: usableItems
            .filter((i) => i.freshness === "use-soon" || i.freshness === "questionable")
            .map((i) => i.name),
          summary: result.summary,
          storage,
        });
      } catch {}
      setStep("triage");
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const rescueMut = useMutation({
    mutationFn: (input: { items: string[]; restrictions?: string[] }) =>
      recipesFn({ data: { items: input.items, cuisine: "Chef's pick — quick dinner tonight", restrictions: input.restrictions, mode } }),
    onSuccess: () => { try { playSizzle(); } catch {} setStep("ideas"); },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't fetch rescue dinner"),
  });

  const transformMut = useMutation({
    mutationFn: (input: { leftovers: string[]; pantry?: string[]; restrictions?: string[] }) =>
      transformFn({ data: { ...input, mode } }),
    onSuccess: () => { try { playSizzle(); } catch {} setStep("transform"); },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't transform leftovers"),
  });

  const analysis = analyzeMut.data as Analyze | undefined;
  const rescue = rescueMut.data as Recipes | undefined;
  const transformed = transformMut.data as Transformed | undefined;


  function resetAll() {
    setImageDataUrl(null);
    setStep("scan");
    analyzeMut.reset();
    rescueMut.reset();
    transformMut.reset();
  }

  // Items by priority: useFirst flagged + lowest timeLeft first, then by urgency band
  const sortedByPriority = [...(analysis?.items ?? [])].sort((a, b) => {
    const pa = typeof a.priorityRank === "number" ? a.priorityRank : 999;
    const pb = typeof b.priorityRank === "number" ? b.priorityRank : 999;
    if (pa !== pb) return pa - pb;
    const ua = URGENCY_ORDER[a.freshness] ?? 9;
    const ub = URGENCY_ORDER[b.freshness] ?? 9;
    if (ua !== ub) return ua - ub;
    const da = typeof a.timeLeftMinDays === "number" ? a.timeLeftMinDays : 99;
    const db = typeof b.timeLeftMinDays === "number" ? b.timeLeftMinDays : 99;
    return da - db;
  });
  const sorted = sortedByPriority;
  const useFirstItems = sorted.filter((i) => i.useFirst && !i.unsafe);
  const unsafeItems = sorted.filter((i) => i.unsafe);
  const safeSorted = sorted.filter((i) => !i.unsafe);
  // Prioritized usable list (most urgent SAFE items first) — feeds rescue dinner + transformer
  const usable = (analysis?.priorityOrder && analysis.priorityOrder.length
    ? analysis.priorityOrder
    : safeSorted.filter((i) => i.freshness !== "throw-out").map((i) => i.name));
  const leftoversOnly = safeSorted.filter((i) => i.category === "leftover" && i.freshness !== "throw-out");
  return (
    <div className="min-h-screen bg-background bg-grain">
      <SiteNav />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        {/* Header */}
        <section className="text-center">
          <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]">
            <Recycle className="mr-1.5 h-3 w-3" /> Flagship feature
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
            Leftover Rescue
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Snap your fridge. Tell us where it's stored and when you bought it. We sort by urgency,
            flag anything unsafe, build tonight's dinner, then transform the rest.
          </p>
        </section>

        {/* Stepper */}
        <Stepper step={step} hasImage={!!imageDataUrl} />

        {/* Step 1: scan */}
        {!imageDataUrl && (
          <div className="mt-8 space-y-6">
            {!ctxDone ? (
              <ScanContextForm
                storage={storage}
                setStorage={setStorage}
                packaging={packaging}
                setPackaging={setPackaging}
                source={source}
                setSource={setSource}
                purchasedDaysAgo={purchasedDaysAgo}
                setPurchasedDaysAgo={setPurchasedDaysAgo}
                onComplete={() => setCtxDone(true)}
              />
            ) : (
              <>
                <ScanContextSummary
                  storage={storage}
                  packaging={packaging}
                  source={source}
                  purchasedDaysAgo={purchasedDaysAgo}
                  onEdit={() => setCtxDone(false)}
                />
                <PhotoPicker
                  onPick={(_file, dataUrl) => {
                    if (!user) {
                      setShowAuthGate(true);
                      return;
                    }
                    setImageDataUrl(dataUrl);
                    analyzeMut.reset();
                    rescueMut.reset();
                    transformMut.reset();
                    analyzeMut.mutate(dataUrl);
                  }}
                  label="Start Scanning"
                />
                {showAuthGate && (
                  <ScanAuthGate message="Sign in to scan your leftovers, get AI triage, and unlock rescue recipes and transforms." />
                )}
                <DietaryPicker prefs={prefs} onToggle={toggle} onClear={clear} compact />
              </>
            )}
          </div>
        )}


        {imageDataUrl && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Card className="ring-paper overflow-hidden border-border/60 bg-card p-0">
              <div className="relative aspect-[4/5] w-full bg-muted">
                <img src={imageDataUrl} alt="Your fridge" className="h-full w-full object-cover" />
                {analyzeMut.isPending && (
                  <div className="absolute inset-0 grid place-items-center bg-foreground/60 text-background backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="font-display text-lg">Sorting by urgency…</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-secondary/40 p-3">
                <Button variant="ghost" size="sm" onClick={resetAll}>
                  Start over
                </Button>
                {analysis && (
                  <Badge variant="outline" className="border-primary/20 bg-card text-primary">
                    {analysis.items.length} items · {analysis.urgentCount ?? 0} urgent{analysis.unsafeCount ? ` · ${analysis.unsafeCount} unsafe` : ""}
                  </Badge>
                )}
              </div>
            </Card>

            <div className="space-y-6">
              {analyzeMut.isError && !analysis && (
                <Card className="ring-paper border-destructive/40 bg-destructive/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-2xl text-destructive">Scanner API error</h2>
                      <p className="mt-1 break-words text-sm text-foreground/90">{getErrorMessage(analyzeMut.error)}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {imageDataUrl && (
                          <Button onClick={() => analyzeMut.mutate(imageDataUrl)} disabled={analyzeMut.isPending}>
                            {analyzeMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Retry scan
                          </Button>
                        )}
                        <Button variant="outline" onClick={resetAll}>Choose another photo</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Step 2: Triage — What's Going Bad First */}
              {analysis && (
                <Card className="ring-paper border-border/60 bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-destructive">
                        What's going bad first
                      </div>
                      <h2 className="mt-1 font-display text-2xl tracking-tight">Triage</h2>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>

                  {analysis.photoQuality && analysis.photoQuality !== "clear" && (
                    <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                      Photo looks {analysis.photoQuality}. Some items are best-guess — confidence is lowered.
                    </p>
                  )}

                  {analysis.chefNote && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/[0.04] p-3 text-sm">
                      <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span><span className="font-semibold text-primary">Chef Super J:</span> {analysis.chefNote}</span>
                    </div>
                  )}

                  {unsafeItems.length > 0 && (
                    <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Food safety — do not eat
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-destructive">
                        {unsafeItems.map((u, i) => (
                          <li key={i}>
                            <span className="font-medium">{u.name}</span>
                            {u.unsafeReason ? <span className="text-destructive/80"> — {u.unsafeReason}</span> : null}
                          </li>
                        ))}
                      </ul>
                      {analysis.safetyWarnings && analysis.safetyWarnings.length > 0 && (
                        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-destructive/80">
                          {analysis.safetyWarnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {useFirstItems.length > 0 && (
                    <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-warning-foreground">
                        <Clock className="h-3.5 w-3.5" /> Use these first
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {useFirstItems.slice(0, 5).map((u, i) => (
                          <Badge key={i} variant="outline" className="border-warning/40 bg-card text-warning-foreground">
                            {u.name}
                            {u.timeLeftLabel ? <span className="ml-1 text-muted-foreground">· {u.timeLeftLabel}</span> : null}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}


                  <ul className="mt-4 space-y-2">
                    {sorted.map((item, idx) => {
                      const meta = URGENCY_META[item.freshness] ?? URGENCY_META.fresh;
                      const Icon = meta.icon;
                      const lowConf = typeof item.confidence === "number" && item.confidence < 0.6;
                      return (
                        <li
                          key={idx}
                          className={cn(
                            "flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm",
                            meta.cls,
                          )}
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-medium text-foreground">{item.name}</span>
                              <span className="text-xs uppercase tracking-wide opacity-80">{meta.label}</span>
                              {item.unsafe && (
                                <span className="rounded-sm border border-destructive bg-destructive px-1.5 text-[10px] font-bold uppercase tracking-widest text-destructive-foreground">
                                  Do not eat
                                </span>
                              )}
                              {item.useFirst && !item.unsafe && (
                                <span className="rounded-sm border border-warning/50 bg-warning/20 px-1.5 text-[10px] font-bold uppercase tracking-widest text-warning-foreground">
                                  Use first
                                </span>
                              )}
                              {item.estimatedQuantity && item.estimatedQuantity !== "unknown" && (
                                <span className="text-xs text-muted-foreground">· {item.estimatedQuantity}</span>
                              )}
                              {lowConf && (
                                <span className="rounded-sm border border-border/60 px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                                  best guess
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                              {item.timeLeftLabel && (
                                <span className="rounded-sm bg-foreground/5 px-1.5 py-0.5 font-medium text-foreground/90">
                                  ⏳ {item.timeLeftLabel}
                                  {typeof item.timeLeftMinDays === "number" &&
                                  typeof item.timeLeftMaxDays === "number" &&
                                  (item.timeLeftMinDays > 0 || item.timeLeftMaxDays > 0) ? (
                                    <span className="ml-1 text-muted-foreground">
                                      ({item.timeLeftMinDays === item.timeLeftMaxDays
                                        ? `${item.timeLeftMinDays}d`
                                        : `${item.timeLeftMinDays}–${item.timeLeftMaxDays}d`})
                                    </span>
                                  ) : null}
                                </span>
                              )}
                              {typeof item.freshnessConfidence === "number" && (
                                <span className="text-muted-foreground">
                                  {Math.round(item.freshnessConfidence * 100)}% sure
                                </span>
                              )}
                              {item.estimatedAge && (
                                <span className="text-muted-foreground">· age: {item.estimatedAge}</span>
                              )}
                            </div>
                            {item.containerAssumption && (
                              <p className="mt-1 text-xs text-muted-foreground">📦 {item.containerAssumption}</p>
                            )}
                            {item.freshnessReason && (
                              <p className="mt-0.5 text-xs italic text-muted-foreground">{item.freshnessReason}</p>
                            )}
                            {item.notes && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mt-4 text-xs italic text-muted-foreground">When in doubt, throw it out.</p>


                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Button
                      size="lg"
                      onClick={() => rescueMut.mutate({ items: usable, restrictions })}
                      disabled={rescueMut.isPending || usable.length === 0}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {rescueMut.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building dinner…</>
                      ) : (
                        <><ChefHat className="mr-2 h-4 w-4" /> Rescue dinner ideas</>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() =>
                        transformMut.mutate({
                          leftovers: leftoversOnly.length ? leftoversOnly.map((i) => i.name) : usable,
                          pantry: sorted.filter((i) => i.category !== "leftover" && i.freshness !== "throw-out").map((i) => i.name),
                          restrictions,
                        })
                      }
                      disabled={transformMut.isPending || usable.length === 0}
                      className="border-success/40 text-success hover:bg-success/10"
                    >
                      {transformMut.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transforming…</>
                      ) : (
                        <><Recycle className="mr-2 h-4 w-4" /> Transform leftovers</>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Step 3: Rescue dinner ideas */}
              {rescue && (
                <Card className="ring-paper border-primary/30 bg-primary/[0.03] p-5">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                      Chef Super J · Rescue Dinner
                    </div>
                  </div>
                  <h3 className="mt-1 font-display text-2xl tracking-tight">Tonight's options</h3>
                  <div className="mt-4 space-y-4">
                    {rescue.recipes.map((r, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-display text-lg tracking-tight">{r.title}</h4>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant="outline" className="border-primary/20 text-primary">
                              {r.timeMinutes} min
                            </Badge>
                            <SaveButton
                              category="leftovers"
                              title={r.title}
                              subtitle={r.description}
                              ingredients={r.usesFromFridge}
                              variant="icon"
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {r.usesFromFridge.map((u, j) => (
                            <Badge key={j} className="bg-success/15 text-success hover:bg-success/15">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> {u}
                            </Badge>
                          ))}
                          {r.alsoNeed.map((u, j) => (
                            <Badge key={j} variant="outline" className="border-border/60 text-muted-foreground">
                              + {u}
                            </Badge>
                          ))}
                        </div>
                        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground/90">
                          {r.steps.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ol>
                        <div className="mt-4">
                          <Button onClick={() => setCooking({ title: r.title, subtitle: r.description, steps: r.steps })} className="w-full font-semibold">
                            <Play className="mr-2 h-4 w-4" /> Start cooking — guide me step by step
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Step 4: Transformed leftovers */}
              {transformed && (
                <Card className="ring-paper border-success/30 bg-success/[0.04] p-5">
                  <div className="flex items-center gap-2">
                    <Recycle className="h-5 w-5 text-success" />
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-success">
                      Leftover Transformer
                    </div>
                  </div>
                  <h3 className="mt-1 font-display text-2xl tracking-tight">Nobody will know</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last night → tonight. Same food, completely new dish.
                  </p>

                  <div className="mt-4 space-y-4">
                    {transformed.recipes.map((r, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-display text-lg tracking-tight">{r.title}</h4>
                            <p className="mt-0.5 text-xs italic text-success">{r.transformation}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant="outline" className="border-success/30 text-success">
                              {r.timeMinutes} min · {r.difficulty}
                            </Badge>
                            <SaveButton
                              category="leftovers"
                              title={r.title}
                              subtitle={r.hook ?? r.transformation}
                              ingredients={r.usesLeftovers}
                              variant="icon"
                            />
                          </div>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">{r.hook}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {r.usesLeftovers.map((u, j) => (
                            <Badge key={j} className="bg-success/15 text-success hover:bg-success/15">
                              <Recycle className="mr-1 h-3 w-3" /> {u}
                            </Badge>
                          ))}
                          {r.alsoNeed.map((u, j) => (
                            <Badge key={j} variant="outline" className="border-border/60 text-muted-foreground">
                              + {u}
                            </Badge>
                          ))}
                        </div>
                        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground/90">
                          {r.steps.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ol>
                        <div className="mt-3 flex items-start gap-2 rounded-md bg-accent/10 p-3 text-sm">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span><span className="font-semibold text-accent">Chef Super J:</span> {r.chefTip}</span>
                        </div>
                        <div className="mt-4">
                          <Button onClick={() => setCooking({ title: r.title, subtitle: r.hook, steps: r.steps })} className="w-full font-semibold">
                            <Play className="mr-2 h-4 w-4" /> Start cooking — guide me step by step
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
      {cooking && (
        <CookingMode
          open
          onClose={() => setCooking(null)}
          title={cooking.title}
          subtitle={cooking.subtitle}
          steps={cooking.steps}
        />
      )}
    </div>
  );
}

function Stepper({ step, hasImage }: { step: Step; hasImage: boolean }) {
  const items: { id: Step; label: string; icon: typeof Camera }[] = [
    { id: "scan", label: "Scan", icon: Camera },
    { id: "triage", label: "Going bad first", icon: AlertTriangle },
    { id: "ideas", label: "Rescue dinner", icon: ChefHat },
    { id: "transform", label: "Transform", icon: Recycle },
  ];
  const order: Step[] = ["scan", "triage", "ideas", "transform"];
  const activeIdx = order.indexOf(step);
  return (
    <div className="mx-auto mt-6 flex max-w-2xl items-center justify-between gap-1 rounded-full border border-border/60 bg-card/60 p-1.5 text-xs">
      {items.map((it, i) => {
        const Icon = it.icon;
        const reached = i <= activeIdx && (i === 0 || hasImage);
        return (
          <div key={it.id} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 transition-colors",
                reached ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden font-medium uppercase tracking-wide sm:inline">{it.label}</span>
            </div>
            {i < items.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
          </div>
        );
      })}
    </div>
  );
}

const STORAGE_OPTS: { id: StorageOpt; label: string }[] = [
  { id: "fridge", label: "Fridge" },
  { id: "freezer", label: "Freezer" },
  { id: "pantry", label: "Pantry" },
  { id: "counter", label: "Counter" },
];
const STORAGE_EXTRA: { id: StorageOpt; label: string }[] = [
  { id: "delivery-just-arrived", label: "Just brought it home" },
];
const PACKAGING_OPTS: { id: PackagingOpt; label: string }[] = [
  { id: "sealed", label: "Sealed" },
  { id: "opened", label: "Opened" },
  { id: "loose", label: "Loose / Uncovered" },
  { id: "mixed", label: "Mixed" },
];
const SOURCE_OPTS: { id: SourceOpt; label: string }[] = [
  { id: "grocery-store", label: "Grocery Store" },
  { id: "leftovers-from-home", label: "Home Leftovers" },
  { id: "restaurant-takeout", label: "Restaurant Leftovers" },
  { id: "farmers-market", label: "Farmers Market" },
];
const SOURCE_EXTRA: { id: SourceOpt; label: string }[] = [
  { id: "delivery", label: "Brought home from store" },
  { id: "other", label: "Other" },
];
const DAYS_OPTS: { v: number; label: string }[] = [
  { v: 0, label: "Today" },
  { v: 2, label: "1–3 Days Ago" },
  { v: 5, label: "4–7 Days Ago" },
  { v: 10, label: "1–2 Weeks Ago" },
  { v: 30, label: "Older" },
];

function labelFor<T extends string>(opts: { id: T; label: string }[], v: T) {
  return opts.find((o) => o.id === v)?.label ?? String(v);
}

function ScanContextForm({
  storage,
  setStorage,
  packaging,
  setPackaging,
  source,
  setSource,
  purchasedDaysAgo,
  setPurchasedDaysAgo,
  onComplete,
}: {
  storage: StorageOpt;
  setStorage: (v: StorageOpt) => void;
  packaging: PackagingOpt;
  setPackaging: (v: PackagingOpt) => void;
  source: SourceOpt;
  setSource: (v: SourceOpt) => void;
  purchasedDaysAgo: number;
  setPurchasedDaysAgo: (v: number) => void;
  onComplete?: () => void;
}) {
  const [q, setQ] = useState(0);

  function advance() {
    if (q < 3) setQ(q + 1);
    else onComplete?.();
  }

  return (
    <Card className="ring-paper border-border/60 bg-card p-6 sm:p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">Question {q + 1} of 4</span>
          <span className="text-muted-foreground">{4 - (q + 1)} left</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn("h-1.5 flex-1 rounded-full", i <= q ? "bg-primary" : "bg-secondary")}
            />
          ))}
        </div>
      </div>

      {q === 0 && (
        <BigQuestion title="Where is the food?">
          <BigGrid
            value={storage}
            onChange={(v) => {
              setStorage(v);
              advance();
            }}
            options={STORAGE_OPTS}
          />
          <SmallOptions
            value={storage}
            onChange={(v) => {
              setStorage(v);
              advance();
            }}
            options={STORAGE_EXTRA}
            alwaysOpen
          />
        </BigQuestion>
      )}

      {q === 1 && (
        <BigQuestion title="How is it packaged?">
          <BigGrid
            value={packaging}
            onChange={(v) => {
              setPackaging(v);
              advance();
            }}
            options={PACKAGING_OPTS}
          />
        </BigQuestion>
      )}

      {q === 2 && (
        <BigQuestion title="Where did it come from?">
          <BigGrid
            value={source}
            onChange={(v) => {
              setSource(v);
              advance();
            }}
            options={SOURCE_OPTS}
          />
          <SmallOptions
            value={source}
            onChange={(v) => {
              setSource(v);
              advance();
            }}
            options={SOURCE_EXTRA}
          />
        </BigQuestion>
      )}

      {q === 3 && (
        <BigQuestion title="When was it purchased or cooked?">
          <div className="grid gap-3">
            {DAYS_OPTS.map((d) => (
              <BigButton
                key={d.v}
                active={purchasedDaysAgo === d.v}
                label={d.label}
                onClick={() => {
                  setPurchasedDaysAgo(d.v);
                  advance();
                }}
              />
            ))}
          </div>
        </BigQuestion>
      )}

      {q > 0 && (
        <button
          type="button"
          onClick={() => setQ(q - 1)}
          className="mt-6 text-base text-muted-foreground underline-offset-4 hover:underline"
        >
          Back
        </button>
      )}
    </Card>
  );
}

function ScanContextSummary({
  storage,
  packaging,
  source,
  purchasedDaysAgo,
  onEdit,
}: {
  storage: StorageOpt;
  packaging: PackagingOpt;
  source: SourceOpt;
  purchasedDaysAgo: number;
  onEdit: () => void;
}) {
  const parts = [
    labelFor([...STORAGE_OPTS, ...STORAGE_EXTRA], storage),
    labelFor(PACKAGING_OPTS, packaging),
    labelFor([...SOURCE_OPTS, ...SOURCE_EXTRA], source),
    DAYS_OPTS.find((d) => d.v === purchasedDaysAgo)?.label ?? "Today",
  ];
  return (
    <Card className="ring-paper flex items-center justify-between gap-4 border-border/60 bg-card p-5">
      <p className="min-w-0 text-lg font-medium leading-snug">{parts.join(" · ")}</p>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-base font-semibold text-primary underline-offset-4 hover:underline"
      >
        Change
      </button>
    </Card>
  );
}

function BigQuestion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h3>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function BigButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border-2 px-5 py-6 text-xl font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-background text-foreground hover:border-primary/60 hover:bg-primary/10",
      )}
    >
      {label}
    </button>
  );
}

function BigGrid<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => (
        <BigButton key={o.id} active={value === o.id} label={o.label} onClick={() => onChange(o.id)} />
      ))}
    </div>
  );
}

function SmallOptions<T extends string>({
  value,
  onChange,
  options,
  alwaysOpen,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  alwaysOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!alwaysOpen);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 text-base text-muted-foreground underline-offset-4 hover:underline"
      >
        More options
      </button>
    );
  }
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full border px-5 py-3 text-base transition-colors",
            value === o.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-background text-foreground hover:border-primary/60",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}


