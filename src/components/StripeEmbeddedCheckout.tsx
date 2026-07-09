import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  createCheckoutSession,
  createHostedCheckoutSession,
} from "@/utils/payments.functions";
import { toast } from "sonner";
import { closeInstallModal } from "@/lib/checkout-intent";

interface Props {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
  onClose?: () => void;
}

/**
 * Detects browsers where Stripe's embedded iframe is unreliable and we should
 * prefer a redirect to Stripe-hosted checkout. Covers:
 * - Brave (Shields block stripe.com by default)
 * - In-app webviews (Instagram, Facebook, TikTok, etc.) — third-party cookies blocked
 * - iOS Firefox / Edge (Webkit + their own privacy stack)
 */
function shouldPreferHosted(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if ((navigator as Navigator & { brave?: unknown }).brave) return true;
  if (/Brave/i.test(ua)) return true;
  if (/FBAN|FBAV|Instagram|Line|MicroMessenger|TikTok|Snapchat|WhatsApp/i.test(ua)) return true;
  return false;
}

export function StripeEmbeddedCheckout({ priceId, quantity, returnUrl, onClose }: Props) {
  const [mode, setMode] = useState<"embedded" | "hosted" | "loading">("loading");
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finalReturnUrl =
    returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${window.location.origin}${window.location.pathname}`;

  useEffect(() => {
    closeInstallModal();
    let cancelled = false;
    const env = getStripeEnvironment();

    async function init() {
      // Brave / in-app webviews: skip embedded entirely.
      if (shouldPreferHosted()) {
        const res = await createHostedCheckoutSession({
          data: {
            priceId,
            quantity,
            successUrl: finalReturnUrl,
            cancelUrl,
            environment: env,
          },
        });
        if (cancelled) return;
        if ("error" in res) {
          setError(res.error);
          setMode("hosted");
          return;
        }
        // Redirect immediately.
        window.location.assign(res.url);
        return;
      }

      // Try embedded path first — verify stripe.js loads (Brave/iframe blockers
      // resolve to null).
      try {
        const s = await getStripe();
        if (cancelled) return;
        if (s === null) throw new Error("Stripe.js blocked");
        setMode("embedded");
      } catch {
        // Fallback to hosted.
        const res = await createHostedCheckoutSession({
          data: {
            priceId,
            quantity,
            successUrl: finalReturnUrl,
            cancelUrl,
            environment: env,
          },
        });
        if (cancelled) return;
        if ("error" in res) {
          setError(res.error);
          setMode("hosted");
          return;
        }
        setHostedUrl(res.url);
        setMode("hosted");
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [priceId, quantity, finalReturnUrl, cancelUrl]);

  // Prevent body scroll while modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCheckoutSession({
      data: {
        priceId,
        quantity,
        returnUrl: finalReturnUrl,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <h2 className="font-display text-base font-bold">Secure checkout</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close checkout"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {mode === "loading" && (
          <div className="flex h-full min-h-[40vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {mode === "embedded" && (
          <div id="checkout" className="p-2 sm:p-4">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}

        {mode === "hosted" && (
          <div className="mx-auto max-w-md p-6 text-center">
            {error ? (
              <>
                <p className="text-sm font-semibold text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-secondary px-5 py-2.5 text-sm font-bold"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">
                  Your browser blocks the in-page payment form. Continue to Stripe's secure
                  checkout to complete your subscription.
                </p>
                <a
                  href={hostedUrl ?? "#"}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg"
                >
                  <ExternalLink className="h-4 w-4" /> Continue to Stripe
                </a>
                <p className="mt-3 text-xs text-muted-foreground">
                  Brave users: tap the lion icon in the address bar and lower Shields for this
                  site, then try again.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
