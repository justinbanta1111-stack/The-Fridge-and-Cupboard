import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Loader2,
  ChefHat,
  Wallet,
  Baby,
  ListChecks,
  Wand2,
  ArrowRight,
  Clock,
  Lightbulb,
  Play,
} from "lucide-react";
import { CookingMode } from "@/components/CookingMode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/SiteNav";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ScanAuthGate } from "@/components/ScanAuthGate";
import { DietaryPicker } from "@/components/DietaryPicker";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { rescueCook } from "@/lib/fridge.functions";
import { getRescueDashboard } from "@/lib/scans.functions";
import { supabase } from "@/integrations/supabase/client";
import { speak } from "@/lib/voice-assistant";
import { playSizzle } from "@/lib/sound-effects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chef-rescue")({
  head: () => ({
    meta: [
      { title: "Chef Rescue — Emergency Meals from What You Have" },
      {
        name: "description",
        content:
          "Broke? Feeding kids in 10 minutes? Only have eggs and rice? Tell Chef Super J your situation and get real meals from what's already in your kitchen.",
      },
      { property: "og:title", content: "Chef Rescue Mode" },
      {
        property: "og:description",
        content:
          "Emergency cooking with what you already have. Surprise me, feed my kids fast, or 'I'm broke' — Chef Super J has you.",
      },
    ],
  }),
  component: ChefRescuePage,
});

type Scenario = "broke" | "kids-fast" | "only-these" | "surprise" | "custom";
type RescueResult = Awaited<ReturnType<typeof rescueCook>>;

const SCENARIOS: Array<{
  id: Scenario;
  title: string;
  blurb: string;
  icon: typeof Wallet;
  accent: string;
}> = [
  {
    id: "broke",
    title: "I'm broke",
    blurb: "Zero extra spend. Stretch what you've got.",
    icon: Wallet,
    accent: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
  },
  {
    id: "kids-fast",
    title: "Feed my kids fast",
    blurb: "Kid-friendly. Under 15 minutes. Tiny steps.",
    icon: Baby,
    accent: "from-amber-500/15 to-amber-500/5 border-amber-500/30",
  },
  {
    id: "only-these",
    title: "I only have…",
    blurb: "Type just what you have. Chef works strict.",
    icon: ListChecks,
    accent: "from-sky-500/15 to-sky-500/5 border-sky-500/30",
  },
  {
    id: "surprise",
    title: "Surprise me",
    blurb: "Something fun & unexpected from your stash.",
    icon: Wand2,
    accent: "from-fuchsia-500/15 to-fuchsia-500/5 border-fuchsia-500/30",
  },
];

function playSparkle() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // Three quick ascending bell tones
    [880, 1318.5, 1760].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.08);
      o.stop(now + i * 0.08 + 0.4);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // ignore
  }
}

