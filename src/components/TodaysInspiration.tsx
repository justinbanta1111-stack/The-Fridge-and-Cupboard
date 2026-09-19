import { Link } from "@tanstack/react-router";
import { Lightbulb, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  extractIngredientKeywords,
  pickPersonalizedTip,
  type DietId,
} from "@/lib/personalization";

type Inspiration = {
  kind: string;
  text: string;
  to: string;
  cta: string;
  /** higher = better match for this user */
  score: number;
};

function dayOfYear(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

function season(now: Date): "spring" | "summer" | "fall" | "winter" {
  const m = now.getMonth(); // 0-11
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}

const SEASONAL: Record<string, { text: string; to: string }> = {
  spring: {
    text: "Spring is here — fresh greens, asparagus, and light pasta dishes are at their best (and cheapest) right now.",
    to: "/recipes",
  },
  summer: {
    text: "Summer means grilling season — marinades and quick no-oven meals keep the kitchen cool.",
    to: "/recipes",
  },
  fall: {
    text: "Fall is soup season — one pot, whatever vegetables you have, and a cozy dinner that stretches for days.",
    to: "/recipes",
  },
  winter: {
    text: "Winter comfort food: slow-simmered stews turn inexpensive cuts and pantry staples into something special.",
    to: "/recipes",
  },
};

const DID_YOU_KNOW: { text: string; to: string; cta: string }[] = [
  {
    text: "Did you know you can snap a photo of your fridge and get dinner ideas in seconds?",
    to: "/scan",
    cta: "Try it",
  },
  {
    text: "Did you know Store Mode works while you shop? Point the camera at any shelf for meal ideas and prices.",
    to: "/store-mode",
    cta: "See Store Mode",
  },
  {
    text: "Did you know you can get a heads-up before food goes bad? Expiry alerts keep money out of the trash.",
    to: "/expiry",
    cta: "Check dates",
  },
  {
    text: "Did you know you can plan a whole day of meals from what's already in your kitchen?",
    to: "/day-of-meals",
    cta: "Plan a day",
  },
  {
    text: "Did you know your shopping list sorts itself by store aisle — and you can share or print it?",
    to: "/shopping-list",
    cta: "See the list",
  },
];

type Props = {
  /** Item names from the user's recent fridge/cupboard scans. */
  items?: string[];
  /** The dietary preferences the user has selected. */
  prefs?: DietId[];
};

/**
 * "Today's Kitchen Inspiration" — one simple, attractive suggestion per day,
 * personalized from saved preferences and scans when available. Tapping it
 * takes the user deeper. Quiet and compact so it never competes with the
 * primary scan/leftovers actions.
 */
export function TodaysInspiration({ items = [], prefs = [] }: Props) {
  const [today, setToday] = useState(() => new Date(2026, 0, 1));
  useEffect(() => setToday(new Date()), []);
  const todayNumber = dayOfYear(today);
  const keywords = extractIngredientKeywords(items);
  const hasLeftovers = keywords.includes("leftovers");
  const firstItem = items[0]?.trim();

  const pool: Inspiration[] = [];

  // 1) Creative leftover transformation — strong when leftovers were seen.
  pool.push({
    kind: "Leftover makeover",
    text: hasLeftovers
      ? "Those leftovers are a head start, not a repeat — turn them into a fried rice, a wrap, or a soup that tastes brand new."
      : "Leftovers are tomorrow's shortcut — almost anything roasted becomes a great wrap, bowl, or soup.",
    to: "/rescue",
    cta: "Transform them",
    score: hasLeftovers ? 5 : 1.5,
  });

  // 2) Meal idea based on ingredients the user actually has.
  if (firstItem) {
    pool.push({
      kind: "From your kitchen",
      text: `You have ${firstItem} on hand — see real meals you can make with it tonight, no extra trip needed.`,
      to: "/type-ingredients",
      cta: "See meal ideas",
      score: 4,
    });
  } else {
    pool.push({
      kind: "Easy dinner idea",
      text: "A simple pasta with garlic, olive oil, and whatever vegetables you have makes a dinner everyone likes.",
      to: "/recipes",
      cta: "Browse ideas",
      score: 1,
    });
  }

  // 3) Money-saving idea.
  pool.push({
    kind: "Save money",
    text: "Beans, rice, eggs, and frozen vegetables are the four cheapest ways to stretch any meal — and they taste great.",
    to: "/stretch-my-groceries",
    cta: "Stretch my groceries",
    score: 2,
  });

  // 4) Seasonal suggestion.
  const s = SEASONAL[season(today)];
  pool.push({ kind: "In season now", text: s.text, to: s.to, cta: "Get inspired", score: 2 });

  // 5) Quick cooking tip — personalized from scans + diet prefs.
  const tip = pickPersonalizedTip(items, prefs);
  pool.push({
    kind: "Quick tip",
    text: tip.text,
    to: "/academy",
    cta: "Learn more",
    score: tip.ingredients.some((i) => keywords.includes(i)) || tip.diets.some((d) => prefs.includes(d)) ? 4.5 : 1,
  });

  // 6) Budget-friendly meal.
  pool.push({
    kind: "Budget meal",
    text: "A big pot of soup or chili feeds everyone for a few dollars — and the leftovers get better overnight.",
    to: "/stretch-my-groceries",
    cta: "See budget meals",
    score: prefs.some((p) => p === "family-friendly" || p === "kid-friendly") ? 3 : 1.5,
  });

  // 7) "Did you know you can do this?" — rotates daily.
  const dyk = DID_YOU_KNOW[todayNumber % DID_YOU_KNOW.length];
  pool.push({ kind: "Did you know?", text: dyk.text, to: dyk.to, cta: dyk.cta, score: 2.5 });

  // Pick one per day: sort by personalization score, then rotate through the
  // top matches by day-of-year so it stays fresh without changing mid-visit.
  pool.sort((a, b) => b.score - a.score);
  const topN = pool.slice(0, 3);
  const pick = topN[todayNumber % topN.length];

  return (
    <section className="mx-auto mt-3 w-full max-w-2xl sm:mt-4" data-reveal>
      <Link
        to={pick.to}
        aria-label={`Today's Kitchen Inspiration — ${pick.kind}. ${pick.cta}`}
        className="press-lift sheen group relative block overflow-hidden rounded-2xl border border-gold/35 bg-ink-soft/70 px-4 py-3 backdrop-blur-md transition hover:bg-ink-soft/85"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-gold/20 blur-3xl"
        />
        <div className="relative z-[2] flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/50 bg-gold/20 text-gold">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
                Today's Kitchen Inspiration
              </span>
            </div>
            <div className="mt-0.5 text-sm font-semibold leading-snug text-ivory">
              {pick.kind}
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-ivory/80">{pick.text}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-gold">
              {pick.cta}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

export default TodaysInspiration;
