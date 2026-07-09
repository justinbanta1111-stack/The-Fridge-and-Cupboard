import { Sparkles, Coins, Leaf, Utensils } from "lucide-react";

export type FridgeFortuneStats = {
  mealsPossible: number;
  moneySavedCents: number;
  poundsRescued: number;
};

/** Estimate fortune from a simple list of available ingredient names. */
export function estimateFortune(ingredients: string[]): FridgeFortuneStats {
  const n = Math.max(0, ingredients.length);
  // rough heuristic: every 3 ingredients = 1 plausible meal (capped at 12)
  const mealsPossible = Math.min(12, Math.max(n > 0 ? 1 : 0, Math.round(n / 3)));
  // each meal saves roughly $4.50 vs. takeout
  const moneySavedCents = mealsPossible * 450;
  // each meal rescues ~0.4 lb of food
  const poundsRescued = Math.round(mealsPossible * 0.4 * 10) / 10;
  return { mealsPossible, moneySavedCents, poundsRescued };
}

export function FridgeFortune({
  stats,
  title = "Your Fridge Fortune",
}: {
  stats: FridgeFortuneStats;
  title?: string;
}) {
  const dollars = (stats.moneySavedCents / 100).toFixed(2);
  return (
    <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/10 to-background p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">What's possible with what you have</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon={<Utensils className="h-4 w-4" />} label="Meals possible" value={`${stats.mealsPossible}`} tone="from-emerald-500 to-teal-500" />
        <Stat icon={<Coins className="h-4 w-4" />} label="Money saved" value={`$${dollars}`} tone="from-amber-500 to-orange-500" />
        <Stat icon={<Leaf className="h-4 w-4" />} label="Food rescued" value={`${stats.poundsRescued} lb`} tone="from-green-500 to-lime-500" />
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-2 text-center">
      <div className={`mx-auto grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${tone} text-white`}>
        {icon}
      </div>
      <div className="mt-1 text-lg font-bold leading-none">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
