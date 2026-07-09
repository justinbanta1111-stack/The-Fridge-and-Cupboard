import { useEffect, useState } from "react";
import { Smartphone, CheckCircle2, Sparkles, Share, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { InstallAppButton } from "@/components/InstallAppButton";
import { cn } from "@/lib/utils";

/**
 * Prominent homepage "Add to Phone" card.
 * - Always visible on mobile (until the app is installed)
 * - Bounce-in entrance animation
 * - Detects install via the `appinstalled` event + standalone display-mode
 * - Shows inline iPhone + Android fallback instructions so users always know
 *   how to add the app, even when the browser doesn't fire a native prompt
 * - Reuses InstallAppButton for platform-aware install flow
 */
export function AddToPhoneCard({ className }: { className?: string }) {
  const [installed, setInstalled] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const onInstalled = () => {
      setInstalled(true);
      setJustInstalled(true);
      window.setTimeout(() => setJustInstalled(false), 4500);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  if (installed) return null;

  return (
    <Card
      className={cn(
        "relative mt-4 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-5 shadow-lg",
        "animate-[bounce-in_0.7s_cubic-bezier(0.34,1.56,0.64,1)_both]",
        className,
      )}
    >
      {justInstalled && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/85 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-2 text-center animate-scale-in">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="font-display text-lg font-bold text-foreground">Added!</div>
            <div className="text-sm text-muted-foreground">You're ready to cook smarter.</div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          {installed ? <CheckCircle2 className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold leading-tight text-foreground">
              {installed ? "Saved to your phone" : "Add App to My Phone"}
            </h2>
            {!installed && (
              <Sparkles className="h-4 w-4 text-primary animate-[pulse_2s_ease-in-out_infinite]" />
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {installed
              ? "Open The Fridge & Cupboard from your home screen any time."
              : "Install The Fridge & Cupboard on your home screen for faster access."}
          </p>

          <div className="mt-3">
            <InstallAppButton
              label="Add App to My Phone"
              className="w-full sm:w-auto !px-6 !py-3 !text-base"
            />
          </div>

          {!installed && (
            <div className="mt-3 grid gap-2 rounded-xl border border-primary/20 bg-background/70 p-3 text-xs text-foreground sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-semibold">iPhone (Safari)</div>
                  <div className="text-muted-foreground">
                    Tap <b>Share</b> → <b>Add to Home Screen</b>.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-semibold">Android (Chrome)</div>
                  <div className="text-muted-foreground">
                    Tap <b>menu</b> → <b>Install app</b>.
                  </div>
                </div>
              </div>
            </div>
          )}

          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
            <li className="flex items-center gap-1">✓ No App Store needed</li>
            <li className="flex items-center gap-1">✓ Free to add</li>
            <li className="flex items-center gap-1">✓ Works like an app</li>
            <li className="flex items-center gap-1">✓ Saves your preferences</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
