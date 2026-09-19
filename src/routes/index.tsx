import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  ChefHat,
  AlertTriangle,
  Trash2,
  Clock,
  Loader2,
  Refrigerator,
  ArrowRight,
  Bookmark,
  History,
  Lightbulb,
  Share2,
  Monitor,
  Smartphone,
  Play,
  ShoppingCart,
  Package,
  Soup,
  Heart,
  Check,
  Pencil,
  Flag,
  Camera,
  TrendingUp,
  Leaf,
  Utensils,
  Gift,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CookingMode } from "@/components/CookingMode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { analyzeFridge, suggestRecipes } from "@/lib/fridge.functions";
import { saveScan, getMyScans } from "@/lib/scans.functions";
import { submitScanFeedback } from "@/lib/feedback.functions";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { logCookedMeal, getRecentInventory } from "@/lib/savings.functions";
import { getSavingsTotals, getLeftovers, leftoverStatus } from "@/lib/savings-hub";
import { playSizzle, playChaChing } from "@/lib/sound-effects";
import { supabase } from "@/integrations/supabase/client";

import { SiteNav } from "@/components/SiteNav";
import { HealthSpecialNeedsStrip } from "@/components/HealthSpecialNeedsStrip";
import { DietaryPicker } from "@/components/DietaryPicker";
import { PersonalizedPicks } from "@/components/PersonalizedPicks";
import { FlagshipFeatures } from "@/components/FlagshipFeatures";
import { ChefCompanionStrip } from "@/components/ChefCompanionStrip";
import { DayOfMealsStrip } from "@/components/DayOfMealsStrip";
import { FridgeIntro } from "@/components/FridgeIntro";
import { PhotoPicker } from "@/components/PhotoPicker";
import { ScanAnimation } from "@/components/ScanAnimation";
import { SavingsDashboard } from "@/components/SavingsDashboard";
import { RescueCenter } from "@/components/RescueCenter";
import { ShareScanModal } from "@/components/ShareScanCard";
import { ScanAuthGate } from "@/components/ScanAuthGate";
import { InstallAppButton } from "@/components/InstallAppButton";
import { PlanBanners } from "@/components/PlanBanners";
import { SaveButton } from "@/components/SaveButton";
import { BenefitCards } from "@/components/BenefitCards";
import { SavingsMeter } from "@/components/SavingsMeter";
import { ActionGrid } from "@/components/ActionGrid";

import { ChefTipOfTheDay } from "@/components/ChefTipOfTheDay";
import { MeetChefSuperJ } from "@/components/MeetChefSuperJ";
import { SurpriseMeButton } from "@/components/SurpriseMeButton";
import { CuisineWheel } from "@/components/CuisineWheel";
import { PantryTreasureHunt } from "@/components/PantryTreasureHunt";
import { SavingsBragMode } from "@/components/SavingsBragMode";
import { FamilyFavorites } from "@/components/FamilyFavorites";
import { WeeklyChallenges } from "@/components/WeeklyChallenges";
import { SharePlateButton } from "@/components/SharePlateModal";
import { ShareMenu } from "@/components/ShareMenu";
import { InviteAndShareStrip } from "@/components/InviteAndShareStrip";
import { KitchenMagicStrip } from "@/components/KitchenMagicStrip";
import { GrowthHubStrip } from "@/components/GrowthHubStrip";
import { FunModeStrip } from "@/components/FunModeStrip";
import { SavingsHubStrip } from "@/components/SavingsHubStrip";
import { SocialHubStrip } from "@/components/SocialHubStrip";
import { SmartInsightsStrip } from "@/components/SmartInsightsStrip";
import { DailyCoachStrip } from "@/components/DailyCoachStrip";
import { LifeModeStrip } from "@/components/LifeModeStrip";
import { FamilyLegacyStrip } from "@/components/FamilyLegacyStrip";
import { PersonalizedWelcome } from "@/components/PersonalizedWelcome";
import { FoodPersonalityCard } from "@/components/FoodPersonality";
import { recordScan, recordCuisine, recordAction } from "@/lib/food-personality";
import { buildMealShareMessage } from "@/lib/share-messages";
import { FloatingIngredients } from "@/components/effects/FloatingIngredients";
import { ScanLines } from "@/components/effects/ScanLines";
import { celebrate } from "@/components/effects/Celebration";
import { getRandomCompliment } from "@/lib/chef-tips";



import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { dietLabel } from "@/lib/personalization";
import { MemoryKitchenCard } from "@/components/MemoryKitchenCard";
import { BatchKStrip } from "@/components/BatchKStrip";
import { UseItTonightStrip } from "@/components/UseItTonightStrip";
import { TonightsRescueMission } from "@/components/TonightsRescueMission";
import { WowTourButton } from "@/components/WowTour";
import { ShowMeWhatThisCanDoButton } from "@/components/ShowMeWhatThisCanDo";
import { rememberCook, rememberStaples } from "@/lib/memory-kitchen";
import { toast } from "sonner";
import heroKitchen from "@/assets/hero-kitchen.jpg";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Fridge and Cupboard — Scan Your Fridge, Use What You Already Have" },
      {
        name: "description",
        content:
          "Snap your fridge, cupboard, or leftovers. The Fridge and Cupboard turns what you already own into real meals — save money, waste less food, cook tonight. Not a delivery or ordering app.",
      },
      { property: "og:title", content: "The Fridge and Cupboard — Use What You Already Have" },
      {
        property: "og:description",
        content:
          "Scan your fridge. Scan your cupboard. Use your leftovers. Save money. Reduce food waste.",
      },
      { property: "og:url", content: "https://thefridgeandcupboard.com/" },
    ],
    links: [{ rel: "canonical", href: "https://thefridgeandcupboard.com/" }],
  }),
  component: Home,
});

const CUISINES = [
  { id: "american", label: "American", emoji: "🍔" },
  { id: "italian", label: "Italian", emoji: "🍝" },
  { id: "mexican", label: "Mexican", emoji: "🌮" },
  { id: "greek", label: "Greek", emoji: "🫒" },
  { id: "asian", label: "Asian", emoji: "🥡" },
  { id: "indian", label: "Indian", emoji: "🍛" },
  { id: "thai", label: "Thai", emoji: "🍜" },
  { id: "mediterranean", label: "Mediterranean", emoji: "🥙" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "kid-friendly", label: "Kid-Friendly", emoji: "🧒" },
  { id: "comfort", label: "Comfort Food", emoji: "🍲" },
  { id: "holiday-turkey", label: "Holiday Turkey", emoji: "🦃" },
  { id: "holiday-ham", label: "Holiday Ham", emoji: "🍖" },
  { id: "desserts", label: "Desserts", emoji: "🍫" },
  { id: "anything", label: "Anything Goes", emoji: "✨" },
];

const TIPS = [
  "Pair tomatoes with basil — the classic for a reason. Anti-inflammatory + flavor magic.",
  "Add a pinch of salt to chocolate desserts. It makes the sweetness pop.",
  "Bloom dry spices in hot oil 30s before adding liquid — flavor doubles.",
  "Stale bread? Croutons, breadcrumbs, or a savory bread pudding. Never toss it.",
  "Wilting greens? Sauté with garlic, or blend into smoothies and pestos.",
  "Lemon juice wakes up flat soups, stews, and sauces — try a squeeze before serving.",
  "Black pepper unlocks turmeric — they belong together.",
  "Brown your butter for nutty, restaurant-level pasta and cookies.",
  "Roast leftover veg with olive oil and salt — they get a second life.",
  "Toast nuts before adding to any dish. 3 minutes, huge difference.",
  "Fire-roast tomatoes on a dry skillet for smoky pico de gallo — onion, cilantro, lime, salt.",
];

const SCAN_LOADING_MESSAGES = [
  "Chef Super J is checking your fridge and cupboard…",
  "Opening the fridge door…",
  "Peeking behind the leftovers…",
  "Reading the labels on those jars…",
  "Checking what's lurking in the back…",
  "Sniffing out anything questionable…",
  "Sorting fresh from past-its-prime…",
  "Asking Chef Super J for a second opinion…",
  "Building your rescue plan…",
];


const freshnessStyles: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  fresh: { label: "Fresh", className: "bg-success/15 text-success border-success/30", icon: Sparkles },
  "use-soon": { label: "Use Soon", className: "bg-warning/20 text-warning-foreground border-warning/40", icon: Clock },
  questionable: { label: "Questionable", className: "bg-accent/15 text-accent border-accent/30", icon: AlertTriangle },
  "throw-out": { label: "Toss It", className: "bg-destructive/15 text-destructive border-destructive/30", icon: Trash2 },
};

type AnalyzeResult = Awaited<ReturnType<typeof analyzeFridge>>;
type RecipesResult = Awaited<ReturnType<typeof suggestRecipes>>;

type StorageOpt = "fridge" | "freezer" | "pantry" | "counter";
const STORAGE_OPTS: { id: StorageOpt; label: string; emoji: string }[] = [
  { id: "fridge", label: "Fridge", emoji: "🧊" },
  { id: "freezer", label: "Freezer", emoji: "❄️" },
  { id: "pantry", label: "Cupboard / Pantry", emoji: "🥫" },
  { id: "counter", label: "Counter", emoji: "🍞" },
];
const URGENCY_RANK: Record<string, number> = { "throw-out": 0, questionable: 1, "use-soon": 2, fresh: 3 };

