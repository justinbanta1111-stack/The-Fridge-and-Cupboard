import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";

const UPDATED = "June 13, 2026";
const SUPPORT_EMAIL = "support@thefridgeandcupboard.com";

export const Route = createFileRoute("/subscription-terms")({
  head: () => ({
    meta: [
      { title: "Subscription Terms — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Subscription pricing, billing, renewals, cancellations, and refund policy for The Fridge and Cupboard Standard and Premium plans.",
      },
      { property: "og:title", content: "Subscription Terms — The Fridge and Cupboard" },
      {
        property: "og:description",
        content:
          "Plans, pricing, auto-renewal, cancellation, and refund terms for The Fridge and Cupboard subscriptions.",
      },
      { property: "og:url", content: "https://thefridgeandcupboard.com/subscription-terms" },
    ],
    links: [{ rel: "canonical", href: "https://thefridgeandcupboard.com/subscription-terms" }],
  }),
  component: SubscriptionTermsPage,
});

function SubscriptionTermsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Subscription Terms</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <div className="prose prose-neutral mt-8 max-w-none space-y-6 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-xl">1. Plans and pricing</h2>
            <p>
              The Fridge and Cupboard offers two paid plans. All prices are in U.S. dollars and may
              vary by region, currency, applicable taxes, and the payment system you subscribe
              through.
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Standard — $3.99 / month.</strong> Unlimited fridge and cupboard scans,
                saved recipes, leftovers and pantry tools, and core meal modes.
              </li>
              <li>
                <strong>Premium — $5.99 / month.</strong> Everything in Standard plus premium
                features such as advanced meal modes, family meal planning, and priority support as
                described in the app at the time of purchase.
              </li>
            </ul>
            <p>
              We may add new plans, prices, billing intervals (for example annual plans), free
              trials, promotional pricing, or regional pricing at any time. Any new pricing applies
              to future billing periods and will be shown to you before you accept it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">2. How you're billed</h2>
            <p>
              Subscriptions are billed through the payment system you signed up with. That may be
              our web payments provider, Apple In-App Purchase (via the App Store), or Google Play
              Billing (via the Play Store). The terms and refund rules of that payment system also
              apply.
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>You pay for each billing period in advance.</li>
              <li>Your subscription automatically renews at the end of each billing period at the then-current price for that plan.</li>
              <li>You can cancel auto-renewal any time before the next renewal date.</li>
              <li>If a payment fails, we may retry it and your access may be paused until payment succeeds.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">3. Free trials and promotions</h2>
            <p>
              If we offer a free trial, you may need to provide payment information to start it.
              Unless you cancel before the trial ends, your paid subscription will start
              automatically and you'll be charged the standard price. Trials and promotions may be
              limited to one per person or household.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">4. Cancellation</h2>
            <p>
              You can cancel at any time. Cancellation stops future renewals — it does not refund
              the current billing period unless required by law or by the payment system's policies.
              After cancellation you keep access until the end of the period you've already paid
              for.
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Web subscriptions:</strong> manage or cancel from your{" "}
                <Link to="/account" className="text-primary underline">
                  account page
                </Link>
                .
              </li>
              <li>
                <strong>Apple App Store subscriptions:</strong> manage in iOS Settings → your name →
                Subscriptions.
              </li>
              <li>
                <strong>Google Play subscriptions:</strong> manage in Google Play → Profile →
                Payments &amp; subscriptions → Subscriptions.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">5. Refunds</h2>
            <p>
              Where required by law (for example consumer-protection rights in your country), you
              may be entitled to a refund. Outside of those rights, refunds are at our discretion
              and at the discretion of the payment system that processed the charge. App Store and
              Play Store refunds are handled by Apple and Google respectively — we cannot issue
              refunds for those purchases directly.
            </p>
            <p>
              For web-payment refund requests, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">6. Price changes</h2>
            <p>
              We may change subscription prices. If we change the price of your plan, we'll notify
              you ahead of the change. The new price applies starting from your next billing period
              after the change takes effect. If you don't want to continue at the new price, you can
              cancel before the change applies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">7. What's included</h2>
            <p>
              The exact list of features in each plan is described in the app at the time of
              purchase. We may add, modify, or remove features over time as the product evolves.
              Major reductions in a paid plan will be communicated in advance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">8. Account suspension and termination</h2>
            <p>
              We may suspend or terminate paid access for breach of our{" "}
              <Link to="/terms" className="text-primary underline">
                Terms of Service
              </Link>
              , fraud, chargebacks, or abuse. If we terminate for cause, you are not entitled to a
              refund of amounts already paid.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">9. Deleting your account</h2>
            <p>
              You can request account deletion at any time on the{" "}
              <Link to="/delete-account" className="text-primary underline">
                Delete Account
              </Link>{" "}
              page. Deleting your account does not by itself cancel a subscription billed through
              Apple or Google — you also need to cancel through the respective store.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">10. Contact</h2>
            <p>
              Questions about your subscription? Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              or visit our{" "}
              <Link to="/support" className="text-primary underline">
                Support page
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
