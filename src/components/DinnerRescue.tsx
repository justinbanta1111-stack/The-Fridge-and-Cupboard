import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Timer, Loader2, Soup } from "lucide-react";
import { quickMeals, type QuickMeal } from "@/lib/kitchen-magic.functions";
import { getFunnyMode } from "@/lib/funny-chef";

export function DinnerRescue({
  haveIngredients,
  expiring = [],
  leftovers = [],
}: {
  haveIngredients: string[];
  expiring?: string[];
  leftovers?: string[];
}) {
  const [minutes, setMinutes] = useState<5 | 10 | 15>(10);
  const fn = useServerFn(quickMeals);
  const mut = useMutation({
    mutationFn: (m: 5 | 10 | 15) =>
      fn({
        data: {
          mode: "dinner-fast" as const,
          haveIngredients,
          expiring,
          leftovers,
          minutes: m,
          funny: getFunnyMode(),
        },
      }),
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow">
          <Timer className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">I Need Dinner Fast</div>
          <div className="text-xs text-muted-foreground">Leftovers + expiring first. Fewest steps.</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[5, 10, 15].map((m) => (
          <button
            key={m}
            onClick={() => { setMinutes(m as 5 | 10 | 15); mut.mutate(m as 5 | 10 | 15); }}
            disabled={mut.isPending}
            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
              minutes === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
      {haveIngredients.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Add a few ingredients above to get rescued.</p>
      )}
      {mut.isPending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chef is rescuing dinner…
        </div>
      )}
      {mut.isError && <p className="mt-3 text-sm text-rose-600">{(mut.error as Error).message}</p>}
      {mut.data && <MealList meals={mut.data.meals} />}
    </section>
  );
}

export function MealList({ meals }: { meals: QuickMeal[] }) {
  if (!meals.length) return <p className="mt-3 text-sm text-muted-foreground">No ideas yet — try again.</p>;
  return (
    <div className="mt-4 space-y-3">
      {meals.map((m, i) => (
        <div key={i} className="rounded-2xl border border-border bg-background/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Soup className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{m.title}</h3>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{m.time_minutes} min</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{m.why}</p>
          <ol className="mt-2 list-decimal pl-5 text-sm space-y-0.5">
            {m.steps.map((s, j) => <li key={j}>{s}</li>)}
          </ol>
          {m.ingredients_used.length > 0 && (
            <p className="mt-2 text-xs"><span className="font-semibold">Using:</span> {m.ingredients_used.join(", ")}</p>
          )}
          {m.missing.length > 0 && (
            <p className="mt-1 text-xs text-amber-700"><span className="font-semibold">Missing:</span> {m.missing.join(", ")}</p>
          )}
          {m.encouragement && <p className="mt-2 text-xs italic text-muted-foreground">{m.encouragement}</p>}
        </div>
      ))}
    </div>
  );
}
