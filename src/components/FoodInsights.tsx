import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Info, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFoodInsights } from "@/lib/food-insights.functions";

/**
 * Quiet, opt-in "Food Insights" — a tiny text trigger next to an identified
 * ingredient. Nothing loads and nothing is shown until the user taps it.
 */
export function FoodInsightsLink({ food, className }: { food: string; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Food insights for ${food}`}
        className={
          className ??
          "mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 transition hover:text-primary hover:underline"
        }
      >
        <Info className="h-3 w-3" /> Food insights
      </button>
      {open && <FoodInsightsDialog food={food} onClose={() => setOpen(false)} />}
    </>
  );
}

function FoodInsightsDialog({ food, onClose }: { food: string; onClose: () => void }) {
  const fetchInsights = useServerFn(getFoodInsights);
  const { data, isPending, error } = useQuery({
    queryKey: ["food-insights", food.toLowerCase()],
    queryFn: () => fetchInsights({ data: { food } }),
    staleTime: 60 * 60 * 1000,
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl capitalize">{food}</DialogTitle>
          <DialogDescription>General food and nutrition info — not medical advice.</DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking this one up…
          </div>
        )}

        {error && (
          <p className="py-4 text-sm text-muted-foreground">
            Couldn't pull that up right now — try again in a moment.
          </p>
        )}

        {data && (
          <div className="space-y-4 text-sm">
            <p className="leading-relaxed text-foreground">{data.summary}</p>
            <Section title="Nutrition" lines={data.nutrition} />
            <Section title="Benefits" lines={data.benefits} />
            <Section title="Worth knowing" lines={data.considerations} />
            <div>
              <SectionTitle>Portion</SectionTitle>
              <p className="mt-1 text-muted-foreground">{data.portion}</p>
            </div>
            {data.sources?.length > 0 && (
              <div>
                <SectionTitle>Sources</SectionTitle>
                <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                  {data.sources.map((source, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      <span>{source}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="border-t border-border/60 pt-3 text-[11px] leading-snug text-muted-foreground">
              This is general information about food, not medical advice. Your own health, medications and
              allergies can change the answer — check with a doctor or registered dietitian for anything
              personal.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-wider text-primary">{children}</div>;
}

function Section({ title, lines }: { title: string; lines: string[] }) {
  if (!lines?.length) return null;
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <ul className="mt-1 space-y-1 text-muted-foreground">
        {lines.map((l, i) => (
          <li key={i}>• {l}</li>
        ))}
      </ul>
    </div>
  );
}