function ChefRescuePage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSignedIn(!!s?.user),
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const dietary = useDietaryPrefs();
  const restrictions = useMemo(() => dietary.prefs.map((p) => String(p)), [dietary.prefs]);
  const dashboardFn = useServerFn(getRescueDashboard);
  const dashboard = useQuery({
    queryKey: ["rescue-dashboard"],
    queryFn: () => dashboardFn(),
    enabled: signedIn === true,
    staleTime: 60_000,
  });

  const inventory = useMemo(
    () => dashboard.data?.topPriorityIngredients ?? [],
    [dashboard.data],
  );

  const [scenario, setScenario] = useState<Scenario>("surprise");
  const [onlyText, setOnlyText] = useState("");
  const [customText, setCustomText] = useState("");
  const [servings, setServings] = useState<string>("");
  const [result, setResult] = useState<RescueResult | null>(null);
  const [cookingIndex, setCookingIndex] = useState<number | null>(null);

  const rescueFn = useServerFn(rescueCook);
  const cook = useMutation({
    mutationFn: async (vars: {
      scenario: Scenario;
      items: string[];
      customRequest?: string;
    }) =>
      rescueFn({
        data: {
          scenario: vars.scenario,
          items: vars.items,
          customRequest: vars.customRequest,
          restrictions,
          servings: servings ? Math.max(1, Math.min(12, Number(servings) || 0)) : undefined,
        },
      }),
    onSuccess: (data) => {
      setResult(data);
      playSparkle();
      try { playSizzle(); } catch {}
      if (data?.headline) {
        speak(data.headline);
      }
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Chef Super J got stuck — try again in a moment.");
    },
  });

  function handleScenarioCook(id: Scenario) {
    setScenario(id);
    setResult(null);

    if (id === "only-these") {
      const items = onlyText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!items.length) {
        toast.message("Type the ingredients you have, then tap Cook.");
        return;
      }
      cook.mutate({ scenario: id, items });
      return;
    }

    if (id === "custom") {
      if (!customText.trim()) {
        toast.message("Tell Chef Super J what you need.");
        return;
      }
      cook.mutate({
        scenario: id,
        items: inventory,
        customRequest: customText.trim(),
      });
      return;
    }

    cook.mutate({ scenario: id, items: inventory });
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <header className="mb-6">
          <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
            <Sparkles className="mr-1 h-3 w-3" /> Chef Rescue
          </Badge>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            Emergency cooking, with what you already have.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Pick your situation. Chef Super J pulls from your latest scans and gives you
            real meals you can cook right now.
          </p>
        </header>

        {signedIn === false && (
          <ScanAuthGate message="Sign in to use Chef Rescue — it pulls from your saved fridge & cupboard scans." />
        )}

        {signedIn !== false && (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SCENARIOS.map((s) => {
                const Icon = s.icon;
                const active = scenario === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScenario(s.id)}
                    className={cn(
                      "rounded-2xl border bg-gradient-to-br p-4 text-left transition-all",
                      s.accent,
                      active
                        ? "ring-2 ring-primary scale-[1.01]"
                        : "hover:-translate-y-0.5",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-background/60 p-2 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{s.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {s.blurb}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>

            <Card className="mt-5 space-y-4 p-4">
              {scenario === "only-these" && (
                <div>
                  <label className="text-sm font-medium">
                    What do you actually have? (comma or new line)
                  </label>
                  <Textarea
                    value={onlyText}
                    onChange={(e) => setOnlyText(e.target.value)}
                    placeholder="eggs, rice, soy sauce, scallions"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}

              {(scenario === "custom" || scenario === "surprise") && (
                <div>
                  <label className="text-sm font-medium">
                    Optional: tell Chef anything specific
                  </label>
                  <Input
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="One pan, comfort food, no oven, hate cilantro…"
                    className="mt-1"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[110px]">
                  <label className="text-xs font-medium text-muted-foreground">
                    Servings
                  </label>
                  <Input
                    value={servings}
                    onChange={(e) => setServings(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="auto"
                    inputMode="numeric"
                    className="mt-1 h-9 w-24"
                  />
                </div>
                <div className="flex-1">
                  <DietaryPicker prefs={dietary.prefs} onToggle={dietary.toggle} onClear={dietary.clear} compact />
                </div>
              </div>

              {scenario !== "only-these" && inventory.length > 0 && (
                <div className="rounded-xl bg-muted/40 p-3 text-xs">
                  <div className="mb-1 font-semibold uppercase tracking-widest text-muted-foreground">
                    Pulling from your kitchen
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {inventory.slice(0, 10).map((n) => (
                      <span
                        key={n}
                        className="rounded-full bg-background px-2 py-0.5 text-[11px]"
                      >
                        {n}
                      </span>
                    ))}
                    {inventory.length > 10 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{inventory.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {scenario !== "only-these" && inventory.length === 0 && (
                <div className="rounded-xl border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                  No scans yet — Chef can still help, but you'll get better meals after a{" "}
                  <Link to="/scan" className="font-semibold text-primary underline">
                    quick fridge scan
                  </Link>
                  .
                </div>
              )}

              <Button
                size="lg"
                onClick={() => handleScenarioCook(scenario)}
                disabled={cook.isPending}
                className="w-full text-base font-semibold"
              >
                {cook.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chef is thinking…
                  </>
                ) : scenario === "surprise" ? (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Surprise Me
                  </>
                ) : (
                  <>
                    <ChefHat className="mr-2 h-4 w-4" /> Cook with what I have
                  </>
                )}
              </Button>
            </Card>

            {result && (
              <section className="mt-6 space-y-4">
                <Card className="border-primary/30 bg-primary/5 p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">
                    Chef Super J says
                  </div>
                  <div className="mt-1 font-display text-xl leading-snug">
                    {result.headline}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.encouragement}
                  </p>
                </Card>

                {result.recipes.map((r, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display text-lg leading-tight">{r.title}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">{r.hook}</div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" /> {r.timeMinutes}m
                        </Badge>
                        <Badge variant="secondary">
                          {r.estimatedCost > 0 ? `+$${r.estimatedCost.toFixed(2)}` : "Free"}
                        </Badge>
                        <Badge variant="outline">{r.feeds}</Badge>
                      </div>
                    </div>

                    {r.usesFromFridge.length > 0 && (
                      <div className="mt-3 text-xs">
                        <span className="font-semibold">Uses:</span>{" "}
                        <span className="text-muted-foreground">
                          {r.usesFromFridge.join(", ")}
                        </span>
                      </div>
                    )}
                    {r.alsoNeed.length > 0 && (
                      <div className="mt-1 text-xs">
                        <span className="font-semibold">Also grab:</span>{" "}
                        <span className="text-muted-foreground">
                          {r.alsoNeed.join(", ")}
                        </span>
                      </div>
                    )}

                    <ol className="mt-3 space-y-1.5 text-sm">
                      {r.steps.map((s, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>

                    {r.chefTip && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span>
                          <span className="font-semibold">Chef tip:</span> {r.chefTip}
                        </span>
                      </div>
                    )}

                    <div className="mt-3">
                      <Button
                        onClick={() => setCookingIndex(i)}
                        className="w-full font-semibold"
                      >
                        <Play className="mr-2 h-4 w-4" /> Start cooking — guide me step by step
                      </Button>
                    </div>
                  </Card>
                ))}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => handleScenarioCook("surprise")}
                    disabled={cook.isPending}
                  >
                    <Wand2 className="mr-2 h-4 w-4" /> Surprise me again
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/before-you-shop">
                      Plan a small shop <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <MobileTabBar />
      {result && cookingIndex !== null && result.recipes[cookingIndex] && (
        <CookingMode
          open
          onClose={() => setCookingIndex(null)}
          title={result.recipes[cookingIndex].title}
          subtitle={result.recipes[cookingIndex].hook}
          steps={result.recipes[cookingIndex].steps}
        />
      )}
    </div>
  );
}
