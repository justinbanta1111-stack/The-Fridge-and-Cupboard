import { Link } from "@tanstack/react-router";
import { CalendarDays, Sun } from "lucide-react";

/**
 * Subtle homepage strip pointing to "My Day of Meals" — a personalized
 * full-day planner built from what the user already has.
 */
export function DayOfMealsStrip() {
  return (
    <section className="mt-4">
      <Link
        to="/day-of-meals"
        className="group flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-accent/10 via-primary/8 to-background p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.7_0.18_60)] to-[oklch(0.55_0.18_30)] text-white shadow-md">
          <Sun className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" /> My Day of Meals
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            Breakfast, lunch, dinner and a snack — built from what you already have.
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline">
          Plan today
        </span>
      </Link>
    </section>
  );
}
