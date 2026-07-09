import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Sparkles, LogIn, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import {
  closeInstallModal,
  consumePendingCheckout,
  storePendingCheckout,
  type CheckoutPriceId,
} from "@/lib/checkout-intent";

export function HeroSubscribeCTAs() {
  const [showPlans, setShowPlans] = useState(false);
  const { openCheckout, checkoutElement } = useStripeCheckout();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? undefined });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(
        session?.user
          ? { id: session.user.id, email: session.user.email ?? undefined }
          : null,
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const stripeReady = Boolean(import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN);

  const startCheckout = (priceId: CheckoutPriceId) => {
    closeInstallModal();
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
        Free trial requires no credit card. Cancels automatically if you don't add one.
      </p>
      {checkoutElement}
    </div>
  );
}
