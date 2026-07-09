import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

export type FridgeHealthItem = {
  name: string;
  category?: string; // produce, meat, dairy, leftover, etc.
  freshness?: "fresh" | "use-soon" | "questionable" | "throw-out";
  ageDays?: number;
};

export type FridgeHealthBreakdown = {
  score: number; // 0-100
  freshness: number;
  wasteRisk: number;
  protein: number;
  produce: number;
  leftoverAge: number;
  suggestions: string[];
};

const PROTEIN_CATS = new Set(["meat", "seafood", "dairy", "egg", "tofu", "legume", "bean"]);
const PRODUCE_CATS = new Set(["produce", "fruit", "vegetable", "herb"]);

export function computeFridgeHealth(items: FridgeHealthItem[]): FridgeHealthBreakdown {
  const n = items.length;
  const suggestions: string[] = [];
  if (n === 0) {
    return { score: 0, freshness: 0, wasteRisk: 0, protein: 0, produce: 0, leftoverAge: 0, suggestions: ["Scan your fridge to get a score."] };
  }

  let freshCount = 0, useSoon = 0, bad = 0;
  let protein = 0, produce = 0, leftovers = 0, oldLeftovers = 0;

  for (const it of items) {
    const f = it.freshness ?? "fresh";
    if (f === "fresh") freshCount++;
    else if (f === "use-soon") useSoon++;
    else bad++;

    const cat = (it.category ?? "").toLowerCase();
    if (PROTEIN_CATS.has(cat)) protein++;
    if (PRODUCE_CATS.has(cat)) produce++;
    if (cat === "leftover") {
      leftovers++;
      if ((it.ageDays ?? 0) >= 3) oldLeftovers++;
    }
  }

  // sub-scores 0-100
  const freshness = Math.round(((freshCount + useSoon * 0.5) / n) * 100);
  const wasteRisk = Math.round(Math.max(0, 100 - ((bad * 25) + (useSoon * 8))));
  const proteinPct = Math.min(100, Math.round((protein / Math.max(n * 0.2, 1)) * 100));
  const producePct = Math.min(100, Math.round((produce / Math.max(n * 0.3, 1)) * 100));
  const leftoverAge = leftovers === 0 ? 100 : Math.round((1 - oldLeftovers / leftovers) * 100);

  const score = Math.round(
    freshness * 0.3 + wasteRisk * 0.3 + proteinPct * 0.15 + producePct * 0.15 + leftoverAge * 0.1,
  );

  if (bad > 0) suggestions.push(`Use or toss ${bad} risky item${bad === 1 ? "" : "s"} today.`);
  if (useSoon > 2) suggestions.push("A few items are aging — plan tonight's meal around them.");
  if (protein < 2) suggestions.push("Low on protein — add eggs, beans, or a freezer pack.");
  if (produce < 2) suggestions.push("Add fresh produce on your next trip.");
  if (oldLeftovers > 0) suggestions.push(`${oldLeftovers} leftover${oldLeftovers === 1 ? " is" : "s are"} over 3 days old.`);
  if (suggestions.length === 0) suggestions.push("Fridge is in great shape. Keep going.");

  return { score, freshness, wasteRisk, protein: proteinPct, produce: producePct, leftoverAge, suggestions };
}

export function FridgeHealthScore({ items }: { items: FridgeHealthItem[] }) {
  const b = computeFridgeHealth(items);
  const tone =
    b.score >= 80 ? "from-emerald-500 to-teal-500"
    : b.score >= 60 ? "from-amber-500 to-orange-500"
    : "from-rose-500 to-red-500";
  const Icon = b.score >= 80 ? CheckCircle2 : b.score >= 60 ? Activity : AlertTriangle;
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br ${tone} text-white shadow`}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Fridge Health Score</div>
          <div className="text-2xl font-bold leading-tight">{b.score}<span className="text-base text-muted-foreground"> / 100</span></div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Bar label="Freshness" value={b.freshness} />
        <Bar label="Waste risk" value={b.wasteRisk} />
        <Bar label="Protein balance" value={b.protein} />
        <Bar label="Produce balance" value={b.produce} />
        <Bar label="Leftover age" value={b.leftoverAge} />
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {b.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
      </ul>
    </section>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const w = Math.max(0, Math.min(100, value));
  const tone = w >= 75 ? "bg-emerald-500" : w >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="flex justify-between"><span>{label}</span><span className="font-semibold">{w}</span></div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}
