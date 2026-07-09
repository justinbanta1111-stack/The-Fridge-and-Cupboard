import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Coffee, Wine, Droplets, Leaf, Dumbbell, HeartPulse, Sparkles, GlassWater } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteNav } from "@/components/SiteNav";
import { MobileTabBar } from "@/components/MobileTabBar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drinks")({
  head: () => ({
    meta: [
      { title: "Drinks, Wellness & Performance — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Turn what you already have into teas, coffees, infused waters, smoothies, mocktails, workout drinks, and cocktail pairings.",
      },
      { property: "og:title", content: "Drinks, Wellness & Performance" },
      {
        property: "og:description",
        content: "Drink ideas built from your fridge & cupboard — tea, coffee, hydration, workout, healthy and cocktails.",
      },
    ],
  }),
  component: DrinksPage,
});

type FilterId = "all" | "tea" | "coffee" | "fruit-water" | "refreshing" | "healthy" | "workout" | "alcohol";

const FILTERS: { id: FilterId; label: string; icon: typeof Coffee }[] = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "tea", label: "Tea", icon: Leaf },
  { id: "coffee", label: "Coffee", icon: Coffee },
  { id: "fruit-water", label: "Fruit Water", icon: Droplets },
  { id: "refreshing", label: "Refreshing", icon: GlassWater },
  { id: "healthy", label: "Healthy", icon: HeartPulse },
  { id: "workout", label: "Workout", icon: Dumbbell },
  { id: "alcohol", label: "Alcohol", icon: Wine },
];

type Drink = {
  title: string;
  blurb: string;
  uses: string[];
  filter: Exclude<FilterId, "all">;
  premium?: boolean;
};

const CATEGORIES: { id: Exclude<FilterId, "all">; title: string; icon: typeof Coffee; accent: string; items: Drink[] }[] = [
  {
    id: "tea",
    title: "Teas",
    icon: Leaf,
    accent: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    items: [
      { title: "Herbal calming tea", blurb: "Chamomile, mint, honey — wind-down ritual.", uses: ["mint", "chamomile", "honey"], filter: "tea" },
      { title: "Relaxation blend", blurb: "Lavender + lemon balm steep for sleep.", uses: ["lavender", "lemon"], filter: "tea" },
      { title: "Energy green tea", blurb: "Green tea, lemon, ginger — clean lift.", uses: ["green tea", "lemon", "ginger"], filter: "tea" },
      { title: "Digestive ginger tea", blurb: "Ginger + lemon + honey after meals.", uses: ["ginger", "lemon", "honey"], filter: "tea" },
      { title: "Immune support tea", blurb: "Turmeric, ginger, honey, black pepper.", uses: ["turmeric", "ginger", "honey"], filter: "tea", premium: true },
    ],
  },
  {
    id: "coffee",
    title: "Coffee",
    icon: Coffee,
    accent: "from-amber-700/15 to-amber-700/5 border-amber-700/30",
    items: [
      { title: "Classic hot coffee", blurb: "Brew + cinnamon + a splash of milk.", uses: ["coffee", "cinnamon", "milk"], filter: "coffee" },
      { title: "Cold brew", blurb: "12hr steep, smooth low-acid finish.", uses: ["coffee"], filter: "coffee" },
      { title: "Protein coffee", blurb: "Shake espresso + protein + ice.", uses: ["coffee", "protein powder", "milk"], filter: "coffee" },
      { title: "Healthy add-ins", blurb: "Cinnamon, cacao, oat milk, collagen.", uses: ["cinnamon", "cacao"], filter: "coffee" },
      { title: "Flavor pairings", blurb: "Vanilla, hazelnut, cardamom, orange peel.", uses: ["vanilla", "orange"], filter: "coffee" },
    ],
  },
  {
    id: "fruit-water",
    title: "Fruit Infused Water",
    icon: Droplets,
    accent: "from-sky-500/15 to-sky-500/5 border-sky-500/30",
    items: [
      { title: "Lemon water", blurb: "Lemon + mint — morning reset.", uses: ["lemon", "mint"], filter: "fruit-water" },
      { title: "Cucumber water", blurb: "Cucumber + lime — pure refresh.", uses: ["cucumber", "lime"], filter: "fruit-water" },
      { title: "Berry water", blurb: "Crushed berries + basil for aroma.", uses: ["berries", "basil"], filter: "fruit-water" },
      { title: "Citrus blend", blurb: "Lemon, lime, orange — triple citrus.", uses: ["lemon", "lime", "orange"], filter: "fruit-water" },
      { title: "Detox water", blurb: "Cucumber, lemon, ginger, mint.", uses: ["cucumber", "lemon", "ginger", "mint"], filter: "fruit-water" },
    ],
  },
  {
    id: "refreshing",
    title: "Refreshing Drinks",
    icon: GlassWater,
    accent: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30",
    items: [
      { title: "Berry banana smoothie", blurb: "Frozen berries, banana, yogurt.", uses: ["berries", "banana", "yogurt"], filter: "refreshing" },
      { title: "Virgin mojito", blurb: "Lime, mint, sparkling water, a touch of honey.", uses: ["lime", "mint", "honey"], filter: "refreshing" },
      { title: "Homemade electrolyte", blurb: "Water + lemon + salt + honey.", uses: ["lemon", "honey"], filter: "refreshing" },
      { title: "Summer cooler", blurb: "Watermelon, lime, basil — slushy chill.", uses: ["watermelon", "lime", "basil"], filter: "refreshing" },
      { title: "Coconut hydrator", blurb: "Coconut water, lime, pinch of salt.", uses: ["coconut water", "lime"], filter: "refreshing" },
    ],
  },
  {
    id: "healthy",
    title: "Healthy Drinks",
    icon: HeartPulse,
    accent: "from-lime-500/15 to-lime-500/5 border-lime-500/30",
    items: [
      { title: "Anti-inflammatory tonic", blurb: "Turmeric, ginger, lemon, black pepper.", uses: ["turmeric", "ginger", "lemon"], filter: "healthy", premium: true },
      { title: "Green smoothie", blurb: "Spinach, banana, apple, ginger.", uses: ["spinach", "banana", "apple"], filter: "healthy" },
      { title: "Protein shake", blurb: "Protein, banana, milk, peanut butter.", uses: ["protein powder", "banana", "milk"], filter: "healthy" },
      { title: "Digestive kefir blend", blurb: "Kefir, berries, chia, honey.", uses: ["kefir", "berries", "honey"], filter: "healthy" },
      { title: "Low-sugar berry fizz", blurb: "Berries, sparkling water, lime.", uses: ["berries", "lime"], filter: "healthy" },
    ],
  },
  {
    id: "workout",
    title: "Fitness / Workout Drinks",
    icon: Dumbbell,
    accent: "from-orange-500/15 to-orange-500/5 border-orange-500/30",
    items: [
      { title: "Pre-workout smoothie", blurb: "Oats, banana, coffee, honey — clean fuel.", uses: ["oats", "banana", "coffee"], filter: "workout", premium: true },
      { title: "Post-workout recovery shake", blurb: "Protein, banana, berries, milk.", uses: ["protein powder", "banana", "berries"], filter: "workout", premium: true },
      { title: "Protein meal pairing", blurb: "Eggs + toast paired with protein coffee.", uses: ["eggs", "coffee"], filter: "workout" },
      { title: "Energy support", blurb: "Dates, almond butter, sea salt, water.", uses: ["dates", "almond butter"], filter: "workout" },
      { title: "Hydration recipe", blurb: "Coconut water + lemon + chia.", uses: ["coconut water", "lemon"], filter: "workout" },
    ],
  },
  {
    id: "alcohol",
    title: "Alcohol Drinks",
    icon: Wine,
    accent: "from-fuchsia-500/15 to-fuchsia-500/5 border-fuchsia-500/30",
    items: [
      { title: "Fridge cocktail", blurb: "Whatever citrus + spirit you have, on ice.", uses: ["lemon", "lime"], filter: "alcohol" },
      { title: "Wine pairing", blurb: "Match wine to tonight's meal — red, white, rosé.", uses: ["wine"], filter: "alcohol" },
      { title: "Beer pairing", blurb: "Pilsner, IPA, stout — by dish.", uses: ["beer"], filter: "alcohol" },
      { title: "Holiday drink", blurb: "Mulled wine, hot toddy, eggnog ideas.", uses: ["wine", "honey", "cinnamon"], filter: "alcohol" },
      { title: "Cooking with alcohol", blurb: "Deglaze, braise, marinate — flavor boosts.", uses: ["wine", "beer"], filter: "alcohol" },
    ],
  },
];

