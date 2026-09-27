import { Check, Crown, Lock, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import { useCanSell } from "@/hooks/use-store-purchases";
import {
  PLAN_FEATURES,
  PLAN_PRICES,
  planIncludes,
  type PlanKey,
} from "@/lib/plan-features";

const PLANS: { key: PlanKey; label: string }[] = [
  { key: "free", label: "Free" },
  { key: "standard", label: "Standard" },
  { key: "premium", label: "Premium" },
];

export function PlanComparisonTable() {
  const { tier, isActive, loading } = useSubscription();
  const canSell = useCanSell();
  const currentPlan: PlanKey = isActive ? (tier as PlanKey) : "free";

  if (!canSell || isActive) return null;

  return (
    <section className="mt-16">
      <h2 className="font-display text-4xl tracking-tight">Compare plans</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Every plan is billed monthly and cancels anytime. Premium features stay locked until your
        Premium subscription is active.
      </p>

      <Card className="mt-6 overflow-x-auto border-border/60 bg-card p-0">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="p-4 text-left text-xs uppercase tracking-widest text-muted-foreground">
                Feature
              </th>
              {PLANS.map((p) => (
                <th key={p.key} className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center gap-1 font-display text-lg">
                      {p.key === "premium" && <Crown className="h-4 w-4 text-accent" />}
                      {p.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{PLAN_PRICES[p.key]}</span>
                    {!loading && currentPlan === p.key && (
                      <Badge className="bg-primary text-[10px] uppercase tracking-widest text-primary-foreground">
                        Your plan
                      </Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((f) => (
              <tr key={f.id} className="border-b border-border/40 last:border-0">
                <td className="p-4">
                  <span>{f.label}</span>
                  {f.requires === "premium" && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-accent">
                      <Crown className="h-3 w-3" /> Premium
                    </span>
                  )}
                </td>
                {PLANS.map((p) => {
                  const included = planIncludes(p.key, f);
                  const capped = p.key === "free" && included && f.note;
                  return (
                    <td key={p.key} className="p-4 text-center">
                      {included ? (
                        capped ? (
                          <span className="text-xs text-muted-foreground">{f.note}</span>
                        ) : (
                          <Check className="mx-auto h-4 w-4 text-success" />
                        )
                      ) : f.requires === "premium" ? (
                        <Lock className="mx-auto h-4 w-4 text-muted-foreground/60" />
                      ) : (
                        <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {!loading && currentPlan === "standard" && (
        <p className="mt-3 text-sm text-muted-foreground">
          You're on Standard. Upgrade to Premium ($5.99/month) to unlock the locked features above.
        </p>
      )}
    </section>
  );
}
