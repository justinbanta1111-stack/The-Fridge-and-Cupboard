import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp, ArrowRight } from "lucide-react";
import { getSavingsTotals, formatMoney } from "@/lib/savings-hub";

/**
 * Live savings meter for the homepage. Shows the real cents saved when the
 * user has logged cooked meals; otherwise shows a friendly teaser so the hook
 * is always visible.
 */
export function SavingsMeter() {
  const [cents, setCents] = useState(0);
  const [meals, setMeals] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const t = getSavingsTotals();
      setCents(t.moneySavedCents);
      setMeals(t.mealsCreated);
    };
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("fnc:savings-updated", onStorage as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("fnc:savings-updated", onStorage as EventListener);
    };
  }, []);

  const hasReal = cents > 0;

  return (
    <Link
      to="/savings-hub"
      className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-emerald-700/60 bg-gradient-to-br from-emerald-900 via-[#064e3b] to-emerald-950 p-3 shadow-lg shadow-emerald-900/20 transition hover:shadow-xl sm:gap-3 sm:p-5"
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 sm:h-11 sm:w-11">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="min-w-0 overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            {hasReal ? "Your savings" : "Money saved"}
          </div>
          <div className="break-words font-display text-base font-bold leading-tight text-white sm:text-xl">
            {hasReal ? (
              <>You&apos;ve saved <span className="text-emerald-300">{formatMoney(cents)}</span></>
            ) : (
              <>You&apos;ve saved <span className="text-emerald-300">$0</span> so far</>
            )}
          </div>
          <div className="truncate text-[11px] text-emerald-100/80 sm:text-xs">
            {hasReal
              ? `${meals} meal${meals === 1 ? "" : "s"} cooked from your kitchen`
              : "Cook one meal from what you own to start the meter"}
          </div>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-emerald-300" />
    </Link>
  );
}
