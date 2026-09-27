import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Sparkles, Gift, RefreshCw, Loader2, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import { RestorePurchasesButton } from "@/components/RestorePurchasesButton";
import { FREE_SCANS_PER_KIND, getFreeScansUsed } from "@/lib/guest";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * One consistent subscription panel: what plan you're on, how much trial is
 * left, when it renews, and a one-tap way to restore or refresh a purchase.
 */
export function SubscriptionStatusCard({ className }: { className?: string }) {
  const {
    loading,
    userId,
    isActive,
    isPremium,
    tier,
    status,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    isTrialing,
    daysLeft,
    refetch,
  } = useSubscription();
  const [freeLeft, setFreeLeft] = useState<{ fridge: number; cupboard: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setFreeLeft({
      fridge: Math.max(0, FREE_SCANS_PER_KIND - getFreeScansUsed("fridge")),
      cupboard: Math.max(0, FREE_SCANS_PER_KIND - getFreeScansUsed("cupboard")),
    });
  }, [isActive, userId]);

  function refresh() {
    setRefreshing(true);
    refetch();
    window.setTimeout(() => setRefreshing(false), 900);
  }

  const renews = formatDate(currentPeriodEnd);
  const planName = isPremium ? "Premium" : tier === "standard" ? "Standard" : "Free";

  let headline: string;
  if (loading) headline = "Checking your plan…";
  else if (isTrialing)
    headline =
      daysLeft === null
        ? "Your free trial is running."
        : daysLeft <= 1
          ? "Your free trial ends today."
          : `${daysLeft} days left in your free trial.`;
  else if (isActive && cancelAtPeriodEnd)
    headline = renews ? `Cancelled — you keep full access until ${renews}.` : "Cancelled — access continues until the end of your period.";
  else if (isActive && status === "past_due")
    headline = "We couldn't take your last payment. Access stays on while it retries.";
  else if (isActive) headline = renews ? `Active — renews ${renews}.` : "Active.";
  else if (!userId) headline = "You're browsing as a guest.";
  else headline = "You're on the free plan.";

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full",
              isPremium
                ? "bg-gradient-to-r from-[#FFC72C] to-[#D62828] text-white"
                : isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-primary",
            )}
          >
            {isPremium ? (
              <Crown className="h-5 w-5" aria-hidden="true" />
            ) : isActive ? (
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Gift className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div>
            <h2 className="font-display text-lg leading-tight">{planName} plan</h2>
            <p className="text-sm text-muted-foreground">{headline}</p>
          </div>
        </div>
        {isTrialing && (
          <Badge variant="secondary" className="shrink-0">
            Trial
          </Badge>
        )}
      </div>

      {!isActive && freeLeft && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm">
          <Camera className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Free scans left: {freeLeft.fridge} fridge · {freeLeft.cupboard} cupboard. After that a
            plan keeps the scanning going.
          </span>
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {!isActive && (
          <Button asChild className="h-11">
            <Link to="/pro" aria-label="See plans and start a free trial">
              {userId ? "See plans" : "Start free trial"}
            </Link>
          </Button>
        )}
        {isActive && (
          <Button asChild variant="outline" className="h-11">
            <Link to="/account" aria-label="Manage your subscription">
              Manage subscription
            </Link>
          </Button>
        )}
        <RestorePurchasesButton className="h-11 w-full" />
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh subscription status"
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Refresh status
        </Button>
      </div>
    </Card>
  );
}

export default SubscriptionStatusCard;