function DrinksPage() {
  const [filter, setFilter] = useState<FilterId>("all");
  const visible = useMemo(() => (filter === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === filter)), [filter]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <header className="mb-5">
          <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
            <GlassWater className="mr-1 h-3 w-3" /> Drinks, Wellness & Performance
          </Badge>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            Drink ideas from what you already have.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Scan your fridge or cupboard — we'll match teas, coffees, infused waters, smoothies, workout drinks, and cocktails.
            Get the <span className="font-semibold text-foreground">"Best drink with this meal"</span> pairing on every recipe.
          </p>
        </header>

        <section className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {f.label}
              </button>
            );
          })}
        </section>

        <Card className="mb-5 border-primary/30 bg-primary/5 p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">Pair with a meal</div>
          <div className="mt-1 text-sm">
            Cooked something from a <Link to="/rescue" className="font-semibold text-primary underline">leftovers rescue</Link> or a{" "}
            <Link to="/scan" className="font-semibold text-primary underline">fridge scan</Link>? Tap a drink below — Chef Super J
            will suggest the best match.
          </div>
        </Card>

        <div className="space-y-6">
          {visible.map((cat) => {
            const Icon = cat.icon;
            return (
              <section key={cat.id}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl">{cat.title}</h2>
                </div>
                <div className={cn("rounded-2xl border bg-gradient-to-br p-3 sm:p-4", cat.accent)}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {cat.items.map((d) => (
                      <div key={d.title} className="rounded-xl border border-border/60 bg-background/80 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold leading-tight">{d.title}</div>
                          {d.premium && (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 text-[10px] uppercase tracking-widest">
                              <Sparkles className="mr-1 h-3 w-3" /> Premium
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{d.blurb}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {d.uses.map((u) => (
                            <span key={u} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <Card className="mt-8 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <div className="font-display text-lg">Unlock wellness & performance drinks</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Premium adds advanced wellness drinks, workout nutrition pairing, pH-balanced options, and anti-inflammatory recommendations.
              </p>
              <Button asChild className="mt-3">
                <Link to="/pro">See plans — from $3.99</Link>
              </Button>
            </div>
          </div>
        </Card>
      </main>
      <MobileTabBar />
    </div>
  );
}