function getErrorMessage(error: unknown) {
  const raw =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "string" && error
        ? error
        : "The scanner couldn't read that photo. Please try another.";
  if (raw.startsWith("NO_ITEMS:"))
    return raw.replace(/^NO_ITEMS:\s*/, "");
  if (raw.startsWith("RATE_LIMITED:"))
    return raw.replace(/^RATE_LIMITED:\s*/, "🚦 ");
  if (raw.startsWith("CREDITS_EXHAUSTED:"))
    return raw.replace(/^CREDITS_EXHAUSTED:\s*/, "💳 ");
  if (raw.startsWith("TIMEOUT:"))
    return raw.replace(/^TIMEOUT:\s*/, "⏱ ");
  if (raw.startsWith("NETWORK:"))
    return raw.replace(/^NETWORK:\s*/, "📶 ");
  return raw;
}

function errorActionLabel(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (raw.startsWith("CREDITS_EXHAUSTED:")) return "See Pro plan";
  if (raw.startsWith("NO_ITEMS:")) return "Choose another photo";
  return "Retry scan";
}


function Home() {
  const [introDismissed, setIntroDismissed] = useState(false);
  const [introClosing, setIntroClosing] = useState(false);

  return (
    <>
      <FridgeIntro
        onClosing={() => setIntroClosing(true)}
        onDismissed={() => setIntroDismissed(true)}
      />
      <div
        style={{
          opacity: introClosing || introDismissed ? 1 : 0,
          transform: introClosing || introDismissed ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 1400ms ease-in-out, transform 1400ms cubic-bezier(0.22,1,0.36,1)",
          pointerEvents: introDismissed ? "auto" : "none",
        }}
      >
        <ScannerApp showIntro />
      </div>
    </>
  );
}

