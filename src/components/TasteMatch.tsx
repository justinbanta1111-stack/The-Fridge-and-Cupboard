import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Heart, Loader2 } from "lucide-react";
import { quickMeals } from "@/lib/kitchen-magic.functions";
import { MealList } from "./DinnerRescue";
import { getFunnyMode } from "@/lib/funny-chef";

const TASTES = [
  { label: "Mexican", emoji: "🌮" },
  { label: "Italian", emoji: "🍝" },
  { label: "Asian", emoji: "🥢" },
  { label: "Comfort food", emoji: "🥧" },
  { label: "Healthy", emoji: "🥗" },
  { label: "Breakfast", emoji: "🍳" },
  { label: "Soup", emoji: "🍲" },
  { label: "High protein", emoji: "🍗" },
];

export function TasteMatch({
  haveIngredients,
  expiring = [],
  leftovers = [],
}: {
  haveIngredients: string[];
  expiring?: string[];
  leftovers?: string[];
}) {
  const [pick, setPick] = useState<string | null>(null);
  const fn = useServerFn(quickMeals);
  const mut = useMutation({
    mutationFn: (taste: string) =>
      fn({
        data: {
          mode: "taste-match" as const,
          haveIngredients,
          expiring,
          leftovers,
          taste,
          funny: getFunnyMode(),
        },
      }),
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">What sounds good?</div>
          <div className="text-xs text-muted-foreground">Match a craving to what you already have.</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TASTES.map((t) => (
          <button
            key={t.label}
            onClick={() => { setPick(t.label); mut.mutate(t.label); }}
            disabled={mut.isPending}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs font-semibold transition ${
              pick === t.label ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"
            }`}
          >
            <span className="text-xl">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>
      {mut.isPending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Matching your craving…
        </div>
      )}
      {mut.isError && <p className="mt-3 text-sm text-rose-600">{(mut.error as Error).message}</p>}
      {mut.data && <MealList meals={mut.data.meals} />}
    </section>
  );
}
