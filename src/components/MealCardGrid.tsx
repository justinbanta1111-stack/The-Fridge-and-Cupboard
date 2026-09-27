/**
 * Tappable meal suggestion cards. Every suggested meal is a real button that
 * opens the interactive Chef experience for that exact dish — never dead text.
 */

import { Link } from "@tanstack/react-router";
import { Clock, ChefHat, ArrowRight } from "lucide-react";
import { recipePhotoPath } from "@/lib/recipe-photo";
import { cn } from "@/lib/utils";

export type MealSuggestion = {
  name: string;
  description?: string;
  minutes?: number;
  uses?: string[];
};

export function MealCard({ meal, className }: { meal: MealSuggestion; className?: string }) {
  return (
    <Link
      to="/cook-with-chef"
      search={{ meal: meal.name }}
      className={cn(
        "group block overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm",
        "transition active:scale-[0.98] active:brightness-95 hover:border-primary/50 hover:shadow-md",
        className,
      )}
      aria-label={`Cook ${meal.name} with Chef Super J`}
    >
      <img
        src={recipePhotoPath(meal.name, meal.description)}
        alt={meal.name}
        loading="lazy"
        className="h-32 w-full object-cover"
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base leading-tight">{meal.name}</h3>
          {typeof meal.minutes === "number" && meal.minutes > 0 && (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {meal.minutes} min
            </span>
          )}
        </div>
        {meal.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meal.description}</p>
        )}
        {meal.uses?.length ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
            Uses: {meal.uses.slice(0, 4).join(", ")}
          </p>
        ) : null}
        <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground">
          <ChefHat className="h-3.5 w-3.5" aria-hidden="true" /> Cook This
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function MealCardGrid({
  meals,
  heading,
  className,
}: {
  meals: (MealSuggestion | string)[];
  heading?: string;
  className?: string;
}) {
  const list = meals
    .map((m) => (typeof m === "string" ? { name: m } : m))
    .filter((m) => m.name && m.name.trim().length > 1);
  if (list.length === 0) return null;
  return (
    <section className={className}>
      {heading && <h2 className="font-display text-xl tracking-tight sm:text-2xl">{heading}</h2>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <MealCard key={m.name} meal={m} />
        ))}
      </div>
    </section>
  );
}
