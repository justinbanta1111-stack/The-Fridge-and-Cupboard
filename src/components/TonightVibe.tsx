import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, Clock, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { nightVibeMeals, type NightVibeResult } from "@/lib/chef-experience.functions";
import { toast } from "sonner";

const VIBES = [
  "Quick & Easy",
  "Comfort Food",
  "Date Night",
  "Feed the Family",
  "Healthy Tonight",
  "Something Impressive",
  "Use It Before It Goes Bad",
  "Cheap Dinner",
  "Make It Fun",
  "Surprise Me",
];

/**
 * One compact, optional row of "what kind of night are we having?" choices.
 * Sits inline under the chef's reaction — no new pages, no new nav.
 */
export function TonightVibe({
  items,
  useFirst = [],
  restrictions = [],
}: {
  items: string[];
  useFirst?: string[];
  restrictions?: string[];
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<NightVibeResult | null>(null);
  const fn = useServerFn(nightVibeMeals);

  const m = useMutation({
    mutationFn: (vibe: string) => fn({ data: { vibe, items, useFirst, restrictions } }),
    onSuccess: (r) => setResult(r),
    onError: (e: Error) => {
      setPicked(null);
      toast.error(e.message || "Chef couldn't plan that one. Try again.");
    },
  });

  function choose(vibe: string) {
    setPicked(vibe);
    setResult(null);
    m.mutate(vibe);
  }

  return (
    <Card className="ring-paper border-accent/25 bg-gradient-to-br from-accent/[0.06] via-card to-card p-4">
      {!picked ? (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            What kind of night are we having?
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => choose(v)}
                className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-[13px] font-medium text-foreground/90 transition hover:border-primary/50 hover:bg-primary/10 active:scale-[0.97]"
              >
                {v}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Totally optional — pick one and I'll build around it.</p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {picked}
            </div>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setResult(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Change
            </button>
          </div>

          {m.isPending && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Alright, let me think…
            </div>
          )}

          {result && (
            <>
              <p className="mt-2 text-[15px] leading-relaxed text-foreground">{result.intro}</p>
              <div className="mt-3 space-y-2">
                {result.meals.map((meal, i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold leading-tight text-foreground">{meal.title}</div>
                      <div className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {meal.timeMinutes}m
                      </div>
                    </div>
                    <div className="mt-1 text-xs leading-snug text-muted-foreground">{meal.why}</div>
                    {!!meal.uses?.length && (
                      <div className="mt-1.5 text-[11px] text-muted-foreground/80">Uses: {meal.uses.join(", ")}</div>
                    )}
                    <div className="mt-1.5 text-[12px] text-primary/90">Chef's touch: {meal.chefTouch}</div>
                  </div>
                ))}
              </div>
              {result.win && (
                <div className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                  {result.win}
                </div>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}
