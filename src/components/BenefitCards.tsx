import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, Leaf, Refrigerator, Zap, ArrowRight } from "lucide-react";
import { getSavingsTotals, formatMoney } from "@/lib/savings-hub";
import { getRecentInventory } from "@/lib/savings.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

type BenefitId = "save" | "waste" | "use" | "fast";

type Benefit = {
  id: BenefitId;
  title: string;
  tag: string;
  Icon: typeof DollarSign;
  gradient: string;
  ring: string;
  iconBg: string;
};

const BENEFITS: Benefit[] = [
  {
    id: "save",
    title: "Save Money",
    tag: "Cook from what you own",
    Icon: DollarSign,
    gradient: "from-emerald-500/15 via-emerald-400/10 to-emerald-300/5",
    ring: "ring-emerald-400/30",
    iconBg: "bg-emerald-500/15 text-emerald-600",
  },
  {
    id: "waste",
    title: "Waste Less Food",
    tag: "Rescue before it spoils",
    Icon: Leaf,
    gradient: "from-lime-500/15 via-green-400/10 to-emerald-300/5",
    ring: "ring-lime-400/30",
    iconBg: "bg-lime-500/15 text-lime-700",
  },
  {
    id: "use",
    title: "Use What You Have",
    tag: "Scan fridge + cupboard",
    Icon: Refrigerator,
    gradient: "from-sky-500/15 via-blue-400/10 to-indigo-300/5",
    ring: "ring-sky-400/30",
    iconBg: "bg-sky-500/15 text-sky-600",
  },
  {
    id: "fast",
    title: "Find a Meal Fast",
    tag: "10 + 20 min ideas",
    Icon: Zap,
    gradient: "from-amber-500/15 via-orange-400/10 to-rose-300/5",
    ring: "ring-amber-400/30",
    iconBg: "bg-amber-500/15 text-amber-600",
  },
];

function BenefitDetail({ id }: { id: BenefitId }) {
  const getInv = useServerFn(getRecentInventory);
  const invQ = useQuery({ queryKey: ["bcards-inv"], queryFn: () => getInv(), staleTime: 30_000 });
  const totals = getSavingsTotals();
  const recent = invQ.data?.items ?? [];

  if (id === "save") {
    const moneySaved = totals.moneySavedCents;
    const realValue = moneySaved > 0;
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Every time you cook from what you already own instead of running to the store, you save real money.
          We track it as you go.
        </p>
        <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-emerald-300/5 p-5 text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {realValue ? "Saved with The Fridge & Cupboard" : "Typical family saves"}
          </div>
          <div className="mt-2 font-display text-4xl font-bold text-emerald-700">
            {realValue ? formatMoney(moneySaved) : "$40–80"}
            <span className="ml-1 text-base font-medium text-emerald-700/70">{realValue ? "" : "/mo"}</span>
          </div>
          <div className="mt-1 text-xs text-emerald-800/70">
            {realValue ? `${totals.mealsCreated} meals cooked from your kitchen` : "Just by skipping duplicate grocery buys"}
          </div>
        </div>
        <Button asChild className="w-full"><Link to="/savings-hub">Open Savings Hub <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
      </div>
    );
  }

  if (id === "waste") {
    const useSoon = (recent as any[]).filter?.((i: any) => i?.freshness === "use-soon") ?? [];
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We flag what's about to go bad and turn it into tonight's meal — before it hits the trash.
        </p>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-700">Use soon</div>
          {useSoon.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {useSoon.slice(0, 5).map((it: any, i: number) => (
                <li key={i}>• {typeof it === "string" ? it : it.name}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-900/80">
              Nothing flagged yet. Scan your fridge and we'll watch the expiration window for you.
            </p>
          )}
        </div>
        <Button asChild className="w-full"><Link to="/going-bad">See what's going bad <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
      </div>
    );
  }

  if (id === "use") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Snap your fridge. Snap your cupboard. Chef Super J builds meals from what's already in your kitchen — no shopping list needed.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border bg-card p-3"><div className="text-xl">📸</div><div className="mt-1 text-xs font-medium">1. Scan</div></div>
          <div className="rounded-xl border bg-card p-3"><div className="text-xl">🧠</div><div className="mt-1 text-xs font-medium">2. Match</div></div>
          <div className="rounded-xl border bg-card p-3"><div className="text-xl">🍳</div><div className="mt-1 text-xs font-medium">3. Cook</div></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline"><Link to="/scan">Scan Fridge</Link></Button>
          <Button asChild><Link to="/cupboard">Scan Cupboard</Link></Button>
        </div>
      </div>
    );
  }

  // fast
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        No time? We surface meals you can have on the table in 10 or 20 minutes from your current ingredients.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-50 p-3 text-center">
          <div className="text-2xl">⚡</div>
          <div className="mt-1 font-display text-lg font-bold text-amber-700">10 min</div>
          <div className="text-xs text-amber-900/80">Eggs · toast · pasta toss</div>
        </div>
        <div className="rounded-2xl border border-orange-400/30 bg-orange-50 p-3 text-center">
          <div className="text-2xl">🔥</div>
          <div className="mt-1 font-display text-lg font-bold text-orange-700">20 min</div>
          <div className="text-xs text-orange-900/80">Stir fry · sheet pan · skillet</div>
        </div>
      </div>
      <Button asChild className="w-full"><Link to="/kitchen-magic">I need dinner fast <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
    </div>
  );
}

export function BenefitCards() {
  const [open, setOpen] = useState<BenefitId | null>(null);
  const active = BENEFITS.find((b) => b.id === open) ?? null;
  return (
    <section className="mt-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {BENEFITS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setOpen(b.id)}
            className={`group flex items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-br ${b.gradient} p-3 text-left ring-1 ${b.ring} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0`}
            aria-label={`${b.title} — learn more`}
          >
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${b.iconBg}`}>
              <b.Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold leading-tight">{b.title}</div>
              <div className="truncate text-[11px] text-muted-foreground">{b.tag}</div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-xl ${active.iconBg}`}>
                    <active.Icon className="h-4 w-4" />
                  </span>
                  {active.title}
                </DialogTitle>
                <DialogDescription>{active.tag}</DialogDescription>
              </DialogHeader>
              <BenefitDetail id={active.id} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default BenefitCards;
