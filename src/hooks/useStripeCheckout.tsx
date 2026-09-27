import { useState, useCallback, useEffect } from "react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { NativeSubscribeSheet } from "@/components/NativeSubscribeSheet";
import { isNativeApp } from "@/lib/native-runtime";
import { nativeProductForPriceId } from "@/lib/native-billing";

interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
}

/**
 * Single entry point for starting a subscription.
 *
 * Web  → Stripe embedded checkout (unchanged).
 * Native iOS / Android → Apple's / Google's in-app purchase sheet, because
 * store rules forbid sending users to an outside payment flow for digital
 * subscriptions.
 */
export function useStripeCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [native, setNative] = useState(false);

  // Decide after mount to avoid an SSR/hydration mismatch.
  useEffect(() => setNative(isNativeApp()), []);

  const openCheckout = useCallback((opts: CheckoutOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const checkoutElement = !isOpen || !options
    ? null
    : native
      ? (
          <NativeSubscribeSheet
            open
            productId={nativeProductForPriceId(options.priceId)}
            onClose={closeCheckout}
          />
        )
      : <StripeEmbeddedCheckout {...options} onClose={closeCheckout} />;

  return { openCheckout, closeCheckout, isOpen, checkoutElement };
}
