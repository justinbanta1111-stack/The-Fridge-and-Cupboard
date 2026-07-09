import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  HelpCircle,
  Baby,
  Cookie,
  Shuffle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { funMode, type FunMeal } from "@/lib/fun-mode.functions";
import { getFunnyMode } from "@/lib/funny-chef";
import { FunnyChefToggle } from "@/components/FunnyChefToggle";
import { cn } from "@/lib/utils";

const UNCOMMON = ["capers", "anchovies", "artichokes", "miso", "tahini", "harissa", "fish sauce", "coconut milk", "olives", "kimchi"];

const CRAVINGS = [
  "sweet", "salty", "spicy", "crunchy", "soft", "cold", "warm",
  "Mexican", "Italian", "Asian", "comfort", "healthy", "soup", "high protein", "breakfast",
];

const REMIX_FLAVORS = ["BBQ", "Mexican", "Italian", "Asian", "Cajun", "Teriyaki", "Garlic herb", "Curry", "Mediterranean"];

const KID_TYPES: { id: "dinner" | "hidden-veggie" | "lunch" | "snack" | "breakfast"; label: string }[] = [
  { id: "dinner", label: "Kid dinners" },
  { id: "hidden-veggie", label: "Hidden veggies" },
  { id: "lunch", label: "Easy lunches" },
  { id: "snack", label: "Fast snacks" },
  { id: "breakfast", label: "Breakfast" },
];

export const Route = createFileRoute("/fun-mode")({
  head: () => ({
    meta: [
      { title: "Fun & Creative Mode — Surprise Me, Remix, Kid Saver" },
      { name: "description", content: "3-Ways, Mystery Ingredient, Kid Saver, Craving Picker, Leftover Remix, and Surprise Me — fun ways to use what you already have." },
      { property: "og:title", content: "Fun & Creative Mode — The Fridge and Cupboard" },
      { property: "og:description", content: "Playful AI modes that turn ingredients into 3 fresh ideas." },
    ],
  }),
  component: FunModePage,
});

