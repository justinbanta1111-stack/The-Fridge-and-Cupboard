import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UPDATED = "June 13, 2026";
const SUPPORT_EMAIL = "support@thefridgeandcupboard.com";
const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete Account — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Request deletion of your The Fridge and Cupboard account and personal data. Required by Apple App Store and Google Play.",
      },
      { property: "og:title", content: "Delete Account — The Fridge and Cupboard" },
      {
        property: "og:description",
        content:
          "Request permanent deletion of your account, saved recipes, scans, and personal data.",
      },
      { property: "og:url", content: "https://thefridgeandcupboard.com/delete-account" },
    ],
    links: [{ rel: "canonical", href: "https://thefridgeandcupboard.com/delete-account" }],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail(data.user.email);
        setSignedIn(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== CONFIRM_PHRASE) {
      toast.error(`Type "${CONFIRM_PHRASE}" exactly to confirm.`);
      return;
    }
    if (!email.trim()) {
      toast.error("Enter the email on your account.");
      return;
    }
    setSubmitting(true);
    const subject = encodeURIComponent("Account deletion request");
    const body = encodeURIComponent(
      `Hello,\n\nI'm requesting permanent deletion of my account and personal data.\n\n` +
        `Account email: ${email}\n` +
        `Reason (optional): ${reason || "—"}\n\n` +
        `I understand this is permanent and cannot be undone.\n`,
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitting(false);
    toast.success("Opening your email app to send the request.");
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Delete Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <Card className="mt-6 border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">This is permanent</div>
              <p className="mt-1 text-muted-foreground">
                Deleting your account permanently removes your profile, saved recipes, fridge and
                cupboard scans, savings history, and personalization. This action cannot be undone.
              </p>
            </div>
          </div>
        </Card>

        <section className="mt-8 text-[15px] leading-relaxed">
          <h2 className="font-display text-xl">What gets deleted</h2>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>Your account and login</li>
            <li>Saved recipes, leftovers, and meal favorites</li>
            <li>Uploaded fridge and cupboard photos</li>
            <li>Personalization, food personality, and cooking history</li>
            <li>Reminder preferences</li>
          </ul>

          <h2 className="mt-6 font-display text-xl">What may be retained</h2>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>
              Billing and tax records required by law (kept by our payment provider, with personal
              identifiers minimized where possible).
            </li>
            <li>Anonymized, aggregated usage statistics that no longer identify you.</li>
            <li>Backups, which are rotated and overwritten within 30 days.</li>
          </ul>

          <h2 className="mt-6 font-display text-xl">If you subscribe through Apple or Google</h2>
          <p className="mt-2 text-muted-foreground">
            Deleting your account here does <strong>not</strong> automatically cancel a subscription
            billed by the App Store or Play Store. Cancel that subscription separately in:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>iOS: Settings → your name → Subscriptions</li>
            <li>Android: Google Play → Profile → Payments &amp; subscriptions → Subscriptions</li>
          </ul>
        </section>

        <Card className="mt-8 p-5">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <div className="text-xs font-bold uppercase tracking-widest">Submit deletion request</div>
          </div>
          {!signedIn && (
            <p className="mt-2 text-sm text-muted-foreground">
              You don't need to be signed in to request deletion. We'll verify ownership of the
              email before deleting anything.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-semibold">
                Account email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="reason" className="text-sm font-semibold">
                Reason (optional)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Anything you'd like us to know — totally optional."
              />
            </div>

            <div>
              <label htmlFor="confirm" className="text-sm font-semibold">
                Type{" "}
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                  {CONFIRM_PHRASE}
                </span>{" "}
                to confirm
              </label>
              <input
                id="confirm"
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <Button
              type="submit"
              variant="destructive"
              disabled={submitting}
              className="w-full gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {submitting ? "Opening email…" : "Send deletion request"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              We process deletion requests within 30 days. You'll get a confirmation email when it's
              complete.
            </p>
          </form>
        </Card>

        <p className="mt-10 text-xs text-muted-foreground">
          Prefer to email directly?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          . See also our{" "}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="underline">
            Terms of Service
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
