import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FridgeFortune, estimateFortune } from "@/components/FridgeFortune";
import { FridgeHealthScore, type FridgeHealthItem } from "@/components/FridgeHealthScore";
import { DinnerRescue } from "@/components/DinnerRescue";
import { TasteMatch } from "@/components/TasteMatch";
import { FunnyChefToggle } from "@/components/FunnyChefToggle";

export const Route = createFileRoute("/kitchen-magic")({
  head: () => ({
    meta: [
      { title: "Kitchen Magic — Fast meals from what you have" },
      { name: "description", content: "Fridge Fortune, Dinner Rescue, Taste Match, Fridge Health Score, and Funny Chef Mode — all built on what's already in your kitchen." },
      { property: "og:title", content: "Kitchen Magic — The Fridge and Cupboard" },
      { property: "og:description", content: "Turn what you already have into fast, fitting meals." },
    ],
  }),
  component: KitchenMagicPage,
});

function KitchenMagicPage() {
  const [raw, setRaw] = useState("eggs, spinach, cheddar, leftover chicken, rice, tomato, onion, garlic, milk, bread");
  const [expiringRaw, setExpiringRaw] = useState("spinach, tomato");
  const [leftoversRaw, setLeftoversRaw] = useState("leftover chicken, rice");

  const have = useMemo(() => parseList(raw), [raw]);
  const expiring = useMemo(() => parseList(expiringRaw), [expiringRaw]);
  const leftovers = useMemo(() => parseList(leftoversRaw), [leftoversRaw]);

  const fortune = useMemo(() => estimateFortune(have), [have]);
  const healthItems: FridgeHealthItem[] = useMemo(() => {
    const set = new Set(have.map((s) => s.toLowerCase()));
    const exp = new Set(expiring.map((s) => s.toLowerCase()));
    const lf = new Set(leftovers.map((s) => s.toLowerCase()));
    return Array.from(set).map((name) => {
      const cat = guessCategory(name);
      const freshness: FridgeHealthItem["freshness"] = exp.has(name) ? "use-soon" : "fresh";
      return { name, category: cat, freshness, ageDays: lf.has(name) ? 2 : 0 };
    });
  }, [have, expiring, leftovers]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Home
      </Link>
      <header className="mt-2">
        <h1 className="text-2xl font-bold">Kitchen Magic</h1>
        <p className="text-sm text-muted-foreground">Fast, fitting meals from what's already in your kitchen.</p>
      </header>

      <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">What you have</h2>
        <p className="text-xs text-muted-foreground">Comma-separated. Or scan your fridge/cupboard first and paste the list.</p>
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
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FridgeFortune stats={fortune} />
        <FridgeHealthScore items={healthItems} />
      </div>

      <div className="mt-4">
        <FunnyChefToggle />
      </div>

      <div className="mt-4">
        <DinnerRescue haveIngredients={have} expiring={expiring} leftovers={leftovers} />
      </div>

      <div className="mt-4">
        <TasteMatch haveIngredients={have} expiring={expiring} leftovers={leftovers} />
      </div>
    </main>
  );
}

function parseList(s: string): string[] {
  return s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
}

function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/(chicken|beef|pork|turkey|sausage|bacon|ham)/.test(n)) return "meat";
  if (/(fish|salmon|tuna|shrimp|cod)/.test(n)) return "seafood";
  if (/(milk|cheese|cheddar|yogurt|butter|cream)/.test(n)) return "dairy";
  if (/egg/.test(n)) return "egg";
  if (/(bean|lentil|chickpea)/.test(n)) return "legume";
  if (/tofu/.test(n)) return "tofu";
  if (/(leftover|cooked )/.test(n)) return "leftover";
  if (/(apple|banana|berry|grape|orange|lemon|lime|pear|melon)/.test(n)) return "fruit";
  if (/(spinach|kale|lettuce|tomato|onion|garlic|pepper|carrot|broccoli|cucumber|potato|zucchini|mushroom|herb|parsley|cilantro|basil)/.test(n)) return "produce";
  if (/(rice|pasta|bread|oat|flour|noodle|quinoa)/.test(n)) return "grain";
  return "other";
}
