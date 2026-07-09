import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Snowflake, Flame, Wind, FlaskConical, Sparkles, ShieldCheck, AlertTriangle, Clock, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteNav } from "@/components/SiteNav";
import { MobileTabBar } from "@/components/MobileTabBar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/preserve")({
  head: () => ({
    meta: [
      { title: "Preserve It — Canning, Freezing, Drying & Fermenting" },
      {
        name: "description",
        content:
          "Save food before it spoils. Smart canning, freezing, dehydrating, and fermenting suggestions based on what's in your kitchen.",
      },
      { property: "og:title", content: "Preserve It — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Don't toss it — preserve it. Canning, freezing, dehydrating, fermenting, with shelf-life and safety guidance.",
      },
    ],
  }),
  component: PreservePage,
});

type MethodId = "all" | "canning" | "freezing" | "dehydrating" | "fermenting";

const METHODS: { id: MethodId; label: string; icon: typeof Flame }[] = [
  { id: "all", label: "All", icon: Archive },
  { id: "canning", label: "Canning", icon: Flame },
  { id: "freezing", label: "Freezing", icon: Snowflake },
  { id: "dehydrating", label: "Dehydrating", icon: Wind },
  { id: "fermenting", label: "Fermenting", icon: FlaskConical },
];

type Technique = { title: string; blurb: string; works: string[]; shelfLife: string; method: Exclude<MethodId, "all">; premium?: boolean };

const CATEGORIES: { id: Exclude<MethodId, "all">; title: string; icon: typeof Flame; accent: string; items: Technique[] }[] = [
  {
    id: "canning",
    title: "Canning",
    icon: Flame,
    accent: "from-rose-500/15 to-rose-500/5 border-rose-500/30",
    items: [
      { title: "Water bath canning", blurb: "High-acid foods: tomatoes, fruit, pickles.", works: ["tomatoes", "berries", "apples"], shelfLife: "12–18 months", method: "canning" },
      { title: "Pressure canning", blurb: "Low-acid foods: meat, broth, vegetables.", works: ["meat", "broth", "green beans"], shelfLife: "12 months", method: "canning", premium: true },
      { title: "Pickling", blurb: "Vinegar brine, crunchy in days.", works: ["cucumbers", "peppers", "onions"], shelfLife: "6+ months refrigerated", method: "canning" },
      { title: "Jam making", blurb: "Fruit + sugar + pectin = breakfast gold.", works: ["berries", "apples", "peaches"], shelfLife: "12 months", method: "canning" },
      { title: "Jelly making", blurb: "Clear, strained, set with pectin.", works: ["berries", "grapes"], shelfLife: "12 months", method: "canning" },
      { title: "Salsa", blurb: "Tomato, pepper, onion — water bath safe.", works: ["tomatoes", "peppers", "onions"], shelfLife: "12 months", method: "canning" },
      { title: "Sauces", blurb: "Tomato sauce, apple butter, ketchup.", works: ["tomatoes", "apples"], shelfLife: "12 months", method: "canning", premium: true },
    ],
  },
  {
    id: "freezing",
    title: "Freezing",
    icon: Snowflake,
    accent: "from-sky-500/15 to-sky-500/5 border-sky-500/30",
    items: [
      { title: "Freezer meal prep", blurb: "Batch cook, portion, freeze flat.", works: ["soup", "chili", "casseroles"], shelfLife: "3 months", method: "freezing" },
      { title: "Freeze leftovers", blurb: "Label & date, eat within 90 days.", works: ["cooked rice", "stews", "pasta sauce"], shelfLife: "2–3 months", method: "freezing" },
      { title: "Freeze herbs", blurb: "Chop into ice cube trays with olive oil.", works: ["basil", "parsley", "cilantro"], shelfLife: "6 months", method: "freezing" },
      { title: "Freeze fruit", blurb: "Flash-freeze on a tray, then bag.", works: ["berries", "bananas", "peaches"], shelfLife: "8–12 months", method: "freezing" },
      { title: "Freeze vegetables", blurb: "Blanch first for color & texture.", works: ["broccoli", "green beans", "corn"], shelfLife: "10–12 months", method: "freezing" },
    ],
  },
  {
    id: "dehydrating",
    title: "Dehydrating",
    icon: Wind,
    accent: "from-amber-500/15 to-amber-500/5 border-amber-500/30",
    items: [
      { title: "Fruit drying", blurb: "Apples, mangoes, banana chips.", works: ["apples", "bananas", "mangoes"], shelfLife: "6–12 months", method: "dehydrating" },
      { title: "Herb drying", blurb: "Hang or low-temp dry, store in jars.", works: ["basil", "oregano", "thyme"], shelfLife: "12 months", method: "dehydrating" },
      { title: "Jerky", blurb: "Lean meat, marinated, dried low & slow.", works: ["beef", "turkey"], shelfLife: "1–2 months", method: "dehydrating", premium: true },
      { title: "Vegetable chips", blurb: "Kale, zucchini, sweet potato.", works: ["kale", "zucchini", "sweet potato"], shelfLife: "2–3 months", method: "dehydrating" },
    ],
  },
  {
    id: "fermenting",
    title: "Fermenting",
    icon: FlaskConical,
    accent: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    items: [
      { title: "Pickles", blurb: "Salt brine + time = tangy crunch.", works: ["cucumbers"], shelfLife: "4–6 months refrigerated", method: "fermenting" },
      { title: "Sauerkraut", blurb: "Cabbage + salt — 1–4 weeks at room temp.", works: ["cabbage"], shelfLife: "6+ months refrigerated", method: "fermenting" },
      { title: "Kimchi", blurb: "Napa cabbage, chili, ginger, garlic.", works: ["cabbage", "chili", "ginger"], shelfLife: "6 months refrigerated", method: "fermenting", premium: true },
      { title: "Fermented vegetables", blurb: "Carrots, radishes, peppers in brine.", works: ["carrots", "radishes", "peppers"], shelfLife: "3–6 months refrigerated", method: "fermenting" },
    ],
  },
];