export function ScannerApp({ showIntro = true, initialStorage = "fridge" }: { showIntro?: boolean; initialStorage?: StorageOpt }) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState(false);
  const [cuisine, setCuisine] = useState<string>("italian");
  const [storage, setStorage] = useState<StorageOpt>(initialStorage);
  const [shareOpen, setShareOpen] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const quickFileRef = useRef<HTMLInputElement>(null);

  function handleQuickAction(storageType: StorageOpt) {
    setStorage(storageType);
    try { recordAction(storageType); } catch {}
    quickFileRef.current?.click();
  }

  const [user, setUser] = useState<any>(null);
  const { prefs, toggle, clear } = useDietaryPrefs();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const analyzeFn = useServerFn(analyzeFridge);
  const recipesFn = useServerFn(suggestRecipes);
  const saveScanFn = useServerFn(saveScan);
  const getMyScansFn = useServerFn(getMyScans);
  const getRecentInventoryFn = useServerFn(getRecentInventory);
  const submitFeedbackFn = useServerFn(submitScanFeedback);

  const logCookedFn = useServerFn(logCookedMeal);

  const recentInventoryQuery = useQuery({
    queryKey: ["recent-inventory"],
    queryFn: () => getRecentInventoryFn(),
    enabled: !!user,
  });

  const recipesMut = useMutation({
    mutationFn: (input: { items: string[]; cuisine: string; restrictions?: string[] }) => recipesFn({ data: input }),
    onSuccess: () => { try { playSizzle(); } catch {} },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't fetch recipes"),
  });

  // Merge fresh-scan items with whatever we already know about the user's
  // kitchen from recent fridge + cupboard scans, so recipes blend both.
  function mergeWithRecent(currentItems: string[]) {
    const seen = new Set(currentItems.map((s) => s.toLowerCase()));
    const merged = [...currentItems];
    for (const it of recentInventoryQuery.data?.items ?? []) {
      const k = it.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(it);
      if (merged.length >= 30) break;
    }
    return merged;
  }

  const analyzeMut = useMutation({
    mutationFn: (dataUrl: string) => analyzeFn({ data: { imageDataUrl: dataUrl, storage, restrictions: prefs.map((p) => dietLabel(p)) } }),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
    onSuccess: (result) => {
      const usable = result.items.filter((i) => i.freshness !== "throw-out" && !i.unsafe);
      try { recordScan(result.items.map((i) => i.name)); } catch {}
      if (usable.length === 0) return;
      const sorted = [...usable].sort((a, b) => {
        const la = a.category === "leftover" ? 0 : 1;
        const lb = b.category === "leftover" ? 0 : 1;
        if (la !== lb) return la - lb;
        return (URGENCY_RANK[a.freshness] ?? 9) - (URGENCY_RANK[b.freshness] ?? 9);
      });
      const cuisineLabel = CUISINES.find((c) => c.id === cuisine)?.label ?? cuisine;
      try { recordCuisine(cuisineLabel); } catch {}
      const baseItems = sorted.map((i) => i.name);
      try { rememberStaples(baseItems); } catch {}
      recipesMut.mutate({
        items: mergeWithRecent(baseItems),
        cuisine: cuisineLabel,
        restrictions: prefs.map((p) => dietLabel(p)),
      });
    },
  });

  const saveMut = useMutation({
    mutationFn: () => {
      if (!imageDataUrl || !analysis) throw new Error("Nothing to save");
      // Persist user-corrected items, not the raw model output.
      const itemsToSave = (displayAnalysis?.items ?? analysis.items).map(({ __idx: _idx, ...rest }: any) => rest);
      return saveScanFn({
        data: {
          imageDataUrl,
          items: itemsToSave,
          summary: analysis.summary,
          recipes: recipes?.recipes,
          cuisine: CUISINES.find((c) => c.id === cuisine)?.label ?? cuisine,
        },

      });
    },
    onSuccess: () => {
      toast.success("Scan saved to your history!");
      celebrate();
      myScansQuery.refetch();
      recentInventoryQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't save scan"),
  });

  const cookedMut = useMutation({
    mutationFn: (vars: { recipeTitle: string; savingsCents?: number }) =>
      logCookedFn({ data: { recipeTitle: vars.recipeTitle, estimatedSavingsCents: vars.savingsCents } }),
    onSuccess: (_d, vars) => {
      try { playChaChing(); } catch {}
      try {
        const cuisineLabel = CUISINES.find((c) => c.id === cuisine)?.label ?? cuisine;
        rememberCook(vars.recipeTitle, cuisineLabel);
      } catch {}
      celebrate();
      toast.success(getRandomCompliment(), { description: "Logged to your Memory Kitchen." });
    },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't log meal"),
  });

  const myScansQuery = useQuery({
    queryKey: ["my-scans"],
    queryFn: () => getMyScansFn(),
    enabled: !!user,
  });


  const analysis: AnalyzeResult | undefined = analyzeMut.data;
  const recipes: RecipesResult | undefined = recipesMut.data;

  // Tap-to-confirm / correct on scan items. Edits are keyed by the item's
  // original index in analyzeMut.data.items and reset whenever a new scan
  // arrives so corrections don't leak across scans.
  type ItemEdit = Partial<Pick<AnalyzeResult["items"][number], "name" | "estimatedAge" | "freshness" | "timeLeftLabel">>;
  const [itemEdits, setItemEdits] = useState<Record<number, ItemEdit>>({});
  const [confirmedIdx, setConfirmedIdx] = useState<Record<number, boolean>>({});
  useEffect(() => {
    setItemEdits({});
    setConfirmedIdx({});
  }, [analyzeMut.data]);

  const displayAnalysis = useMemo(() => {
    if (!analysis) return undefined;
    return {
      ...analysis,
      items: analysis.items.map((it, idx) => ({
        ...it,
        ...(itemEdits[idx] ?? {}),
        __idx: idx,
      })),
    };
  }, [analysis, itemEdits]);


  async function handleFile(file: File) {
    // Sign-in required: no guest/anonymous access.
    if (!user) {
      setShowAuthGate(true);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Photo is too large. Please use one under 12MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImageDataUrl(dataUrl);
      analyzeMut.reset();
      recipesMut.reset();
      setPendingReview(true);
    };
    reader.readAsDataURL(file);
  }


  function handleGetRecipes() {
    if (!analysis) return;
    const usable = analysis.items.filter((i) => i.freshness !== "throw-out" && !i.unsafe);
    if (usable.length === 0) {
      toast.error("Nothing usable in the fridge — time for groceries!");
      return;
    }
    // Prioritize: leftovers first, then by priorityRank (lowest timeLeft), then use-soon before fresh.
    const sorted = [...usable].sort((a, b) => {
      const la = a.category === "leftover" ? 0 : 1;
      const lb = b.category === "leftover" ? 0 : 1;
      if (la !== lb) return la - lb;
      const pa = typeof a.priorityRank === "number" ? a.priorityRank : 999;
      const pb = typeof b.priorityRank === "number" ? b.priorityRank : 999;
      if (pa !== pb) return pa - pb;
      return (URGENCY_RANK[a.freshness] ?? 9) - (URGENCY_RANK[b.freshness] ?? 9);
    });
    const keep = sorted.map((i) => i.name);
    const cuisineLabel = CUISINES.find((c) => c.id === cuisine)?.label ?? cuisine;
    const restrictions = prefs.map((p) => dietLabel(p));
    recipesMut.mutate({ items: mergeWithRecent(keep), cuisine: cuisineLabel, restrictions });
  }



  function reset() {
    setImageDataUrl(null);
    setPendingReview(false);
    analyzeMut.reset();
    recipesMut.reset();
    saveMut.reset();
  }

  function confirmPhoto() {
    if (!imageDataUrl) return;
    setPendingReview(false);
    analyzeMut.mutate(imageDataUrl);
  }

  return (
    <div className="min-h-screen bg-background bg-welcome">
      <input
        ref={quickFileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (quickFileRef.current) quickFileRef.current.value = "";
        }}
      />
      <SiteNav />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-2 sm:px-6">

        {!imageDataUrl && (
          <>
            {showIntro ? (
              <>
                <Hero />
                <BenefitCards />
                <SavingsMeter />
                <ActionGrid />
                <WowTourButton />
                <ShowMeWhatThisCanDoButton />

                <PersonalizedWelcome />
                <FoodPersonalityCard />
                <QuickActionTrio />
                <ScanHeroPanel />
                <RescueCenter />
                <div className="mt-4"><MemoryKitchenCard /></div>
                <MeetChefSuperJ />
                <UseItTonightStrip items={recentInventoryQuery.data?.items ?? []} />
                <ChefTipOfTheDay />
                <CuisineWheel />
                <SavingsDashboard />
                <SavingsBragMode />
                <PantryTreasureHunt items={recentInventoryQuery.data?.items ?? []} />
                <BatchKStrip items={recentInventoryQuery.data?.items ?? []} />
                <WeeklyChallenges />
                <FamilyFavorites compact />
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <SharePlateButton />
                </div>
                <QuickActions onAction={handleQuickAction} />
                <GoingBadTile />
                <ChefRescueTile />
                {/* BenefitsBanner moved to top as interactive BenefitCards */}
                <HealthSpecialNeedsStrip />
                <ChefCompanionStrip />
                <KitchenMagicStrip />
                <GrowthHubStrip />
                <FunModeStrip />
                <SavingsHubStrip />
                <SocialHubStrip />
                <SmartInsightsStrip />
                <DailyCoachStrip />
                <LifeModeStrip />
                <FamilyLegacyStrip />
                <DayOfMealsStrip />
                <InviteAndShareStrip />

                <UseAnywhereBanner />
                <FlagshipFeatures />
              </>


            ) : (
              <section className="py-8 md:py-12">
                <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-xs">
                  AI scanner
                </Badge>
                <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
                  Scan your fridge.
                </h1>
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                  Take or upload a fridge, freezer, pantry, or cupboard photo to get inventory results, freshness warnings, and meal ideas.
                </p>
              </section>
            )}
            <div className="mt-10 space-y-4">
              <Card className="ring-paper border-border/60 bg-card p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground">
                  Where is this photo from?
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STORAGE_OPTS.map((s) => {
                    const active = storage === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStorage(s.id)}
                        className={cn(
                          "rounded-lg border p-2.5 text-left text-sm transition-all",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-secondary",
                        )}
                      >
                        <div className="text-xl">{s.emoji}</div>
                        <div className="mt-0.5 font-medium">{s.label}</div>
                      </button>
                    );
                  })}
                </div>
              </Card>
              <PhotoPicker
                onPick={async (file, dataUrl) => {
                  if (!user) {
                    setShowAuthGate(true);
                    return;
                  }
                  setImageDataUrl(dataUrl);
                  analyzeMut.reset();
                  recipesMut.reset();
                  setPendingReview(true);
                }}
                label="Start scanning"
              />


              {/* No Photo Needed — type ingredients instead */}
              <Link
                to="/type-ingredients"
                className="ring-paper group block rounded-xl border border-dashed border-primary/50 bg-secondary/40 p-4 transition-all hover:border-primary hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xl">
                    ⌨️
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg leading-tight">I'll Type My Ingredients</div>
                    <div className="text-xs text-muted-foreground">
                      Don't want to take a picture? Type what you have and we'll still help you make a meal.
                    </div>
                  </div>
                  <span className="shrink-0 text-primary opacity-60 transition-opacity group-hover:opacity-100">→</span>
                </div>
              </Link>
            </div>
            {showAuthGate && (
              <ScanAuthGate message="Sign in to scan your fridge, get AI inventory results, and unlock recipe suggestions." />
            )}

            {user && (
              <>
                <ScanHistory
                  scans={myScansQuery.data?.scans ?? []}
                  loading={myScansQuery.isLoading}
                  onSelect={(scan) => {
                    if (scan.imageUrl) {
                      setImageDataUrl(scan.imageUrl);
                      analyzeMut.reset();
                      recipesMut.reset();
                      saveMut.reset();
                    }
                  }}
                />
              </>
            )}
            <div className="mt-8">
              <DietaryPicker prefs={prefs} onToggle={toggle} onClear={clear} />
            </div>
          </>
        )}

        {imageDataUrl && pendingReview && (
          <section className="mt-6">
            <Card className="ring-paper mx-auto max-w-xl overflow-hidden border-border/60 bg-card p-0">
              <div className="relative aspect-[4/5] w-full bg-muted">
                <img src={imageDataUrl} alt="Photo you just took" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3 p-4">
                <div className="text-center">
                  <h2 className="font-display text-2xl">Does this look right?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Make sure your fridge, freezer, or pantry contents are clearly visible and in focus. Retake if it's blurry, dark, or cut off.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="lg" onClick={reset}>
                    Retake photo
                  </Button>
                  <Button size="lg" onClick={confirmPhoto}>
                    Use this photo
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Tip: hold steady, good light, and open the door so everything is in view.
                </p>
              </div>
            </Card>
          </section>
        )}

        {imageDataUrl && !pendingReview && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <Card className="ring-paper overflow-hidden border-border/60 bg-card p-0">
              <div className="relative aspect-[4/5] w-full bg-muted">
                <img src={imageDataUrl} alt="Your fridge" className="h-full w-full object-cover" />
                {analyzeMut.isPending && (
                  <>
                    <ScanAnimation />
                    <div className="sr-only">
                      <ScanLoadingMessage />
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-secondary/40 p-3">
                <Button variant="ghost" size="sm" onClick={reset}>
                  Try another photo
                </Button>
                {analysis && (
                  <Badge variant="outline" className="border-primary/20 bg-card text-primary">
                    {analysis.items.length} items found
                  </Badge>
                )}
              </div>
            </Card>

            <div className="space-y-6">
              {analysis ? (
                <>
                  {recipes ? (
                    <RecipeResults
                      recipes={recipes}
                      analysis={analysis ?? undefined}
                      onCooked={user ? (title) => cookedMut.mutate({ recipeTitle: title }) : undefined}
                      cookedPending={cookedMut.isPending}
                      blendedFromHistory={
                        (recentInventoryQuery.data?.items?.length ?? 0) > 0 && !!user
                      }
                    />
                  ) : recipesMut.isPending ? (
                    <Card className="ring-paper relative grid place-items-center overflow-hidden border-dashed border-primary/40 bg-primary/5 p-8 text-center">
                      <ScanLines active />
                      <Loader2 className="relative z-10 h-7 w-7 animate-spin text-primary" />
                      <p className="relative z-10 mt-3 font-display text-xl">Chef Super J is plating tonight's menu…</p>
                      <p className="relative z-10 mt-1 max-w-sm text-sm text-muted-foreground">
                        Using what's going bad first so nothing goes to waste.
                      </p>
                    </Card>
                  ) : null}

                  <div className="ring-paper rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-3 text-sm">
                    <span className="font-display text-base text-primary">Chef Super J</span>{" "}
                    found <strong>{analysis.items.length}</strong> usable ingredient{analysis.items.length === 1 ? "" : "s"} and{" "}
                    <strong>{Math.max(6, analysis.items.length * 2)}</strong> meal possibilities.
                  </div>
                  <InventoryPanel
                    analysis={displayAnalysis ?? analysis}
                    confirmed={confirmedIdx}
                    onEditItem={(idx, patch) => {
                      setItemEdits((prev) => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));
                      setConfirmedIdx((prev) => ({ ...prev, [idx]: true }));
                    }}
                    onConfirmItem={(idx) =>
                      setConfirmedIdx((prev) => ({ ...prev, [idx]: !prev[idx] }))
                    }
                    onSubmitFeedback={async ({ original, corrected, note, shareImage }) => {
                      await submitFeedbackFn({
                        data: {
                          original,
                          corrected,
                          storage,
                          note,
                          shareImage,
                          imageDataUrl: shareImage && imageDataUrl ? imageDataUrl : undefined,
                        },
                      });
                      toast.success("Thanks — feedback sent to improve future scans.");
                    }}
                  />



                  <CuisinePicker
                    selected={cuisine}
                    onSelect={setCuisine}
                    onSubmit={handleGetRecipes}
                    loading={recipesMut.isPending}
                    hasRecipes={!!recipes}
                  />
                </>
              ) : analyzeMut.isError ? (
                <Card className="ring-paper border-destructive/40 bg-destructive/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-2xl text-destructive">
                        {(analyzeMut.error as Error)?.message?.startsWith("NO_ITEMS:")
                          ? "No food spotted"
                          : (analyzeMut.error as Error)?.message?.startsWith("CREDITS_EXHAUSTED:")
                            ? "Daily credits used up"
                            : (analyzeMut.error as Error)?.message?.startsWith("RATE_LIMITED:")
                              ? "Too many scans right now"
                              : "Scan failed"}
                      </h2>
                      <p className="mt-1 break-words text-sm text-foreground/90">{getErrorMessage(analyzeMut.error)}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(analyzeMut.error as Error)?.message?.startsWith("CREDITS_EXHAUSTED:") ? (
                          <Button asChild>
                            <Link to="/pro">See Pro plan</Link>
                          </Button>
                        ) : imageDataUrl && !(analyzeMut.error as Error)?.message?.startsWith("NO_ITEMS:") ? (
                          <Button onClick={() => analyzeMut.mutate(imageDataUrl)} disabled={analyzeMut.isPending}>
                            {analyzeMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {errorActionLabel(analyzeMut.error)}
                          </Button>
                        ) : null}
                        <Button variant="outline" onClick={reset}>Choose another photo</Button>
                      </div>
                    </div>
                  </div>
                </Card>

              ) : (
                <Card className="ring-paper grid place-items-center border-dashed border-border/70 bg-card/60 p-10 text-center">
                  <Sparkles className="h-8 w-8 text-accent" />
                  <ScanLoadingMessage className="mt-3 font-display text-xl" />
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Identifying every item, flagging leftovers, and checking what's still good. This usually takes 10–20 seconds.
                  </p>
                </Card>
              )}


              {analysis && (
                <PersonalizedPicks
                  itemNames={analysis.items.map((i) => i.name)}
                  prefs={prefs}
                />
              )}

              {analysis && <TipCard />}


              {analysis && (
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setShareOpen(true)}
                    className="w-full border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Share2 className="mr-2 h-4 w-4" /> Share scan results
                  </Button>

                  {user && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => saveMut.mutate()}
                      disabled={saveMut.isPending}
                      className="w-full border-primary/30 text-primary hover:bg-primary/5"
                    >
                      {saveMut.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                      ) : saveMut.isSuccess ? (
                        <><Bookmark className="mr-2 h-4 w-4" /> Saved! Save again</>
                      ) : (
                        <><Bookmark className="mr-2 h-4 w-4" /> Save this scan</>
                      )}
                    </Button>
                  )}

                  {!user && (
                    <Card className="border-primary/20 bg-primary/5 p-4 text-center text-sm">
                      <span className="text-muted-foreground">Sign in to save scans and build your personal cookbook.</span>
                    </Card>
                  )}
                </div>
              )}

              {analysis && (
                <ShareScanModal
                  imageDataUrl={imageDataUrl}
                  analysis={analysis}
                  recipes={recipes}
                  open={shareOpen}
                  onClose={() => setShareOpen(false)}
                />
              )}
            </div>
          </section>
        )}

        {/* Value section before subscriptions */}
        <ValueSection />

        {/* Subscription section — moved to bottom */}
        <section className="mt-16">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight">Go Pro with Chef Super J</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlock personalized recipes, meal plans, and full voice chat.
            </p>
          </div>
          <div className="mt-4">
            <PlanBanners />
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-10 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="space-y-1">
            <div className="font-display text-lg font-bold text-foreground sm:text-xl">
              The Fridge and Cupboard
            </div>
            <p className="text-sm text-muted-foreground sm:text-base">
              When in doubt, throw it out.
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-base font-medium sm:justify-end">
            <a
              href="https://www.thefridgeandcupboard.com"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              thefridgeandcupboard.com
            </a>
            <a href="/learn" className="text-foreground/80 hover:text-foreground">Learn</a>
            <a href="/meal-plan" className="text-foreground/80 hover:text-foreground">Meal Plan</a>
            <Link to="/pro" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90">
              Go Pro · $5.99/mo
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function TipCard() {
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);
  return (
    <Card className="border-accent/30 bg-accent/5 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">Pro tip</div>
          <p className="mt-1 text-sm text-foreground/90">{tip}</p>
        </div>
      </div>
    </Card>
  );
}

