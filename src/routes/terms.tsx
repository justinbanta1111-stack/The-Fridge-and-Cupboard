import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";

const UPDATED = "June 11, 2026";
const CONTACT = "support@thefridgeandcupboard.com";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "The terms that govern your use of The Fridge and Cupboard, including AI-generated recipes, subscriptions, and food safety disclaimers.",
      },
      { property: "og:title", content: "Terms of Service — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Read the terms that govern your use of The Fridge and Cupboard.",
      },
      { property: "og:url", content: "https://thefridgeandcupboard.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://thefridgeandcupboard.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <div className="prose prose-neutral mt-8 max-w-none space-y-6 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-xl">1. Agreement</h2>
            <p>
              By creating an account or using The Fridge and Cupboard (the "app"), you agree
              to these Terms of Service and our{" "}
              <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
              If you do not agree, please do not use the app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">2. Your account</h2>
            <p>
              You must be at least 13 years old to use the app. You are responsible for
              keeping your login credentials secure and for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">3. Acceptable use</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Don't upload illegal, harmful, or infringing content.</li>
              <li>Don't try to break, overload, or reverse-engineer the app or its AI features.</li>
              <li>Don't use the app to harass, spam, or impersonate others.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">4. AI-generated content & food safety disclaimer</h2>
            <p>
              The app uses artificial intelligence to identify items in photos, estimate
              freshness, and suggest recipes. These outputs are <strong>informational only</strong>
              and may be inaccurate. They are <strong>not</strong> medical, nutritional, or
              food-safety advice. <strong>Always use your own judgement</strong> — inspect
              food yourself for spoilage, follow allergen warnings, and consult a qualified
              professional for dietary needs. We are not liable for decisions you make based
              on AI output.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">5. Subscriptions and payments</h2>
            <p>
              Paid plans are billed through Stripe. Subscriptions renew automatically until
              cancelled. You can cancel anytime; access continues until the end of the paid
              period. Refunds follow the policy of the platform you subscribed through.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">6. Your content</h2>
            <p>
              You own the photos you upload. You grant us a limited license to store and
              process them only to provide the app's features (AI scanning, history,
              recipes). We do not sell your content or use it to train third-party models.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">7. Termination</h2>
            <p>
              You can delete your account at any time from{" "}
              <Link to="/account" className="text-primary underline">Account Settings</Link>.
              We may suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">8. Disclaimers and limitation of liability</h2>
            <p>
              The app is provided "as is" without warranties of any kind. To the maximum
              extent allowed by law, we are not liable for any indirect, incidental, or
              consequential damages, including food spoilage, allergic reactions, or
              dietary outcomes arising from your use of the app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">9. Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of the app after
              changes take effect means you accept the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">10. Governing law</h2>
            <p>
              These terms are governed by the laws of your country of residence to the
              extent required; otherwise, by the laws of the United States.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">11. Contact</h2>
            <p>
              Questions? Email <a className="text-primary underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          See also: <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          &copy; 2026 The Fridge and Cupboard. All rights reserved.
        </p>
      </main>
    </div>
  );
}