const SMART_ALERTS = [
  "You have enough tomatoes to can salsa.",
  "These berries can be frozen or turned into jam.",
  "Lots of cucumbers? Pickle or ferment within 3 days.",
  "Herbs wilting? Freeze in olive oil cubes tonight.",
  "Apples piling up? Try apple butter or dried chips.",
];

function PreservePage() {
  const [method, setMethod] = useState<MethodId>("all");
  const visible = useMemo(() => (method === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === method)), [method]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <header className="mb-5">
          <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
            <Archive className="mr-1 h-3 w-3" /> Preserve It
          </Badge>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            Save it before it spoils.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Got more produce, herbs, or meat than you can eat this week? Pick a method — canning, freezing, dehydrating, or fermenting —
            with shelf-life guidance and food-safety reminders built in.
          </p>
        </header>

        <Card className="mb-5 border-primary/30 bg-primary/5 p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">Smart alerts from your scans</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {SMART_ALERTS.map((a) => (
              <li key={a} className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/scan">Scan fridge</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/cupboard">Scan cupboard</Link>
            </Button>
          </div>
        </Card>

        <section className="mb-4 flex flex-wrap gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            );
          })}
        </section>

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
                    {cat.items.map((t) => (
                      <div key={t.title} className="rounded-xl border border-border/60 bg-background/80 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold leading-tight">{t.title}</div>
                          {t.premium && (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 text-[10px] uppercase tracking-widest">
                              <Sparkles className="mr-1 h-3 w-3" /> Premium
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{t.blurb}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {t.works.map((w) => (
                            <span key={w} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {w}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> Shelf life: {t.shelfLife}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <Card className="mt-8 border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
            <div>
              <div className="font-display text-lg">Food safety basics</div>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>• Water-bath canning: process jars at a full rolling boil for the recipe's full time.</li>
                <li>• Pressure can low-acid foods (meat, broth, plain vegetables) — boiling alone is not safe.</li>
                <li>• Freezer: keep at 0°F / -18°C. Label every container with date and contents.</li>
                <li>• Ferments: use non-iodized salt, keep submerged, discard if mold appears on top.</li>
                <li>• When in doubt, throw it out. Bulging lids and off smells = compost, not dinner.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="mt-4 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <div className="font-display text-lg">Premium preservation tools</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Unlock advanced canning recipes, batch calculators (how many jars from X lbs?), preservation planning, and storage-timeline reminders.
              </p>
              <Button asChild className="mt-3">
                <Link to="/pro">See plans — from $3.99</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="mt-4 border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-600" />
            <p className="text-xs text-muted-foreground">
              Preservation tips are educational. Always follow tested recipes (USDA, Ball, or your country's equivalent) for canning,
              especially low-acid foods. The Fridge and Cupboard isn't a substitute for a food-safety manual.
            </p>
          </div>
        </Card>
      </main>
      <MobileTabBar />
    </div>
  );
}
