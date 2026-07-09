import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, BookOpen, ShieldQuestion } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";

const UPDATED = "June 13, 2026";
const SUPPORT_EMAIL = "support@thefridgeandcupboard.com";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Contact Support — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Get help with The Fridge and Cupboard — account, scans, subscriptions, refunds, and bug reports.",
      },
      { property: "og:title", content: "Contact Support — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Reach our support team for account, billing, or scanning help.",
      },
      { property: "og:url", content: "https://thefridgeandcupboard.com/support" },
    ],
    links: [{ rel: "canonical", href: "https://thefridgeandcupboard.com/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Contact Support</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <p className="mt-6 text-[15px] leading-relaxed">
          We'd love to help. Most issues are answered fastest by email — you'll typically hear back
          within one business day.
        </p>

        <Card className="mt-6 flex items-start gap-4 p-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold">Email support</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Send us a note with as much detail as you can — screenshots help a lot.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-2 inline-block break-all font-semibold text-primary underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </Card>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-primary">
              <ShieldQuestion className="h-4 w-4" />
              <div className="text-xs font-bold uppercase tracking-widest">Account & billing</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Subscription questions, refunds, plan changes, login problems, password resets.
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-primary">
              <MessageCircle className="h-4 w-4" />
              <div className="text-xs font-bold uppercase tracking-widest">Bugs & feedback</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Scan failing, recipe issues, UI problems, or a feature you wish we had.
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              <div className="text-xs font-bold uppercase tracking-widest">Privacy & data</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Data requests and privacy questions —{" "}
              <Link to="/privacy" className="text-primary underline">
                read our Privacy Policy
              </Link>
              .
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-primary">
              <ShieldQuestion className="h-4 w-4" />
              <div className="text-xs font-bold uppercase tracking-widest">Delete my account</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              You can request account deletion any time.{" "}
              <Link to="/delete-account" className="text-primary underline">
                Start the deletion request
              </Link>
              .
            </p>
          </Card>
        </div>

        <section className="mt-10 space-y-3 text-[15px] leading-relaxed">
          <h2 className="font-display text-xl">Helpful info to include</h2>
          <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
            <li>The email address on your account</li>
            <li>What you were doing when the issue happened</li>
            <li>The device and browser/app version</li>
            <li>A screenshot or short video, if you can</li>
          </ul>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          See also our{" "}
          <Link to="/terms" className="underline">Terms of Service</Link>,{" "}
          <Link to="/subscription-terms" className="underline">Subscription Terms</Link>, and{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
