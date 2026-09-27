import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";
import { UPGRADE_MESSAGE, tierHasFeature } from "@/lib/plan-features";

/** Shows the standard upgrade prompt. Safe to call from any tap handler. */
export function promptPremiumUpgrade() {
  toast(UPGRADE_MESSAGE, {
    action: {
      label: "Upgrade",
      onClick: () => {
        if (typeof window !== "undefined") window.location.href = "/pro";
      },
    },
  });
}

/**
 * Returns whether the signed-in user's Stripe subscription unlocks a feature,
 * plus a guard helper for click handlers.
 */
export function usePremiumFeature(featureId: string) {
  const { tier, loading } = useSubscription();
  const allowed = tierHasFeature(tier, featureId);
  return {
    loading,
    tier,
    allowed,
    /** Returns true when the action may proceed; otherwise shows the upgrade toast. */
    guard: () => {
      if (allowed) return true;
      promptPremiumUpgrade();
      return false;
    },
  };
}

type PremiumGateProps = {
  featureId: string;
  children: ReactNode;
  /** "lock" shows a locked overlay/CTA, "hide" renders nothing without access. */
  mode?: "lock" | "hide";
  title?: string;
};

export function PremiumGate({ featureId, children, mode = "lock", title }: PremiumGateProps) {
  const { allowed, loading } = usePremiumFeature(featureId);

  if (allowed) return <>{children}</>;
  if (loading || mode === "hide") return null;

  return (
    <button
      type="button"
      onClick={promptPremiumUpgrade}
      className="group relative w-full overflow-hidden rounded-2xl border border-accent/40 bg-accent/5 p-5 text-left transition hover:bg-accent/10"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/20 text-accent">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <div className="font-display text-base font-bold text-foreground">
            {title ?? "Premium feature"}
          </div>
          <p className="text-sm text-muted-foreground">{UPGRADE_MESSAGE}</p>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
        <Crown className="h-3.5 w-3.5" /> Upgrade to Premium
      </div>
      <Link to="/pro" className="absolute inset-0" aria-label="Upgrade to Premium" />
    </button>
  );
}
