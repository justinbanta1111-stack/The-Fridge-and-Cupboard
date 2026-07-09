import { Link } from "@tanstack/react-router";
import { Sparkles, Timer, Heart, Activity } from "lucide-react";

export function KitchenMagicStrip() {
  return (
    <section className="mt-4">
      <Link
        to="/kitchen-magic"
        className="group flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-amber-400/10 via-rose-500/10 to-fuchsia-500/10 p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Kitchen Magic</div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            Fridge Fortune · Dinner Fast (5/10/15 min) · Taste Match · Health Score · Funny Chef.
          </p>
        </div>
        <div className="hidden gap-1 sm:flex">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-rose-500/15 text-rose-600"><Timer className="h-3.5 w-3.5" /></span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-pink-500/15 text-pink-600"><Heart className="h-3.5 w-3.5" /></span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><Activity className="h-3.5 w-3.5" /></span>
        </div>
      </Link>
    </section>
  );
}