function FunModePage() {
  const [raw, setRaw] = useState("eggs, spinach, cheddar, leftover chicken, rice, tomato, onion, garlic, milk, bread, capers");
  const [expiringRaw, setExpiringRaw] = useState("spinach, tomato");
  const [leftoversRaw, setLeftoversRaw] = useState("leftover chicken, rice");

  const have = useMemo(() => parseList(raw), [raw]);
  const expiring = useMemo(() => parseList(expiringRaw), [expiringRaw]);
  const leftovers = useMemo(() => parseList(leftoversRaw), [leftoversRaw]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Home
      </Link>
      <header className="mt-2">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Fun & Creative Mode</h1>
        <p className="text-sm text-muted-foreground">Playful ways to spark a meal from what you already have.</p>
      </header>

      <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">What you have</h2>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-2xl border border-border bg-background p-2 text-sm"
          placeholder="eggs, rice, spinach…"
        />
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs">
            <span className="font-semibold">Expiring soon</span>
            <input value={expiringRaw} onChange={(e) => setExpiringRaw(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-1.5 text-sm" />
          </label>
          <label className="text-xs">
            <span className="font-semibold">Leftovers</span>
            <input value={leftoversRaw} onChange={(e) => setLeftoversRaw(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-1.5 text-sm" />
          </label>
        </div>
        <div className="mt-3"><FunnyChefToggle /></div>
      </section>

      <ThreeWaysSection have={have} expiring={expiring} leftovers={leftovers} />
      <MysterySection have={have} expiring={expiring} leftovers={leftovers} />
      <KidSaverSection have={have} expiring={expiring} leftovers={leftovers} />
      <CravingSection have={have} expiring={expiring} leftovers={leftovers} />
      <RemixSection have={have} expiring={expiring} leftovers={leftovers} />
      <SurpriseSection have={have} expiring={expiring} leftovers={leftovers} />
    </main>
  );
}

type Ctx = { have: string[]; expiring: string[]; leftovers: string[] };

type FunArgs = {
  mode: "three-ways" | "mystery" | "kid-saver" | "craving" | "leftover-remix" | "surprise";
  item?: string;
  haveIngredients: string[];
  expiring: string[];
  leftovers: string[];
  craving?: string;
  flavor?: string;
  kidType?: "dinner" | "hidden-veggie" | "lunch" | "snack" | "breakfast";
  funny: boolean;
};

function useFun() {
  const fn = useServerFn(funMode);
  return useMutation({
    mutationFn: (vars: FunArgs) => fn({ data: vars } as any),
  });
}

function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MealCards({ meals }: { meals: FunMeal[] }) {
  if (!meals.length) return null;
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
      {meals.map((m, i) => (
        <Card key={i} className="p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{m.title}</h3>
            <Badge variant="secondary" className="text-[10px]">{m.time_minutes}m</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{m.why}</p>
          <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs">
            {m.steps.map((s, j) => <li key={j}>{s}</li>)}
          </ol>
          {m.missing.length > 0 && (
            <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">Missing: {m.missing.join(", ")}</p>
          )}
          <p className="mt-2 text-[11px] italic text-muted-foreground">{m.encouragement}</p>
        </Card>
      ))}
    </div>
  );
}

function ThreeWaysSection({ have, expiring, leftovers }: Ctx) {
  const [item, setItem] = useState("");
  const mut = useFun();
  const go = (i: string) => {
    setItem(i);
    mut.mutate({ mode: "three-ways", item: i, haveIngredients: have, expiring, leftovers, funny: getFunnyMode() });
  };
  return (
    <SectionCard icon={<Wand2 className="h-4 w-4" />} title="Give me 3 ways to use this" subtitle="Pick an ingredient, leftover, or pantry item.">
      <div className="flex flex-wrap gap-1.5">
        {[...leftovers, ...expiring, ...have].slice(0, 12).map((i) => (
          <button key={i} onClick={() => go(i)} className={cn("rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent", item === i && "bg-primary/10 border-primary")}>
            {i}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="or type one…" className="flex-1 rounded-xl border border-border bg-background p-2 text-sm" />
        <Button size="sm" onClick={() => item && go(item)} disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
        </Button>
      </div>
      {mut.data && <MealCards meals={mut.data.meals} />}
    </SectionCard>
  );
}

function MysterySection({ have, expiring, leftovers }: Ctx) {
  const mut = useFun();
  const found = useMemo(() => {
    const set = new Set(have.map((s) => s.toLowerCase()));
    return UNCOMMON.filter((u) => set.has(u));
  }, [have]);
  const pool = found.length ? found : UNCOMMON.slice(0, 6);
  return (
    <SectionCard icon={<HelpCircle className="h-4 w-4" />} title="Mystery Ingredient Challenge" subtitle={found.length ? "We spotted something fun in your kitchen!" : "Try an uncommon ingredient."}>
      <div className="flex flex-wrap gap-1.5">
        {pool.map((u) => (
          <button key={u} onClick={() => mut.mutate({ mode: "mystery", item: u, haveIngredients: have, expiring, leftovers, funny: getFunnyMode() })} className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent">
            Want to use {u}?
          </button>
        ))}
      </div>
      {mut.isPending && <Loader2 className="mt-3 h-4 w-4 animate-spin" />}
      {mut.data && <MealCards meals={mut.data.meals} />}
    </SectionCard>
  );
}

function KidSaverSection({ have, expiring, leftovers }: Ctx) {
  const mut = useFun();
  return (
    <SectionCard icon={<Baby className="h-4 w-4" />} title="Help me feed picky kids" subtitle="Mild, fun, easy.">
      <div className="flex flex-wrap gap-1.5">
        {KID_TYPES.map((k) => (
          <button key={k.id} onClick={() => mut.mutate({ mode: "kid-saver", kidType: k.id, haveIngredients: have, expiring, leftovers, funny: getFunnyMode() })} className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent">
            {k.label}
          </button>
        ))}
      </div>
      {mut.isPending && <Loader2 className="mt-3 h-4 w-4 animate-spin" />}
      {mut.data && <MealCards meals={mut.data.meals} />}
    </SectionCard>
  );
}

function CravingSection({ have, expiring, leftovers }: Ctx) {
  const mut = useFun();
  return (
    <SectionCard icon={<Cookie className="h-4 w-4" />} title="What sounds good?" subtitle="Pick a craving — we'll build it from what you have.">
      <div className="flex flex-wrap gap-1.5">
        {CRAVINGS.map((c) => (
          <button key={c} onClick={() => mut.mutate({ mode: "craving", craving: c, haveIngredients: have, expiring, leftovers, funny: getFunnyMode() })} className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize hover:bg-accent">
            {c}
          </button>
        ))}
      </div>
      {mut.isPending && <Loader2 className="mt-3 h-4 w-4 animate-spin" />}
      {mut.data && <MealCards meals={mut.data.meals} />}
    </SectionCard>
  );
}

function RemixSection({ have, expiring, leftovers }: Ctx) {
  const [item, setItem] = useState(leftovers[0] ?? "");
  const mut = useFun();
  return (
    <SectionCard icon={<Sparkles className="h-4 w-4" />} title="Make this taste different" subtitle="Remix a leftover with a new flavor profile.">
      <div className="flex flex-wrap gap-1.5">
        {(leftovers.length ? leftovers : have).slice(0, 8).map((i) => (
          <button key={i} onClick={() => setItem(i)} className={cn("rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent", item === i && "bg-primary/10 border-primary")}>
            {i}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REMIX_FLAVORS.map((f) => (
          <button key={f} onClick={() => item && mut.mutate({ mode: "leftover-remix", item, flavor: f, haveIngredients: have, expiring, leftovers, funny: getFunnyMode() })} className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10">
            {f}
          </button>
        ))}
      </div>
      {mut.isPending && <Loader2 className="mt-3 h-4 w-4 animate-spin" />}
      {mut.data && <MealCards meals={mut.data.meals} />}
    </SectionCard>
  );
}

function SurpriseSection({ have, expiring, leftovers }: Ctx) {
  const mut = useFun();
  return (
    <SectionCard icon={<Shuffle className="h-4 w-4" />} title="Surprise Me" subtitle="A random fun meal from what you've got.">
      <Button onClick={() => mut.mutate({ mode: "surprise", haveIngredients: have, expiring, leftovers, funny: getFunnyMode() })} disabled={mut.isPending}>
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shuffle className="mr-2 h-4 w-4" />Surprise Me</>}
      </Button>
      {mut.data && <MealCards meals={mut.data.meals} />}
    </SectionCard>
  );
}

function parseList(s: string): string[] {
  return s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
}