function ScanLoadingMessage({ className }: { className?: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SCAN_LOADING_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);
  return <p className={cn("font-display text-lg", className)}>{SCAN_LOADING_MESSAGES[idx]}</p>;
}


function QuickActionTrio() {
  const items = [
    {
      to: "/rescue",
      emoji: "🔥",
      title: "Rescue Dinner",
      sub: "Fast meal right now.",
      grad: "from-[oklch(0.62_0.22_30)] to-[oklch(0.55_0.24_20)]",
    },
    {
      to: "/before-you-shop",
      emoji: "🛒",
      title: "Before You Shop",
      sub: "See what you can make first.",
      grad: "from-[oklch(0.7_0.18_55)] to-[oklch(0.6_0.2_40)]",
    },
    {
      to: "/rescue",
      emoji: "🥡",
      title: "Use Leftovers",
      sub: "Turn extras into something new.",
      grad: "from-[oklch(0.72_0.17_75)] to-[oklch(0.6_0.2_50)]",
    },
  ] as const;
  return (
    <section className="mt-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {items.map((it) => (
          <Link
            key={it.title}
            to={it.to}
            className={cn(
              "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-left text-white shadow-[0_10px_30px_-12px_oklch(0.45_0.18_40/0.6)] ring-1 ring-white/20 transition active:scale-[0.97] sm:p-4",
              it.grad,
            )}
          >
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/20 blur-2xl" />
            <div className="relative">
              <div className="text-2xl leading-none sm:text-3xl">{it.emoji}</div>
              <div className="mt-1.5 font-display text-[13px] font-bold leading-tight sm:text-base">
                {it.title}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-white/85 sm:text-xs">
                {it.sub}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ScanHeroPanel() {
  function triggerScan() {
    const el = document.getElementById("scan");
    el?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      const fileInput = document.querySelector('input[type=file]') as HTMLInputElement | null;
      fileInput?.click();
    }, 400);
  }
  return (
    <section className="relative mt-5 overflow-hidden rounded-3xl p-5 text-white shadow-[0_24px_60px_-24px_oklch(0.5_0.2_35/0.7)] sm:p-7"
      style={{
        background:
          "radial-gradient(120% 80% at 0% 0%, oklch(0.78 0.18 70 / 0.9), transparent 60%), radial-gradient(120% 80% at 100% 100%, oklch(0.55 0.22 25 / 0.95), transparent 55%), linear-gradient(135deg, oklch(0.62 0.22 40), oklch(0.5 0.22 20))",
      }}
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[oklch(0.92_0.16_85)]/40 blur-3xl" />
      <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-[oklch(0.6_0.22_25)]/50 blur-3xl" />

      <div className="relative">
        <h2 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
        >
          What's in your fridge right now?
        </h2>
        <p className="mt-1.5 text-sm text-white/90 sm:text-base">
          Scan it. Save money. Rescue food. Make dinner.
        </p>

        <button
          type="button"
          onClick={triggerScan}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-base font-extrabold text-[oklch(0.4_0.2_30)] shadow-[0_14px_40px_-14px_rgba(0,0,0,0.55)] ring-2 ring-white/60 transition hover:bg-[oklch(0.98_0.02_85)] active:scale-[0.98] sm:text-lg"
        >
          <span className="text-xl">📸</span> Scan My Fridge
        </button>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Link
            to="/cupboard"
            className="inline-flex flex-col items-center justify-center gap-0.5 rounded-xl bg-white/15 px-2 py-2.5 text-[11px] font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-[0.97] sm:text-xs"
          >
            <span className="text-lg leading-none">📦</span>
            <span>Scan Cupboard</span>
          </Link>
          <Link
            to="/rescue"
            className="inline-flex flex-col items-center justify-center gap-0.5 rounded-xl bg-white/15 px-2 py-2.5 text-[11px] font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-[0.97] sm:text-xs"
          >
            <span className="text-lg leading-none">🥡</span>
            <span>Use Leftovers</span>
          </Link>
          <button
            type="button"
            onClick={triggerScan}
            className="inline-flex flex-col items-center justify-center gap-0.5 rounded-xl bg-white/15 px-2 py-2.5 text-[11px] font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-[0.97] sm:text-xs"
          >
            <span className="text-lg leading-none">⌨️</span>
            <span>Type Ingredients</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function BeforeYouShopCTA() {
  return (
    <section className="mt-6">
      <Link
        to="/before-you-shop"
        className="group relative block overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-[oklch(0.92_0.14_85)] via-[oklch(0.86_0.16_55)] to-[oklch(0.78_0.18_35)] p-5 shadow-[0_20px_60px_-20px_oklch(0.55_0.18_45/0.6)] transition-transform active:scale-[0.99] sm:p-7"
      >
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/95 text-[oklch(0.45_0.18_45)] shadow-lg">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-[oklch(0.25_0.08_45)]">
              Use what you already have
            </div>
            <div className="mt-0.5 font-display text-xl font-semibold text-[oklch(0.2_0.06_45)] sm:text-2xl">
              Before you shop →
            </div>
            <div className="mt-1 text-sm text-[oklch(0.25_0.06_45)]/85">
              Meals you can make tonight · what you already have · what you can skip buying
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[oklch(0.86_0.08_70)]/40 shadow-[0_20px_60px_-30px_oklch(0.45_0.15_45/0.55)]">
      {/* Hero photograph fills the whole card — text overlays it so the fridge stays visible */}
      <div className="relative w-full aspect-[16/10] min-h-[260px] sm:aspect-[16/8] sm:min-h-[240px] md:aspect-[16/7] md:min-h-[280px]">
        <img
          src={heroKitchen}
          alt="A sunlit kitchen counter overflowing with fresh tomatoes, lemons, basil, carrots, peppers, eggs, bread, parmesan, jars of pasta and rice, and a roast chicken on a blue plate"
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        {/* Very subtle bottom wash for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

        {/* Content floats over the fridge */}
        <div className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-6 sm:bottom-6">
          <div className="rounded-2xl bg-black/10 px-4 py-4 ring-1 ring-white/10 backdrop-blur-[2px] sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="outline"
                className="border-white/50 bg-white/20 px-3 py-1.5 text-sm font-bold uppercase tracking-[0.14em] text-[#FFFFF0] shadow-sm"
              >
                <ChefHat className="mr-1.5 h-4 w-4" /> Tonight's dinner, sorted
              </Badge>
            </div>

            <h1
              className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.6)' }}
            >
              Cook smarter with what you already have.
            </h1>
            <p
              className="mt-1 text-[15px] leading-snug text-white sm:text-base"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
            >
              Save money. Waste less. Find meals fast.
            </p>

            {/* Primary action buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("scan");
                  el?.scrollIntoView({ behavior: "smooth" });
                  setTimeout(() => {
                    const fileInput = document.querySelector('input[type=file]') as HTMLInputElement;
                    fileInput?.click();
                  }, 400);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/95 px-3 py-2.5 text-xs font-bold text-stone-800 shadow transition hover:bg-white active:scale-[0.98]"
              >
                <Camera className="h-4 w-4" /> Scan My Fridge
              </button>
              <Link
                to="/cupboard"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/95 px-3 py-2.5 text-xs font-bold text-stone-800 shadow transition hover:bg-white active:scale-[0.98]"
              >
                <Package className="h-4 w-4" /> Scan My Cupboard
              </Link>
              <Link
                to="/rescue"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/95 px-3 py-2.5 text-xs font-bold text-stone-800 shadow transition hover:bg-white active:scale-[0.98]"
              >
                <Soup className="h-4 w-4" /> Use My Leftovers
              </Link>
              <Link
                to="/kitchen-magic"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/95 px-3 py-2.5 text-xs font-bold text-stone-800 shadow transition hover:bg-white active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" /> Surprise Me
              </Link>
              <Link
                to="/health-companion"
                className="col-span-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-xs font-bold text-stone-800 shadow transition hover:bg-white active:scale-[0.98]"
              >
                <Heart className="h-4 w-4" /> Make It Easy For Mom
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeStatsStrip({ className }: { className?: string }) {
  const [stats, setStats] = useState({ money: 0, rescued: 0, meals: 0, expiring: 0 });

  useEffect(() => {
    const refresh = () => {
      const totals = getSavingsTotals();
      const leftovers = getLeftovers();
      const expiring = leftovers.filter((l) => {
        const s = leftoverStatus(l);
        return s.tone === "use" || s.tone === "freeze" || s.tone === "toss";
      }).length;
      setStats({
        money: totals.moneySavedCents,
        rescued: totals.foodRescued,
        meals: totals.mealsCreated,
        expiring,
      });
    };
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("fnc:savings-updated", onStorage as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("fnc:savings-updated", onStorage as EventListener);
    };
  }, []);

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const items = [
    { label: "Money saved", value: formatMoney(stats.money), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Food rescued", value: `${stats.rescued.toFixed(1)} lbs`, icon: Leaf, color: "text-lime-600", bg: "bg-lime-50" },
    { label: "Meals created", value: String(stats.meals), icon: Utensils, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Expiring soon", value: String(stats.expiring), icon: Clock, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <section className={cn("mt-4", className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center rounded-2xl border border-border/60 bg-card p-3 text-center shadow-sm"
          >
            <div className={`grid h-9 w-9 place-items-center rounded-full ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div className="mt-1.5 font-display text-lg font-bold leading-tight">{item.value}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValueSection() {
  return (
    <section className="mt-16">
      <div className="text-center">
        <h2 className="font-display text-[1.8rem] font-bold tracking-tight sm:text-4xl">
          Cook smarter with what you already have.
        </h2>
        <p className="mt-2 text-lg text-foreground/80">
          Save money. Waste less. Find meals fast.
        </p>
      </div>
      <HomeStatsStrip className="mt-6" />
    </section>
  );
}



function QuickActions({ onAction }: { onAction: (storage: StorageOpt) => void }) {
  const actions = [
    {
      id: "fridge" as StorageOpt,
      kind: "scan" as const,
      emoji: "🥬",
      title: "Scan My Fridge",
      tagline: "Tonight's dinner is already in there.",
      desc: "We'll spot what's fresh, flag what to use soon, and turn it into a meal you'll actually want to cook.",
      ring: "ring-[oklch(0.72_0.16_150)]/30",
      bg: "bg-gradient-to-br from-[oklch(0.96_0.06_150)] via-[oklch(0.98_0.03_120)] to-[oklch(0.95_0.07_85)]",
      btn: "bg-[oklch(0.55_0.15_150)] text-white",
      shadow: "shadow-[0_20px_50px_-20px_oklch(0.55_0.15_150/0.5)]",
    },
    {
      id: "pantry" as StorageOpt,
      kind: "scan" as const,
      emoji: "🫙",
      title: "Scan My Cupboard",
      tagline: "Forgotten pasta? Lonely lentils? Let's cook.",
      desc: "Show us your pantry. We'll find the rice, beans, spices and oils — then build dinner around them.",
      ring: "ring-[oklch(0.78_0.17_75)]/30",
      bg: "bg-gradient-to-br from-[oklch(0.97_0.07_75)] via-[oklch(0.98_0.04_60)] to-[oklch(0.95_0.08_45)]",
      btn: "bg-[oklch(0.58_0.17_55)] text-white",
      shadow: "shadow-[0_20px_50px_-20px_oklch(0.58_0.17_55/0.5)]",
    },
    {
      id: "fridge" as StorageOpt,
      kind: "scan" as const,
      emoji: "🍝",
      title: "Use My Leftovers",
      tagline: "Yesterday's roast → tonight's hero dish.",
      desc: "Snap last night's containers. We'll remix them into something fresh, fast, and worth eating again.",
      ring: "ring-[oklch(0.65_0.2_30)]/30",
      bg: "bg-gradient-to-br from-[oklch(0.96_0.06_30)] via-[oklch(0.97_0.04_15)] to-[oklch(0.94_0.08_355)]",
      btn: "bg-[oklch(0.6_0.2_25)] text-white",
      shadow: "shadow-[0_20px_50px_-20px_oklch(0.6_0.2_25/0.5)]",
    },
    {
      id: "fridge" as StorageOpt,
      kind: "link" as const,
      to: "/seniors",
      emoji: "🧓",
      title: "Easy for Seniors",
      tagline: "Soft, simple meals for Mom, Dad & recovery.",
      desc: "Gentle one-pot meals, soft bites, and reheat-friendly ideas — built for caregivers, seniors, and anyone healing.",
      ring: "ring-[oklch(0.7_0.12_260)]/30",
      bg: "bg-gradient-to-br from-[oklch(0.96_0.05_260)] via-[oklch(0.98_0.03_280)] to-[oklch(0.95_0.06_230)]",
      btn: "bg-[oklch(0.5_0.14_260)] text-white",
      shadow: "shadow-[0_20px_50px_-20px_oklch(0.5_0.14_260/0.5)]",
    },
    {
      id: "fridge" as StorageOpt,
      kind: "link" as const,
      to: "/use-it-soon",
      emoji: "⏰",
      title: "Use It Soon",
      tagline: "Cook the things about to turn — first.",
      desc: "Red, orange and yellow urgency labels rank your fridge & cupboard scans so nothing gets wasted.",
      ring: "ring-rose-400/30",
      bg: "bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50",
      btn: "bg-rose-600 text-white",
      shadow: "shadow-[0_20px_50px_-20px_oklch(0.6_0.2_25/0.5)]",
    },
  ];

  return (
    <section className="mt-10 sm:mt-14">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.55_0.15_45)]">
          Pick your starting point
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          What's in your kitchen tonight?
        </h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a, i) => {
          const inner = (
            <>
              <div className="text-5xl drop-shadow-sm">{a.emoji}</div>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-[oklch(0.22_0.05_45)] sm:text-[1.65rem]">
                {a.title}
              </h3>
              <p className="mt-2 text-sm font-semibold text-[oklch(0.4_0.1_45)]">{a.tagline}</p>
              <p className="mt-2 text-sm leading-relaxed text-[oklch(0.35_0.04_45)]">{a.desc}</p>
              <div className={cn(
                "mt-6 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-md transition-transform group-hover:translate-x-1",
                a.btn,
              )}>
                {a.kind === "link" ? "Open" : "Start now"} <ArrowRight className="h-4 w-4" />
              </div>
            </>
          );
          const classes = cn(
            "group relative flex flex-col overflow-hidden rounded-3xl p-7 text-left ring-1 transition-all duration-300 animate-card-pop hover:-translate-y-1",
            a.ring,
            a.bg,
            a.shadow,
            i === 0 ? "animate-card-pop-d1" : i === 1 ? "animate-card-pop-d2" : i === 2 ? "animate-card-pop-d3" : "animate-card-pop-d3",
          );
          return a.kind === "link" ? (
            <Link key={a.title} to={a.to} className={classes}>
              {inner}
            </Link>
          ) : (
            <button key={a.title} onClick={() => onAction(a.id)} className={classes}>
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BenefitsBanner() {
  const benefits = [
    { emoji: "💰", title: "Save money", desc: "Stop buying what you already own." },
    { emoji: "🌱", title: "Waste less food", desc: "Rescue ingredients before they turn." },
    { emoji: "⏱️", title: "Dinner, easier", desc: "From photo to plan in under a minute." },
    { emoji: "👩‍🍳", title: "Chef-built ideas", desc: "Real meals families actually eat." },
  ];
  return (
    <section className="mt-12 rounded-3xl border border-[oklch(0.9_0.04_75)] bg-gradient-to-br from-[oklch(0.98_0.03_75)] via-[oklch(0.99_0.02_85)] to-[oklch(0.97_0.04_55)] p-6 sm:p-8 shadow-[0_10px_40px_-20px_oklch(0.6_0.12_55/0.3)]">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <div key={b.title} className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
              {b.emoji}
            </div>
            <div>
              <div className="font-display text-base font-semibold text-[oklch(0.25_0.05_45)]">{b.title}</div>
              <div className="text-sm text-[oklch(0.42_0.05_45)]">{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UseAnywhereBanner() {
  return (
    <section className="mt-12 rounded-3xl border border-primary/20 bg-gradient-to-br from-[oklch(0.97_0.05_55)] via-[oklch(0.98_0.03_75)] to-[oklch(0.96_0.06_45)] p-6 sm:p-8 shadow-[0_10px_40px_-20px_oklch(0.6_0.15_45/0.35)]">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[oklch(0.22_0.05_45)] sm:text-3xl">
          Use The Fridge & Cupboard Anywhere
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[oklch(0.4_0.05_45)] sm:text-base">
          Your kitchen companion works on every device — no app store required.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-start gap-4 border-border/60 bg-white/70 p-5 backdrop-blur-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold text-foreground">On any computer</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Open{" "}
              <a
                href="https://thefridgeandcupboard.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                TheFridgeAndCupboard.com
              </a>{" "}
              in your browser and start scanning instantly. No downloads, no setup.
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-4 border-border/60 bg-white/70 p-5 backdrop-blur-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-semibold text-foreground">On your phone</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Add to your iPhone or Android home screen for one-tap scanning that feels like a native app. No App Store needed.
            </p>
            <div className="mt-3">
              <InstallAppButton showDiagnostics />
            </div>
          </div>
        </Card>

      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
          <Monitor className="mr-1 h-3 w-3" /> Desktop
        </Badge>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
          <Smartphone className="mr-1 h-3 w-3" /> iPhone
        </Badge>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
          <Smartphone className="mr-1 h-3 w-3" /> Android
        </Badge>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
          <Smartphone className="mr-1 h-3 w-3" /> Add to Phone
        </Badge>
      </div>
    </section>
  );
}

function PreviewRow({ name, tag, tagClass, age }: { name: string; tag: string; tagClass: string; age: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 p-3">
      <div>
        <div className="font-medium text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground">~{age}</div>
      </div>
      <Badge variant="outline" className={cn("border", tagClass)}>
        {tag}
      </Badge>
    </div>
  );
}




type DisplayItem = AnalyzeResult["items"][number] & { __idx: number };
type DisplayAnalysis = Omit<AnalyzeResult, "items"> & { items: DisplayItem[] };

type EditPatch = Partial<Pick<AnalyzeResult["items"][number], "name" | "estimatedAge" | "freshness" | "timeLeftLabel">>;

export type ItemFeedbackPayload = {
  original: { name: string; freshness?: DisplayItem["freshness"]; estimatedAge?: string };
  corrected: { name?: string; freshness?: DisplayItem["freshness"]; estimatedAge?: string; timeLeftLabel?: string };
  note?: string;
  shareImage?: boolean;
};

type InventoryEditProps = {
  confirmed?: Record<number, boolean>;
  onEditItem?: (idx: number, patch: EditPatch) => void;
  onConfirmItem?: (idx: number) => void;
  onSubmitFeedback?: (payload: ItemFeedbackPayload) => Promise<void>;
};


function InventoryPanel({
  analysis,
  confirmed,
  onEditItem,
  onConfirmItem,
  onSubmitFeedback,
}: { analysis: AnalyzeResult | DisplayAnalysis } & InventoryEditProps) {

  // Ensure every item carries a stable __idx so corrections target the right one
  // even after sorting/grouping.
  const itemsWithIdx: DisplayItem[] = (analysis.items as any[]).map((it, i) =>
    typeof (it as any).__idx === "number" ? (it as DisplayItem) : { ...(it as any), __idx: i },
  );

  const sortItems = (arr: DisplayItem[]) =>
    [...arr].sort((a, b) => {
      const pa = typeof a.priorityRank === "number" ? a.priorityRank : 999;
      const pb = typeof b.priorityRank === "number" ? b.priorityRank : 999;
      if (pa !== pb) return pa - pb;
      const da = typeof a.timeLeftMinDays === "number" ? a.timeLeftMinDays : 99;
      const db = typeof b.timeLeftMinDays === "number" ? b.timeLeftMinDays : 99;
      return da - db;
    });

  const tossItems = sortItems(
    itemsWithIdx.filter((i) => i.freshness === "throw-out" || i.freshness === "questionable" || i.unsafe),
  );
  const safe = itemsWithIdx.filter(
    (i) => i.freshness !== "throw-out" && i.freshness !== "questionable" && !i.unsafe,
  );
  const goingBad = sortItems(
    safe.filter((i) => i.freshness === "use-soon" && i.category !== "leftover" && (i.timeLeftMaxDays ?? 99) <= 2),
  );
  const useSoon = sortItems(
    safe.filter((i) => i.freshness === "use-soon" && i.category !== "leftover" && !goingBad.includes(i)),
  );
  const leftovers = sortItems(safe.filter((i) => i.category === "leftover"));
  const goodForLater = sortItems(safe.filter((i) => i.freshness === "fresh" && i.category !== "leftover"));

  const sectionProps = { confirmed, onEditItem, onConfirmItem, onSubmitFeedback };

  return (
    <Card className="ring-paper border-border/60 bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">What's in your fridge</h2>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">AI inventory</span>
      </div>
      {analysis.summary && <p className="mt-1 text-sm text-muted-foreground">{analysis.summary}</p>}
      {(onEditItem || onConfirmItem) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Tap any item to confirm it or correct the name, freshness, or how long it's been stored.
        </p>
      )}

      {analysis.safetyWarnings?.length > 0 && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <div className="mb-1 flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Safety warnings
          </div>
          <ul className="space-y-0.5 text-foreground/90">
            {analysis.safetyWarnings.map((w, i) => <li key={i}>· {w}</li>)}
          </ul>
        </div>
      )}

      <InventorySection
        title="What's going bad first"
        accent="destructive"
        icon={AlertTriangle}
        items={goingBad}
        emptyHint="Nothing about to spoil — nice."
        {...sectionProps}
      />
      <InventorySection title="Use soon" accent="warning" icon={Clock} items={useSoon} {...sectionProps} />
      <InventorySection title="Leftovers" accent="accent" icon={ChefHat} items={leftovers} {...sectionProps} />
      <InventorySection title="Good for later" accent="success" icon={Sparkles} items={goodForLater} {...sectionProps} />
      <InventorySection
        title="Toss / questionable"
        accent="destructive"
        icon={Trash2}
        items={tossItems}
        emptyHint="Nothing to throw out — clean fridge!"
        {...sectionProps}
      />
    </Card>
  );
}

const ACCENT_CLASSES: Record<string, string> = {
  destructive: "text-destructive",
  warning: "text-warning-foreground",
  accent: "text-accent",
  success: "text-success",
};

function InventorySection({
  title,
  icon: Icon,
  items,
  accent,
  emptyHint,
  confirmed,
  onEditItem,
  onConfirmItem,
  onSubmitFeedback,
}: {
  title: string;
  icon: typeof Clock;
  items: DisplayItem[];
  accent: string;
  emptyHint?: string;
} & InventoryEditProps) {
  if (items.length === 0 && !emptyHint) return null;
  return (
    <div className="mt-5">
      <div className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", ACCENT_CLASSES[accent])}>
        <Icon className="h-4 w-4" /> {title} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => (
            <ItemRow
              key={`${title}-${item.__idx}`}
              item={item}
              isConfirmed={!!confirmed?.[item.__idx]}
              onEdit={onEditItem ? (patch) => onEditItem(item.__idx, patch) : undefined}
              onConfirm={onConfirmItem ? () => onConfirmItem(item.__idx) : undefined}
              onSubmitFeedback={onSubmitFeedback}
            />
          ))}

        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  isConfirmed,
  onEdit,
  onConfirm,
  onSubmitFeedback,
}: {
  item: DisplayItem;
  isConfirmed?: boolean;
  onEdit?: (patch: EditPatch) => void;
  onConfirm?: () => void;
  onSubmitFeedback?: (payload: ItemFeedbackPayload) => Promise<void>;
}) {

  const [editing, setEditing] = useState(false);
  const style = freshnessStyles[item.freshness] ?? freshnessStyles.fresh;
  const Icon = style.icon;
  const confidencePct = Math.round(((item.confidence ?? 0)) * 100);
  const editable = !!onEdit;

  const content = (
    <div className="flex w-full items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-3 text-left transition hover:border-primary/40 hover:bg-background">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium text-foreground">{item.name}</span>
          {item.estimatedQuantity && item.estimatedQuantity !== "unknown" && (
            <span className="text-xs text-muted-foreground">· {item.estimatedQuantity}</span>
          )}
          {isConfirmed ? (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success"
              title="You confirmed this item"
            >
              <Check className="h-3 w-3" /> confirmed
            </span>
          ) : confidencePct > 0 ? (
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                confidencePct >= 80
                  ? "bg-success/10 text-success"
                  : confidencePct >= 50
                    ? "bg-warning/15 text-warning-foreground"
                    : "bg-muted text-muted-foreground",
              )}
              title="AI confidence in identification"
            >
              {confidencePct}% sure
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {item.timeLeftLabel || `~${item.estimatedAge}`}
          {item.estimatedAge && item.timeLeftLabel ? ` · stored ~${item.estimatedAge}` : ""}
          {typeof item.timeLeftMaxDays === "number" && item.timeLeftMaxDays > 0
            ? ` · best by ~${new Date(Date.now() + item.timeLeftMaxDays * 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
            : ""}
          {item.notes ? ` · ${item.notes}` : ""}
        </div>

        {item.unsafe && item.unsafeReason && (
          <div className="mt-1 text-xs font-medium text-destructive">⚠ {item.unsafeReason}</div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant="outline" className={cn("gap-1 border", style.className)}>
          <Icon className="h-3 w-3" /> {style.label}
        </Badge>
        {editable && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Pencil className="h-3 w-3" /> tap to edit
          </span>
        )}
      </div>
    </div>
  );

  if (!editable) return content;

  return (
    <>
      <button
        type="button"
        className="block w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${item.name}`}
      >
        {content}
      </button>
      {editing && (
        <ItemEditDialog
          item={item}
          isConfirmed={isConfirmed}
          onClose={() => setEditing(false)}
          onSave={(patch) => {
            onEdit?.(patch);
            setEditing(false);
          }}
          onConfirm={
            onConfirm
              ? () => {
                  onConfirm();
                  setEditing(false);
                }
              : undefined
          }
          onSubmitFeedback={onSubmitFeedback}
        />

      )}
    </>
  );
}

const FRESHNESS_OPTIONS: { value: DisplayItem["freshness"]; label: string }[] = [
  { value: "fresh", label: "Fresh" },
  { value: "use-soon", label: "Use soon" },
  { value: "questionable", label: "Questionable" },
  { value: "throw-out", label: "Throw out" },
];

const STORED_TIME_PRESETS = [
  "just bought",
  "1-2 days",
  "about a week",
  "2+ weeks",
  "months",
  "unclear",
];

function ItemEditDialog({
  item,
  isConfirmed,
  onClose,
  onSave,
  onConfirm,
  onSubmitFeedback,
}: {
  item: DisplayItem;
  isConfirmed?: boolean;
  onClose: () => void;
  onSave: (patch: EditPatch) => void;
  onConfirm?: () => void;
  onSubmitFeedback?: (payload: ItemFeedbackPayload) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [freshness, setFreshness] = useState<DisplayItem["freshness"]>(item.freshness);
  const [estimatedAge, setEstimatedAge] = useState(item.estimatedAge ?? "");
  const [timeLeftLabel, setTimeLeftLabel] = useState(item.timeLeftLabel ?? "");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [shareImage, setShareImage] = useState(false);
  const [reporting, setReporting] = useState(false);

  const buildPatch = (): EditPatch => ({
    name: name.trim() || item.name,
    freshness,
    estimatedAge: estimatedAge.trim(),
    timeLeftLabel: timeLeftLabel.trim(),
  });

  async function handleReport() {
    if (!onSubmitFeedback) return;
    setReporting(true);
    try {
      // Save the correction locally first so the UI reflects it immediately.
      onSave(buildPatch());
      await onSubmitFeedback({
        original: {
          name: item.name,
          freshness: item.freshness,
          estimatedAge: item.estimatedAge ?? "",
        },
        corrected: buildPatch(),
        note: feedbackNote.trim() || undefined,
        shareImage,
      });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send feedback");
    } finally {
      setReporting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm or correct item</DialogTitle>
          <DialogDescription>
            Help the scanner learn — fix the food name, freshness, or how long it's been stored.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-name">Food item</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Roma tomato"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Freshness</Label>
            <Select value={freshness} onValueChange={(v) => setFreshness(v as DisplayItem["freshness"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FRESHNESS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-age">How long has it been stored?</Label>
            <Input
              id="edit-age"
              value={estimatedAge}
              onChange={(e) => setEstimatedAge(e.target.value)}
              placeholder="e.g. about a week"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {STORED_TIME_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setEstimatedAge(p)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition",
                    estimatedAge === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-timeleft">Time left (optional)</Label>
            <Input
              id="edit-timeleft"
              value={timeLeftLabel}
              onChange={(e) => setTimeLeftLabel(e.target.value)}
              placeholder="e.g. 1-2 days left"
            />
          </div>

          {onSubmitFeedback && (
            <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Flag className="h-4 w-4 text-warning-foreground" /> Report a misrecognition
              </div>
              <p className="text-xs text-muted-foreground">
                Send your correction to help future scans. Optionally share the photo so we can improve recognition.
              </p>
              <Textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="What went wrong? (optional)"
                rows={2}
                maxLength={500}
              />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={shareImage}
                  onCheckedChange={(v) => setShareImage(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Share my scan photo so the team can review and improve recognition.
                  Stored privately with this feedback.
                </span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReport}
                disabled={reporting}
                className="gap-1 self-start"
              >
                <Flag className="h-3.5 w-3.5" />
                {reporting ? "Sending…" : "Send feedback"}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {onConfirm && (
            <Button
              type="button"
              variant="outline"
              onClick={onConfirm}
              className="gap-1"
            >
              <Check className="h-4 w-4" /> {isConfirmed ? "Unconfirm" : "Looks right"}
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={() => onSave(buildPatch())}>
              Save correction
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

}




function CuisinePicker({
  selected,
  onSelect,
  onSubmit,
  loading,
  hasRecipes,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onSubmit: () => void;
  loading: boolean;
  hasRecipes?: boolean;
}) {
  return (
    <Card className="ring-paper border-border/60 bg-card p-5">
      <h2 className="font-display text-2xl">
        {hasRecipes ? "Try a different vibe" : "Pick tonight's vibe"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasRecipes
          ? "Tap a cuisine to rebuild the menu from what you already have."
          : "We'll build recipes from what you already have."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CUISINES.map((c) => {
          const active = selected === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "min-h-[64px] rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-secondary",
              )}
            >
              <div className="text-2xl">{c.emoji}</div>
              <div className="mt-1 text-sm font-medium">{c.label}</div>
            </button>
          );
        })}
      </div>
      <Button
        size="lg"
        onClick={onSubmit}
        disabled={loading}
        className="mt-5 h-12 w-full bg-primary uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your menu…</>
        ) : (
          <><ChefHat className="mr-2 h-4 w-4" /> {hasRecipes ? "Rebuild menu" : "Show me recipes"}</>
        )}
      </Button>
    </Card>
  );
}

function RecipeResults({
  recipes,
  analysis,
  onCooked,
  cookedPending,
  blendedFromHistory,
}: {
  recipes: RecipesResult;
  analysis?: AnalyzeResult;
  onCooked?: (title: string) => void;
  cookedPending?: boolean;
  blendedFromHistory?: boolean;
}) {
  const sorted = [...recipes.recipes].sort((a, b) => (b.matchConfidence ?? 0) - (a.matchConfidence ?? 0));

  // Bucket by completion tier (with safe fallback if AI omits the field).
  function tierFor(r: RecipesResult["recipes"][number]): "make-now" | "almost-there" | "quick-store-run" {
    if (r.completion) return r.completion;
    const n = r.alsoNeed?.length ?? 0;
    if (n === 0) return "make-now";
    if (n <= 3) return "almost-there";
    return "quick-store-run";
  }
  const makeNow = sorted.filter((r) => tierFor(r) === "make-now");
  const almostThere = sorted.filter((r) => tierFor(r) === "almost-there");
  const quickStore = sorted.filter((r) => tierFor(r) === "quick-store-run");

  // Cheapest Additions: any recipe needing 1+ ingredient, sorted by added cost
  const cheapest = [...almostThere, ...quickStore]
    .filter((r) => (r.alsoNeed?.length ?? 0) > 0)
    .sort((a, b) => (a.estimatedAddedCost ?? 99) - (b.estimatedAddedCost ?? 99))
    .slice(0, 3);

  const useFirst = analysis
    ? analysis.items
        .filter((i) => !i.unsafe && i.freshness !== "throw-out" && (i.freshness === "use-soon" || i.freshness === "questionable" || i.category === "leftover"))
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          <ChefHat className="h-4 w-4" /> Tonight's menu
        </div>
        <h2 className="mt-1.5 font-display text-3xl tracking-tight">
          {makeNow.length > 0 ? `${makeNow.length} meal${makeNow.length === 1 ? "" : "s"} you can make right now` : "You're 95% of the way to dinner"}
        </h2>
        {blendedFromHistory && (
          <p className="mt-2 text-xs text-primary/80">
            <Sparkles className="mr-1 inline h-3 w-3" /> Blended with your recent fridge &amp; cupboard scans.
          </p>
        )}
        {useFirst.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-destructive/90">
              <AlertTriangle className="mr-1 inline h-3 w-3" /> Use these first
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {useFirst.map((i, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-xs font-medium text-destructive"
                >
                  {i.name}
                  {i.timeLeftLabel && <span className="text-destructive/70">· {i.timeLeftLabel}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {makeNow.length > 0 && (
        <RecipeSection
          title="Make right now"
          subtitle="Everything you need is already in your kitchen. $0 to cook."
          accent="success"
          recipes={makeNow}
          onCooked={onCooked}
          cookedPending={cookedPending}
        />
      )}

      {almostThere.length > 0 && (
        <RecipeSection
          title="Almost there"
          subtitle="You're 95% of the way — just 1-3 cheap ingredients away."
          accent="accent"
          recipes={almostThere}
          onCooked={onCooked}
          cookedPending={cookedPending}
        />
      )}

      {cheapest.length > 0 && (
        <RecipeSection
          title="Cheapest additions"
          subtitle="Smallest grocery bill to a finished meal."
          accent="primary"
          recipes={cheapest}
          onCooked={onCooked}
          cookedPending={cookedPending}
        />
      )}

      {quickStore.length > 0 && (
        <RecipeSection
          title="Quick store run"
          subtitle="One short stop and you're cooking."
          accent="accent"
          recipes={quickStore}
          onCooked={onCooked}
          cookedPending={cookedPending}
        />
      )}
    </div>
  );
}


function RecipeSection({
  title,
  subtitle,
  accent,
  recipes,
  onCooked,
  cookedPending,
}: {
  title: string;
  subtitle: string;
  accent: "success" | "accent" | "primary";
  recipes: RecipesResult["recipes"];
  onCooked?: (title: string) => void;
  cookedPending?: boolean;
}) {

  const headerClass = accent === "success" ? "text-success" : accent === "primary" ? "text-primary" : "text-accent";
  const [cookingIdx, setCookingIdx] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <div>
        <div className={cn("text-xs font-bold uppercase tracking-[0.18em]", headerClass)}>{title}</div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-4">
        {recipes.map((r, i) => (
          <Card key={i} className="ring-paper overflow-hidden border-border/60 bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-xl">{r.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {typeof r.matchConfidence === "number" && r.matchConfidence >= 0.75 && (
                  <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                    <Sparkles className="mr-1 h-3 w-3" /> {Math.round(r.matchConfidence * 100)}% match
                  </Badge>
                )}
                <Badge variant="outline" className="border-primary/20 bg-secondary text-secondary-foreground">
                  <Clock className="mr-1 h-3 w-3" /> {r.timeMinutes}m
                </Badge>
                <Badge variant="outline" className="border-primary/20 bg-secondary text-secondary-foreground capitalize">
                  {r.difficulty}
                </Badge>
                <SaveButton
                  category="recipes"
                  title={r.title}
                  subtitle={r.description}
                  ingredients={r.usesFromFridge}
                  variant="icon"
                />
              </div>
            </div>


            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-success">From your fridge</div>
                <ul className="mt-1.5 space-y-0.5 text-sm">
                  {r.usesFromFridge.map((x, j) => <li key={j}>· {x}</li>)}
                </ul>
              </div>
              <div className={cn(
                "rounded-lg border p-3",
                r.alsoNeed.length === 0
                  ? "border-success/30 bg-success/5"
                  : "border-accent/30 bg-accent/5",
              )}>
                <div className={cn(
                  "flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide",
                  r.alsoNeed.length === 0 ? "text-success" : "text-accent",
                )}>
                  <span>{r.alsoNeed.length === 0 ? "You're set" : `Missing · ${r.alsoNeed.length}`}</span>
                  {r.alsoNeed.length > 0 && typeof r.estimatedAddedCost === "number" && r.estimatedAddedCost > 0 && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] tracking-normal text-accent">
                      ~${r.estimatedAddedCost.toFixed(r.estimatedAddedCost < 10 ? 2 : 0)}
                    </span>
                  )}
                </div>
                {r.shortAdditionNote && r.alsoNeed.length > 0 && (
                  <div className="mt-1 text-sm font-medium text-accent">{r.shortAdditionNote}</div>
                )}
                <ul className="mt-1.5 space-y-0.5 text-sm">
                  {r.alsoNeed.length > 0
                    ? r.alsoNeed.map((x, j) => <li key={j}>· {x}</li>)
                    : <li className="text-muted-foreground">Nothing — start cooking!</li>}
                </ul>
              </div>
            </div>

            <ol className="mt-4 space-y-1.5 text-sm text-foreground/90">
              {r.steps.map((s, j) => (
                <li key={j} className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {j + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>

            {r.chefTip && (
              <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
                <span className="font-semibold text-accent">Chef Super J tip · </span>
                <span className="text-foreground/90">{r.chefTip}</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setCookingIdx(i)} className="flex-1 font-semibold">
                <Play className="mr-2 h-4 w-4" /> Start cooking — guide me step by step
              </Button>
              <ShareMenu
                label="Share this meal"
                title="Share this meal"
                subject={`Try this meal: ${r.title}`}
                text={buildMealShareMessage({
                  title: r.title,
                  description: r.description,
                  timeMinutes: r.timeMinutes,
                  uses: r.usesFromFridge,
                })}
              />
            </div>

            {onCooked && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="text-sm">
                  <div className="font-semibold">Made this tonight?</div>
                  <div className="text-xs text-muted-foreground">Log it to track money saved &amp; food rescued.</div>
                </div>
                <Button size="sm" disabled={cookedPending} onClick={() => onCooked(r.title)}>
                  {cookedPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  I cooked this
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      {cookingIdx !== null && recipes[cookingIdx] && (
        <CookingMode
          open
          onClose={() => setCookingIdx(null)}
          title={recipes[cookingIdx].title}
          subtitle={recipes[cookingIdx].description}
          steps={recipes[cookingIdx].steps}
        />
      )}
    </div>
  );
}


function ScanHistory({
  scans,
  loading,
  onSelect,
}: {
  scans: Array<{
    id: string;
    imageUrl: string | null;
    summary: string | null;
    items: any;
    cuisine: string | null;
    created_at: string;
  }>;
  loading: boolean;
  onSelect: (scan: any) => void;
}) {
  if (loading) {
    return (
      <section className="mt-12">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl">My Scans</h2>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 w-32 shrink-0 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (scans.length === 0) {
    return (
      <section className="mt-12">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl">My Scans</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No saved scans yet. Snap your fridge and save the results!
        </p>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h2 className="font-display text-2xl">My Scans</h2>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {scans.map((scan) => (
          <button
            key={scan.id}
            onClick={() => onSelect(scan)}
            className="group shrink-0 text-left"
          >
            <div className="relative h-40 w-32 overflow-hidden rounded-xl border border-border/60 bg-muted">
              {scan.imageUrl ? (
                <img
                  src={scan.imageUrl}
                  alt="Fridge scan"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground">
                  <Refrigerator className="h-8 w-8" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <div className="text-[10px] text-white/90">
                  {new Date(scan.created_at).toLocaleDateString()}
                </div>
                <div className="truncate text-xs font-medium text-white">
                  {scan.items.length} items
                </div>
              </div>
            </div>
            {scan.cuisine && (
              <div className="mt-1.5 text-xs text-muted-foreground">{scan.cuisine}</div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

function GoingBadTile() {
  return (
    <section className="mt-10">
      <Link
        to="/going-bad"
        className="group relative block overflow-hidden rounded-3xl border border-destructive/30 bg-gradient-to-br from-[oklch(0.97_0.07_30)] via-[oklch(0.98_0.05_50)] to-[oklch(0.96_0.08_70)] p-6 shadow-[0_20px_60px_-25px_oklch(0.6_0.18_30/0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-25px_oklch(0.6_0.18_30/0.55)] sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
              <AlertTriangle className="h-3 w-3" /> Rescue mission
            </div>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight text-[oklch(0.22_0.05_45)] sm:text-4xl">
              What's going bad first
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[oklch(0.35_0.04_45)] sm:text-base">
              We watch your saved scans for items about to spoil, then Chef Super J turns them into
              tonight's meal. Save money, waste less, eat better.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform group-hover:translate-x-1">
              See what to use first <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <div className="hidden shrink-0 rounded-2xl bg-white/70 p-4 text-5xl shadow-sm backdrop-blur sm:block">
            ⏳
          </div>
        </div>
      </Link>
    </section>
  );
}

function ChefRescueTile() {
  return (
    <section className="mt-6">
      <Link
        to="/chef-rescue"
        className="group relative block overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-[oklch(0.96_0.08_320)] via-[oklch(0.97_0.07_290)] to-[oklch(0.96_0.09_260)] p-6 shadow-[0_20px_60px_-25px_oklch(0.55_0.2_300/0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-25px_oklch(0.55_0.2_300/0.55)] sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="h-3 w-3" /> Chef Rescue · NEW
            </div>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight text-[oklch(0.22_0.05_300)] sm:text-4xl">
              Broke? Kids hungry? Surprise me?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[oklch(0.35_0.04_300)] sm:text-base">
              Tell Chef Super J your situation. He pulls from your scans and gives you real
              meals you can cook right now — no shopping required.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition-transform group-hover:translate-x-1">
              Open Chef Rescue <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <div className="hidden shrink-0 rounded-2xl bg-white/70 p-4 text-5xl shadow-sm backdrop-blur sm:block">
            🧑‍🍳
          </div>
        </div>
      </Link>
    </section>
  );
}
