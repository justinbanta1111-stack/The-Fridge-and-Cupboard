import { ChefHat, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ChefScanReaction } from "@/lib/chef-reaction.functions";

/**
 * The chef's immediate, human reaction to the food the user just showed.
 * Additive only — it sits above the existing results, which are unchanged.
 */
export function ChefTake({ reaction, loading }: { reaction?: ChefScanReaction; loading?: boolean }) {
  if (!loading && !reaction) return null;

  return (
    <Card className="ring-paper border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChefHat className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Chef Super J</div>
          {loading ? (
            <p className="mt-1 text-sm text-muted-foreground">Taking a look at what you've got…</p>
          ) : (
            <>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground">{reaction!.reaction}</p>
              {!!reaction!.plan?.length && (
                <ol className="mt-3 space-y-2">
                  {reaction!.plan.map((step, i) => (
                    <li key={i} className="rounded-xl border border-border/60 bg-background/60 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-primary">{step.when}</div>
                      <div className="text-sm font-semibold leading-tight text-foreground">{step.title}</div>
                      <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{step.why}</div>
                    </li>
                  ))}
                </ol>
              )}
              {reaction!.question && (
                <p className="mt-2.5 text-sm font-medium text-muted-foreground">{reaction!.question}</p>
              )}
            </>

          )}
        </div>
      </div>
    </Card>
  );
}
