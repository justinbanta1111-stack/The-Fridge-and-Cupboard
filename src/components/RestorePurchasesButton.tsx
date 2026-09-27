import { useEffect, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { restoreNativePurchases } from "@/lib/native-billing";
import { isNativeApp } from "@/lib/native-runtime";

/**
 * Apple and Google both require a visible "Restore Purchases" control
 * wherever subscriptions are offered inside the app.
 */
export function RestorePurchasesButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Avoid an SSR/hydration mismatch: only decide after mount.
  useEffect(() => setMounted(true), []);

  async function onRestore() {
    setBusy(true);
    try {
      const ent = await restoreNativePurchases();
      toast.success(
        ent.active
          ? "Your subscription is restored — welcome back."
          : "No previous purchase found on this Apple ID.",
      );
    } catch {
      toast.error("We couldn't reach the store just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !isNativeApp()) return null;

  return (
    <Button type="button" variant="outline" className={className} disabled={busy} onClick={onRestore}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
      Restore purchases
    </Button>
  );
}
