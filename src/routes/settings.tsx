import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  User as UserIcon,
  LogOut,
  KeyRound,
  RotateCcw,
  CreditCard,
  Trash2,
  Shield,
  FileText,
  Camera,
  Mic,
  LifeBuoy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubscriptionStatusCard } from "@/components/SubscriptionStatusCard";
import { VoiceTimingSettings } from "@/components/VoiceTimingSettings";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/native-runtime";
import { useCanSell } from "@/hooks/use-store-purchases";
import { nativeManageSubscriptionsUrl, restoreNativePurchases } from "@/lib/native-billing";
import { PERMISSION_HELP, PERMISSION_REASON } from "@/lib/permissions";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Help — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Manage your account, restore purchases, manage your subscription, delete your account, and get camera, microphone and support help.",
      },
      { property: "og:title", content: "Settings & Help — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Account, subscription, purchases, privacy, terms, and permission help in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SettingsPage,
});

function Row({
  icon: Icon,
  label,
  hint,
  to,
  onClick,
  busy,
}: {
  icon: typeof UserIcon;
  label: string;
  hint?: string;
  to?: string;
  onClick?: () => void;
  busy?: boolean;
}) {
  const inner = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </>
  );
  const cls =
    "flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition hover:bg-secondary/50 min-h-[56px]";
  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label} disabled={busy}>
      {inner}
    </button>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const [native, setNative] = useState(false);
  const canSell = useCanSell();
  const [signedIn, setSignedIn] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  async function restore() {
    setRestoring(true);
    try {
      const ent = await restoreNativePurchases();
      toast.success(
        ent.active
          ? "Your subscription is restored — welcome back."
          : "No previous purchase was found on this account.",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "We couldn't reach the store just now. Please try again.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-16">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings &amp; Help</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything about your account, your subscription and getting help, in one place.
        </p>

        <VoiceTimingSettings className="mt-6" />

        <section className="mt-6 space-y-2" aria-label="Account">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account</h2>
          <Row icon={UserIcon} label="Account" hint="Your email and profile" to="/account" />
          <Row icon={KeyRound} label="Forgot password" hint="Send yourself a reset link" to="/reset-password" />
          {signedIn ? (
            <Row icon={LogOut} label="Sign out" onClick={signOut} />
          ) : (
            <Row icon={LogOut} label="Sign in" hint="Or keep using the app as a guest" to="/auth" />
          )}
          <Row icon={Trash2} label="Delete account" hint="Permanently delete your account and data" to="/delete-account" />
        </section>

        {canSell ? (
          <section className="mt-6 space-y-2" aria-label="Subscription">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subscription</h2>
            <SubscriptionStatusCard />
            <Card className="p-4 text-sm">
              <p className="font-semibold text-foreground">Membership pricing</p>
              <p className="mt-1 text-muted-foreground">
                Standard is $3.99 per month and Premium is $5.99 per month, after a 3-day free trial.
                Subscriptions renew automatically each month unless cancelled at least 24 hours before
                the period ends. {native ? "Purchases are billed to your Apple ID." : "Purchases are billed through our secure web checkout."}
              </p>
            </Card>
            <Row icon={CreditCard} label="See plans" hint="Compare Free, Standard and Premium" to="/pro" />
            <Row icon={RotateCcw} label="Restore purchases" hint="Bring back a subscription you already bought" onClick={restore} busy={restoring} />
            {native ? (
              <a
                href={nativeManageSubscriptionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left transition hover:bg-secondary/50"
                aria-label="Manage subscription in your Apple ID settings"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Manage subscription</span>
                  <span className="block text-xs text-muted-foreground">Opens your Apple ID subscriptions</span>
                </span>
              </a>
            ) : (
              <Row icon={ExternalLink} label="Manage subscription" hint="Change or cancel your plan" to="/account" />
            )}
            <Row icon={FileText} label="Subscription terms" to="/subscription-terms" />
          </section>
        ) : (
          <section className="mt-6 space-y-2" aria-label="Features">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Features</h2>
            <Card className="p-4 text-sm">
              <p className="font-semibold text-foreground">Everything is unlocked</p>
              <p className="mt-1 text-muted-foreground">
                Every feature in the app — scanning, Chef Super J, recipes, shopping lists and
                reminders — is available to you here. There is nothing to buy inside the app.
              </p>
            </Card>
          </section>
        )}

        <section className="mt-6 space-y-2" aria-label="Legal">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Legal</h2>
          <Row icon={Shield} label="Privacy policy" to="/privacy" />
          <Row icon={FileText} label="Terms of use" to="/terms" />
        </section>

        <section className="mt-6" aria-label="Help">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Help</h2>
          <Accordion type="single" collapsible className="mt-2 rounded-2xl border border-border/60 bg-card px-4">
            <AccordionItem value="camera">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4" aria-hidden="true" /> Camera help
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <p>{PERMISSION_REASON.camera}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {PERMISSION_HELP.camera.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="mic">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Mic className="h-4 w-4" aria-hidden="true" /> Microphone help
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <p>{PERMISSION_REASON.microphone}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {PERMISSION_HELP.microphone.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="photos">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4" aria-hidden="true" /> Photo library help
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <p>{PERMISSION_REASON.photos}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {PERMISSION_HELP.photos.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="mt-2">
            <Row icon={LifeBuoy} label="Contact support" hint="We usually answer the same day" to="/support" />
          </div>
        </section>

        <div className="mt-8">
          <Button asChild variant="outline" className="w-full">
            <Link to="/" aria-label="Back to the home screen">Back to home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
