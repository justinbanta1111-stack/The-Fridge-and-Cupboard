import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Keyboard, ChefHat, Loader2, Sparkles, Clock, ArrowLeft, Camera, AlertTriangle, Soup, PackageOpen, Snowflake } from "lucide-react";
import { suggestRecipes } from "@/lib/fridge.functions";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/type-ingredients")({
  head: () => ({
    meta: [
      { title: "Type Your Ingredients — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "No photo needed. Type what you already have and Chef Super J will turn it into quick, budget-friendly, kid-friendly, or special-diet meals you can cook tonight.",
      },
      { property: "og:title", content: "No Photo Needed — Type Your Ingredients" },
      {
        property: "og:description",
        content:
          "Don't want to take a picture? Type what you have and we'll still help you make a meal.",
      },
    ],
  }),
  component: TypeIngredientsPage,
});

type Mode = "default" | "quick" | "budget" | "kids" | "lenten" | "health";

const MODE_LABELS: Record<Mode, { label: string; cuisine: string; restrictions?: string[]; mode?: "default" | "lenten" | "fasting" | "holiday"; hint: string }> = {
  default:  { label: "Any meal",          cuisine: "any comfort cooking",                                                                          hint: "Mix of easy meal ideas using what you typed." },
  quick:    { label: "Quick (under 20m)", cuisine: "fast weeknight meals under 20 minutes",                                                        hint: "Fastest options first." },
  budget:   { label: "Budget-friendly",   cuisine: "cheap, budget-friendly home cooking using pantry basics",                                      hint: "Keep it cheap." },
  kids:     { label: "Kid-friendly",      cuisine: "kid-friendly family meals with mild flavors and familiar shapes",                              hint: "Picky-eater friendly." },
  lenten:   { label: "Vegan / Lent",      cuisine: "plant-based Lenten-friendly meals",                                            mode: "lenten", hint: "No meat, dairy, or eggs." },
  health:   { label: "Elderly / health",  cuisine: "gentle, soft-textured, easy-to-chew meals supportive for elderly, cancer recovery, and brain health (omega-3, antioxidants, hydration)", hint: "Soft, nourishing, gentle on digestion." },
};

function parseItems(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 80)
    .slice(0, 40);
}

// Items the user explicitly flagged "Use First" jump to the top and are
// labelled so the model treats them as the priority — waste reduction first.
function applyUseFirst(items: string[], useFirst: Set<string>): string[] {
  const first: string[] = [];
  const rest: string[] = [];
  for (const it of items) {
    const isLeftover = /leftover|left over|day-old|reheat/i.test(it);
    if (useFirst.has(it) || isLeftover) {
      first.push(`USE FIRST: ${it.replace(/^USE FIRST:\s*/i, "")}`);
    } else {
      rest.push(it);
    }
  }
  return [...first, ...rest];
}

const QUICK_TAGS: { id: string; label: string; icon: typeof AlertTriangle; hint: string }[] = [
  { id: "expiring",   label: "Expiring soon", icon: AlertTriangle, hint: "About to go bad" },
  { id: "leftover",   label: "Leftover",      icon: Soup,          hint: "Already cooked" },
  { id: "opened",     label: "Opened",        icon: PackageOpen,   hint: "Jar/package open" },
  { id: "perishable", label: "Perishable",    icon: Snowflake,     hint: "Dairy, meat, produce" },
];

