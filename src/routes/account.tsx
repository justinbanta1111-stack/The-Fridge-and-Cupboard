import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, User as UserIcon, LogOut, Shield, FileText, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/SiteNav";
import { VoiceAssistantSettings } from "@/components/VoiceAssistantSettings";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { createPortalSession } from "@/utils/payments.functions";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionStatusCard } from "@/components/SubscriptionStatusCard";
import { YourNameCard } from "@/components/YourNameCard";
import { ProfilePhotoCard } from "@/components/ProfilePhotoCard";
import { getStripeEnvironment } from "@/lib/stripe";
import { isNativeApp } from "@/lib/native-runtime";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account Settings — The Fridge and Cupboard" },
      { name: "description", content: "Manage your account, sign out, or permanently delete your account and data." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteMyAccount);
  const portalFn = useServerFn(createPortalSession);
  const subscription = useSubscription();
  const [portalBusy, setPortalBusy] = useState(false);
  // The installed app never links out to an outside payment page.
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setUser({ id: data.user.id, email: data.user.email });
      setLoading(false);
    });
  }, [navigate]);

  // Coming back from the billing portal: refresh so the cancellation
  // confirmation (and end date) shows up right away.
  const refetchSubscription = subscription.refetch;
  useEffect(() => {
    const onFocus = () => refetchSubscription();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refetchSubscription]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  async function handleManageBilling() {
    setPortalBusy(true);
    try {
      let environment: "sandbox" | "live";
      try {
        environment = getStripeEnvironment();
      } catch {
        environment = "live";
      }
      const result: any = await portalFn({
        data: { environment, returnUrl: `${window.location.origin}/account` },
      });
      if (result && "error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not open billing. Please try again.");
    } finally {
      setPortalBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteFn({});
      // Server has removed the auth user; clear local session.
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not delete account. Please try again or email support.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteNav />
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Account Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your account and data.</p>

        <Card className="mt-6 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium">Signed in as</div>
              <div className="text-sm text-muted-foreground">{user?.email ?? user?.id}</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </Card>

        <YourNameCard className="mt-4" />
        <ProfilePhotoCard className="mt-4" />

        {subscription.isActive && !native && (
          <Card className="mt-4 p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Subscription</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subscription.cancelAtPeriodEnd
                    ? "Your plan ends"
                    : subscription.status === "trialing"
                      ? "Free trial — renews"
                      : "Renews"}
                  {subscription.currentPeriodEnd
                    ? ` on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                    : ""}
                  . Update your payment method, switch plans, view invoices, or cancel anytime.
                </p>
              </div>
            </div>
            {subscription.cancelAtPeriodEnd && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                <div className="font-semibold">Cancellation confirmed</div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    • You keep full access until{" "}
                    <span className="font-medium text-foreground">
                      {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : "the end of your billing period"}
                    </span>
                    .
                  </li>
                  <li>• You won't be charged again.</li>
                  <li>• After that date your account switches to the free plan.</li>
                  <li>• Your scans, saved recipes, and history stay in your account.</li>
                  <li>• You can resubscribe anytime — nothing is deleted.</li>
                </ul>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleManageBilling} disabled={portalBusy} className="gap-2">
                {portalBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage billing
              </Button>
              {!subscription.cancelAtPeriodEnd && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Cancel subscription</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Here's what happens when you cancel</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-2 text-left">
                          <p>
                            You'll finish cancelling in the secure billing portal. Once you confirm
                            there:
                          </p>
                          <ul className="space-y-1">
                            <li>
                              • You keep full access until{" "}
                              {subscription.currentPeriodEnd
                                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                                : "the end of your current billing period"}
                              .
                            </li>
                            <li>• No further charges — your plan simply won't renew.</li>
                            <li>• After that date you move to the free plan.</li>
                            <li>• Your scans, saved recipes, and history are kept.</li>
                            <li>• You can resubscribe anytime and pick up where you left off.</li>
                          </ul>
                          <p>
                            Come back to this page after cancelling and you'll see your confirmed
                            end date here.
                          </p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                      <AlertDialogAction onClick={handleManageBilling}>
                        Continue to cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </Card>
        )}

        {!native && <SubscriptionStatusCard className="mt-4" />}

        <Card className="mt-4 p-5">
          <div className="text-sm font-medium">Legal</div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link to="/privacy" className="inline-flex items-center gap-1.5 text-primary underline">
              <Shield className="h-4 w-4" /> Privacy Policy
            </Link>
            <Link to="/terms" className="inline-flex items-center gap-1.5 text-primary underline">
              <FileText className="h-4 w-4" /> Terms of Service
            </Link>
          </div>
        </Card>

        <VoiceAssistantSettings />



        <Card className="mt-4 border-destructive/40 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-destructive">Delete account</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently delete your account, scans, photos, savings history, and
                subscription record. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete my account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes your account, all fridge and cupboard scans,
                    uploaded photos, savings history, and subscription record. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Type <span className="font-mono font-semibold">DELETE</span> to confirm</Label>
                  <Input
                    id="confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== "DELETE" || busy}
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Permanently delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          &copy; 2026 The Fridge and Cupboard. All rights reserved.
        </p>
      </main>
    </div>
  );
}
