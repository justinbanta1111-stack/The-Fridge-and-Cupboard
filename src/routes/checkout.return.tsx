import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Welcome aboard | The Fridge and Cupboard" }] }),
  component: CheckoutReturn,
});

type Status = "verifying" | "active" | "timeout" | "no_session";

// Total time to wait for webhook to land before showing the manual-retry state.
const MAX_WAIT_MS = 30_000;
const POLL_MS = 2_000;

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const { isActive, tier, status: subStatus, currentPeriodEnd, refetch, loading } = useSubscription();
  const [status, setStatus] = useState<Status>(session_id ? "verifying" : "no_session");
  const startedAt = useRef<number>(Date.now());

  // Poll the subscriptions table until the webhook activates it, or we time out.
  useEffect(() => {
    if (!session_id) return;
    if (isActive) {
      setStatus("active");
      return;
    }
    const interval = window.setInterval(() => {
      if (Date.now() - startedAt.current > MAX_WAIT_MS) {
        setStatus((s) => (s === "verifying" ? "timeout" : s));
        window.clearInterval(interval);
        return;
      }
      refetch();
    }, POLL_MS);
    return () => window.clearInterval(interval);
  }, [session_id, isActive, refetch]);

  // Flip to "active" the moment the realtime channel (or polling) updates the row.
  useEffect(() => {
    if (isActive && status !== "active") setStatus("active");
  }, [isActive, status]);

  return (
    <div className="min-h-screen bg-background bg-grain">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-10 text-center">
          {status === "no_session" && (
            <>
              <AlertCircle className="mx-auto h-14 w-14 text-muted-foreground" />
              <h1 className="mt-4 font-display text-4xl tracking-tight">No session found</h1>
              <p className="mt-3 text-muted-foreground">
                We couldn't find a checkout session. If you just paid, return to the home page and your access will appear automatically.
              </p>
            </>
          )}

          {status === "verifying" && (
            <>
              <Loader2 className="mx-auto h-14 w-14 animate-spin text-primary" />
              <h1 className="mt-4 font-display text-4xl tracking-tight">Confirming your subscription…</h1>
              <p className="mt-3 text-muted-foreground">
                Payment received. We're finalizing your account — this usually takes a few seconds.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/80">Session: {session_id?.slice(0, 20)}…</p>
            </>
          )}

          {status === "active" && (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
              <h1 className="mt-4 font-display text-4xl tracking-tight">You're in. Welcome to the kitchen.</h1>
              <p className="mt-3 text-muted-foreground">
                Your <span className="font-semibold capitalize">{tier}</span> subscription is active
                {currentPeriodEnd
                  ? ` until ${new Date(currentPeriodEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`
                  : ""}
                . Set your food preferences next and Chef Super J will build a personalized plan for you.
              </p>
            </>
          )}

          {status === "timeout" && (
            <>
              <AlertCircle className="mx-auto h-14 w-14 text-orange-500" />
              <h1 className="mt-4 font-display text-4xl tracking-tight">Payment received</h1>
              <p className="mt-3 text-muted-foreground">
                Your payment went through, but your account hasn't updated yet. This sometimes takes a minute. Try refreshing — if it still doesn't show, email support@thefridgeandcupboard.com and we'll sort it instantly.
              </p>
              {subStatus && (
                <p className="mt-2 text-xs text-muted-foreground/80">Current status: {subStatus}</p>
              )}
            </>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {status === "active" && (
              <Button asChild className="bg-accent uppercase tracking-widest text-white hover:bg-accent/90">
                <Link to="/premium-recommendations">Set my preferences →</Link>
              </Button>
            )}
            {status === "timeout" && (
              <Button
                onClick={() => {
                  startedAt.current = Date.now();
                  setStatus("verifying");
                  refetch();
                }}
                disabled={loading}
                className="bg-primary uppercase tracking-widest text-white hover:bg-primary/90"
              >
                Check again
              </Button>
            )}
            <Button asChild variant="outline" className="border-foreground/20 bg-transparent">
              <Link to="/scan">Scan my fridge</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Back home</Link>
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