function TypeIngredientsPage() {
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<Mode>("default");
  const [useFirst, setUseFirst] = useState<Set<string>>(new Set());
  const suggest = useServerFn(suggestRecipes);
  const navigate = useNavigate();

  const parsed = parseItems(raw);

  // Drop stale priorities when the underlying text changes.
  const cleanUseFirst = useMemo(() => {
    const set = new Set<string>();
    for (const it of parsed) if (useFirst.has(it)) set.add(it);
    return set;
  }, [useFirst, parsed]);

  const toggleUseFirst = (it: string) => {
    setUseFirst((prev) => {
      const next = new Set(prev);
      if (next.has(it)) next.delete(it); else next.add(it);
      return next;
    });
  };

  const tagAll = (matcher: (s: string) => boolean) => {
    setUseFirst((prev) => {
      const next = new Set(prev);
      for (const it of parsed) if (matcher(it)) next.add(it);
      return next;
    });
  };

  const mut = useMutation({
    mutationFn: async () => {
      const items = applyUseFirst(parsed, cleanUseFirst);
      if (items.length === 0) throw new Error("Please type at least one ingredient.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to get meal ideas.");
        navigate({ to: "/auth" });
        throw new Error("Sign in required");
      }
      const cfg = MODE_LABELS[mode];
      const priorityNote = cleanUseFirst.size > 0
        ? " Build the meal around the items marked USE FIRST so nothing goes to waste."
        : "";
      return suggest({
        data: {
          items,
          cuisine: cfg.cuisine + priorityNote,
          restrictions: cfg.restrictions,
          mode: cfg.mode ?? "default",
        },
      });
    },
    onError: (e: Error) => toast.error(e.message ?? "Couldn't think of a meal. Try again."),
  });

  const recipes = mut.data?.recipes ?? [];

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <header className="mt-4">
          <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]">
            No photo needed
          </Badge>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            I'll type my ingredients.
          </h1>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            Don't want to take a picture? Type what you have and we'll still help you make a meal.
          </p>
        </header>

        <Card className="mt-6 border-border/60 bg-card p-4">
          <label htmlFor="ingredients" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            What do you have? (comma or new line)
          </label>
          <Textarea
            id="ingredients"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={`chicken, rice, broccoli\neggs, cheese, tortillas\nleftover turkey, potatoes, carrots`}
            rows={6}
            className="mt-2 min-h-[140px] text-base"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />

          {parsed.length > 0 && (
            <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">What needs to be used first?</div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Tap the items that are expiring, leftover, opened, or perishable. Chef Super J will build the meal around them so nothing goes to waste.
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (t.id === "leftover") tagAll((s) => /leftover|left over|day-old|reheat/i.test(s));
                        else if (t.id === "perishable") tagAll((s) => /milk|yogurt|yoghurt|cream|cheese|chicken|beef|pork|fish|salmon|shrimp|spinach|lettuce|berries|tomato|herb|cilantro|basil|egg/i.test(s));
                        else if (t.id === "opened") tagAll((s) => /open(ed)?|jar|leftover/i.test(s));
                        else if (t.id === "expiring") tagAll(() => true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs hover:border-primary/50"
                      title={t.hint}
                    >
                      <Icon className="h-3 w-3" /> Mark all {t.label.toLowerCase()}
                    </button>
                  );
                })}
                {cleanUseFirst.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseFirst(new Set())}
                    className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {parsed.map((it) => {
                  const active = cleanUseFirst.has(it);
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => toggleUseFirst(it)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border/60 bg-background/60 hover:border-primary/40"
                      }`}
                    >
                      {active && <span className="mr-1">★</span>}
                      {it}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                {cleanUseFirst.size === 0
                  ? "Nothing prioritized yet — tap an item above."
                  : `${cleanUseFirst.size} item${cleanUseFirst.size === 1 ? "" : "s"} marked Use First.`}
              </p>
            </div>
          )}



          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Meal style</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(MODE_LABELS) as Mode[]).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background/60 hover:border-primary/40"
                    }`}
                  >
                    {MODE_LABELS[m].label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{MODE_LABELS[mode].hint}</p>
          </div>

          <Button
            size="lg"
            className="mt-5 w-full text-base"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || raw.trim().length === 0}
          >
            {mut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chef Super J is thinking…</>
            ) : (
              <><ChefHat className="mr-2 h-5 w-5" /> Make me a meal</>
            )}
          </Button>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Keyboard className="h-3.5 w-3.5" /> Typing works on iPhone &amp; Android.</span>
            <Link to="/scan" className="inline-flex items-center gap-1 text-primary hover:underline">
              <Camera className="h-3.5 w-3.5" /> Prefer the camera?
            </Link>
          </div>
        </Card>

        {recipes.length > 0 && (
          <section className="mt-8 space-y-4">
            <h2 className="font-display text-2xl">Meals from what you typed</h2>
            {recipes.map((r, i) => (
              <Card key={i} className="border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl">{r.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    <Clock className="mr-1 h-3 w-3" /> {r.timeMinutes}m
                  </Badge>
                </div>

                {r.usesFromFridge?.length > 0 && (
                  <div className="mt-3 text-sm">
                    <span className="font-semibold">Uses: </span>
                    <span className="text-muted-foreground">{r.usesFromFridge.join(", ")}</span>
                  </div>
                )}

                {r.alsoNeed?.length > 0 && (
                  <div className="mt-1 text-sm">
                    <span className="font-semibold">Also need: </span>
                    <span className="text-muted-foreground">{r.alsoNeed.join(", ")}</span>
                  </div>
                )}

                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                  {r.steps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>

                {r.chefTip && (
                  <p className="mt-3 rounded-md bg-secondary/50 p-2 text-xs text-foreground/90">
                    <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                    <span className="font-semibold">Chef tip:</span> {r.chefTip}
                  </p>
                )}
              </Card>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
