import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Crown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NATIVE_PRODUCTS,
  PurchaseCancelledError,
  restoreNativePurchases,
  startNativePurchase,
  type NativeProductId,
} from "@/lib/native-billing";
import { isIosApp } from "@/lib/native-runtime";

/**
 * Apple-compliant purchase sheet used inside the native apps instead of the
 * Stripe web checkout. Everything Apple asks to be visible before a purchase
 * is on screen as readable text: price, billing period, trial, renewal terms,
 * restore purchases, and links to the terms and privacy policy.
 */
export function NativeSubscribeSheet({
  productId,
  open,
  onClose,
}: {
  productId: NativeProductId;
  open: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const product = NATIVE_PRODUCTS[productId];
  const store = isIosApp() ? "Apple ID" : "Google Play account";

  async function buy() {
    setBusy("buy");
    setError(null);
    try {
      const ent = await startNativePurchase(productId);
      if (ent.active) {
        toast.success(`You're subscribed to ${product.name}. Enjoy!`);
        onClose();
      } else {
        setError("The purchase didn't complete. Nothing was charged.");
      }
    } catch (e: any) {
      if (e instanceof PurchaseCancelledError) return; // shopper closed Apple's sheet
      setError(e?.message ?? "The purchase couldn't be completed. Nothing was charged.");
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy("restore");
    setError(null);
    try {
      const ent = await restoreNativePurchases();
      if (ent.active) {
        toast.success("Your subscription is restored — welcome back.");
        onClose();
      } else {
        setError(`No previous purchase was found on this ${store}.`);
      }
    } catch (e: any) {
      setError(e?.message ?? "We couldn't reach the store just now. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" aria-hidden="true" />
            {product.name} membership
          </DialogTitle>
          <DialogDescription>
            Billed through your {store}. You can cancel anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">{product.price}</span>
            <span className="text-sm text-muted-foreground">{product.period}</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground">
            <li>Free trial: {product.trial}</li>
            <li>Billing period: monthly, charged to your {store}</li>
            <li>
              Renewal: renews automatically each month unless cancelled at least 24 hours before the
              period ends.
            </li>
            <li>Cancel anytime in Settings &gt; Apple ID &gt; Subscriptions.</li>
          </ul>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Button className="w-full" onClick={buy} disabled={busy !== null} aria-label={`Subscribe to ${product.name} for ${product.price} per month`}>
            {busy === "buy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Subscribe — {product.price}/month
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={restore}
            disabled={busy !== null}
            aria-label="Restore a previous purchase"
          >
            {busy === "restore" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Restore purchases
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Not now
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold">
          <Link to="/subscription-terms" onClick={onClose} className="underline underline-offset-4">
            Subscription terms
          </Link>
          <Link to="/terms" onClick={onClose} className="underline underline-offset-4">
            Terms of use
          </Link>
          <Link to="/privacy" onClick={onClose} className="underline underline-offset-4">
            Privacy policy
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NativeSubscribeSheet;
