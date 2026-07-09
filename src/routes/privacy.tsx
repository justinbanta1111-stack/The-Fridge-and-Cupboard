import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";

const UPDATED = "July 2, 2026";
const CONTACT = "support@thefridgeandcupboard.com";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "How The Fridge and Cupboard collects, uses, and protects your data — including account info, ingredient photos, and subscription details.",
      },
      { property: "og:title", content: "Privacy Policy — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Read how we handle your data, photos, and account information.",
      },
      { property: "og:url", content: "https://thefridgeandcupboard.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://thefridgeandcupboard.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective Date: {UPDATED}</p>

        <div className="prose prose-neutral mt-8 max-w-none space-y-6 text-[15px] leading-relaxed">
          <section>
            <p>
              The Fridge and Cupboard respects your privacy.
            </p>
            <p>
              We collect information you provide, including account details, ingredient photos, and subscription information, to improve your experience and provide personalized recipe suggestions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Information We Collect</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Account information (name, email)</li>
              <li>Uploaded fridge and cupboard photos</li>
              <li>Subscription and payment details</li>
              <li>Usage data to improve app performance</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">How We Use Information</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>To provide recipe suggestions</li>
              <li>To improve app features</li>
              <li>To manage subscriptions</li>
              <li>To communicate updates and support</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">Data Protection</h2>
            <p>
              We take reasonable steps to protect your information and do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Third-Party Services</h2>
            <p>
              We may use secure third-party services such as payment processors and analytics tools.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Your Rights</h2>
            <p>
              You may request account deletion at any time through the app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Contact</h2>
            <p>
              For questions, contact us at:{" "}
              <a className="text-primary underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          See also: <Link to="/terms" className="text-primary underline">Terms of Service</Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          &copy; 2026 The Fridge and Cupboard. All rights reserved.
        </p>
      </main>
    </div>
  );
}
