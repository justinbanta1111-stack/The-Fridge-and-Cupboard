import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Sparkles, LogIn, Gift } from "lucide-react";
import { toast } from "sonner";
import { isNativeApp } from "@/lib/native-runtime";
import { supabase } from "@/integrations/supabase/client";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useCanSell } from "@/hooks/use-store-purchases";
import { useSubscription } from "@/hooks/use-subscription";
import {
  closeInstallModal,
  consumePendingCheckout,
  storePendingCheckout,
  type CheckoutPriceId,
} from "@/lib/checkout-intent";

export function HeroSubscribeCTAs() {
  const [showPlans, setShowPlans] = useState(false);
  const canSell = useCanSell();
  const { openCheckout, checkoutElement } = useStripeCheckout();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const { isActive: hasSubscription } = useSubscription();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !data.user.is_anonymous) {
        setUser({ id: data.user.id, email: data.user.email ?? undefined });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(
        session?.user && !session.user.is_anonymous
          ? { id: session.user.id, email: session.user.email ?? undefined }
          : null,
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const stripeReady = Boolean(import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN);

  const startCheckout = (priceId: CheckoutPriceId) => {
    closeInstallModal();
    // Installed app: always open Apple's/Google's purchase sheet directly.
    // Store purchases don't need a website account or Stripe, and App
    // Review must reach the sheet without signing in.
    if (isNativeApp()) {
      openCheckout({ priceId });
      return;
    }
    if (!stripeReady) {
      toast.message("Checkout isn't live yet — please try again shortly.");
      return;
    }
    if (!user) {
      storePendingCheckout(priceId);
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname || "/")}`;
      return;
    }
    openCheckout({
      priceId,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const startTrial = () => startCheckout("premium_monthly");

  // Auto-start trial if redirected back from auth with ?trial=1
  useEffect(() => {
    if (!user) return;
    const stored = consumePendingCheckout();
    if (stored) {
      startCheckout(stored);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("trial") === "1") {
      params.delete("trial");
      window.history.replaceState({}, "", window.location.pathname);
      startTrial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Signed-in members never see sign-in / trial / pricing blocks.
  if (!canSell || hasSubscription || user) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Sign In — most prominent when not logged in */}
      {!user && (
        <Link
          to="/auth"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-base font-extrabold text-stone-900 shadow-xl ring-2 ring-white/60 transition hover:scale-[1.01] hover:bg-white/95 active:scale-[0.98]"
        >
          <LogIn className="h-5 w-5" />
          Sign In / Log In
        </Link>
      )}

      {/* Free Trial */}
      <button
        type="button"
        onClick={startTrial}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3.5 text-base font-extrabold text-white shadow-xl ring-2 ring-emerald-300/60 transition hover:scale-[1.01] hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
      >
        <Gift className="h-5 w-5" />
        Start Free 3-Day Trial
      </button>
      <p className="-mt-1 text-center text-sm font-semibold text-white/95">
        Then just $3.99/month. Cancel anytime.
      </p>

      {/* See Plans & Pricing — secondary, no prices until tapped */}
      {!showPlans ? (
        <button
          type="button"
          onClick={() => setShowPlans(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-white/70 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-md backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
        >
          See Plans & Pricing
        </button>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => startCheckout("standard_monthly")}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[oklch(0.82_0.17_70)] px-4 py-3 text-left text-[oklch(0.2_0.05_45)] shadow-lg transition hover:brightness-110 active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 shrink-0" />
              <div className="leading-tight">
                <div className="text-sm font-extrabold">Standard — $3.99/month</div>
                <div className="text-[11px] font-semibold opacity-80">Great for everyday meals</div>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => startCheckout("premium_monthly")}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#FFC72C] to-[#D62828] px-4 py-3 text-left text-white shadow-lg ring-2 ring-white/40 transition hover:brightness-110 active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 shrink-0" />
              <div className="leading-tight">
                <div className="text-sm font-extrabold">Premium — $5.99/month</div>
                <div className="text-[11px] font-semibold opacity-90">Full Chef Super J experience</div>
              </div>
            </div>
          </button>
        </div>
      )}

      <p
        className="text-center text-xs text-white/90 sm:text-sm"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
      >
        3-day free trial with a card on file. Your plan starts automatically after 3 days unless you cancel.
      </p>
      {checkoutElement}
    </div>
  );
}
