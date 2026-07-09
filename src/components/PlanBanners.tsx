import { useEffect, useState } from "react";
import { Sparkles, Crown, LogIn, ArrowRight, Gift } from "lucide-react";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  closeInstallModal,
  consumePendingCheckout,
  storePendingCheckout,
  type CheckoutPriceId,
} from "@/lib/checkout-intent";

export function PlanBanners() {
  const { openCheckout, checkoutElement } = useStripeCheckout();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // On return from auth, auto-open checkout if a price was stored
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const stored = consumePendingCheckout();
    if (stored) {
      startCheckout(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const stripeReady = Boolean(
    typeof import.meta.env !== "undefined" && import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN,
  );

  const startCheckout = (priceId: CheckoutPriceId) => {
    closeInstallModal();
    if (!stripeReady) {
      toast.message("Checkout isn't live yet — please try again shortly.");
      return;
    }
    if (!user) {
      if (typeof window !== "undefined") {
        storePendingCheckout(priceId);
        window.location.href = `/auth?redirect=${encodeURIComponent("/")}`;
      }
      return;
    }
    openCheckout({
      priceId,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  const startTrial = () => startCheckout("premium_monthly");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* Trial CTA — always visible first */}
      <button
        type="button"
        onClick={startTrial}
        className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-base font-extrabold text-white shadow-xl ring-2 ring-emerald-300/60 transition hover:scale-[1.01] hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
      >
        <Gift className="h-5 w-5" />
        Start Free 3-Day Trial
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Standard */}
        <button
          type="button"
          onClick={() => startCheckout("standard_monthly")}
          className="group relative flex flex-col items-start gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 px-5 py-4 text-left shadow-lg transition hover:brightness-105 active:scale-[0.98]"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-lg font-bold text-foreground">Standard</div>
                <div className="text-sm font-semibold text-primary">$3.99/month</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <p className="text-sm leading-snug text-muted-foreground">
            General recipes, fridge &amp; cupboard scans, leftovers, savings, and meal ideas.
          </p>
          {!user && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LogIn className="h-3 w-3" />
              Sign in to subscribe
            </div>
          )}
        </button>

        {/* Premium */}
        <button
          type="button"
          onClick={() => startCheckout("premium_monthly")}
          className="group relative flex flex-col items-start gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-amber-600/10 px-5 py-4 text-left shadow-lg shadow-amber-500/10 transition hover:brightness-105 active:scale-[0.98]"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#FFC72C] to-[#D62828] text-white shadow-sm">
                <Crown className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-lg font-bold text-foreground">Premium</div>
                <div className="text-sm font-semibold text-amber-600">$5.99/month</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <p className="text-sm leading-snug text-muted-foreground">
            Personalized recipes, weekly meal plan, diet/allergy/cuisine preferences, and Chef Super J recommendations.
          </p>
          {!user && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LogIn className="h-3 w-3" />
              Sign in to subscribe
            </div>
          )}
        </button>
      </div>
      {checkoutElement}
    </div>
  );
}

