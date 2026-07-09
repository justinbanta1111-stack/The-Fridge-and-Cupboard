import { Link } from "@tanstack/react-router";
import { ShoppingBasket, CalendarDays, Users, Tag } from "lucide-react";

export function GrowthHubStrip() {
  return (
    <section className="mt-4">
      <Link
        to="/grocery-plus"
        className="group flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
          <ShoppingBasket className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Smart Grocery & Weekly Planning</div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            Grocery list · Week of meals · Family scaler · Party · Bulk cook · Pantry challenge · Price watch · Substitutions · Local food.
          </p>
        </div>
        <div className="hidden gap-1 sm:flex">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><CalendarDays className="h-3.5 w-3.5" /></span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-500/15 text-teal-600"><Users className="h-3.5 w-3.5" /></span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-500/15 text-sky-600"><Tag className="h-3.5 w-3.5" /></span>
        </div>
      </Link>
    </section>
  );
}
