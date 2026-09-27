import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";

/**
 * Small, non-blocking notice shown only while the device has no connection.
 * Everything stored on the device (kitchen, recipes, shopping list) keeps
 * working, so the message says exactly that.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-2 bottom-2 z-[280] mx-auto flex max-w-md items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs text-card-foreground shadow-lg backdrop-blur"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>
        You&rsquo;re offline. Your kitchen, saved recipes and shopping list still work — photo scanning
        and Chef&rsquo;s voice come back with your connection.
      </span>
    </div>
  );
}
