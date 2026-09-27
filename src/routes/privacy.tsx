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
              <li>Photos you choose to scan (fridge, cupboard, leftovers, store shelves)</li>
              <li>Voice recordings, only while you are speaking to Chef Super J</li>
              <li>Saved recipes, scans, shopping lists and food preferences you create</li>
              <li>Subscription and payment status (we never see your card number)</li>
              <li>Basic usage data to keep the app fast and fix problems</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">Camera, Photos and Microphone</h2>
            <p>
              The camera and photo library are used only when you start a scan, so we can read the
              food in the picture. The microphone is used only while you are talking to Chef Super J
              so your question can be turned into text and answered. Nothing is recorded in the
              background, and none of these are switched on when the app opens — you are always
              asked first, and you can say no and keep using the app by typing instead.
            </p>
            <p>
              Photos and voice audio are sent securely to our recipe and speech providers to produce
              your answer. They are not used to identify you, are not sold, and are not used for
              advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">How We Use Information</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>To recognize the food in your photo and suggest recipes</li>
              <li>To answer your spoken or typed cooking questions</li>
              <li>To remember your saved items, lists and dietary needs</li>
              <li>To manage subscriptions and free trials</li>
              <li>To communicate updates and support</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">Data Protection and Retention</h2>
            <p>
              We take reasonable steps to protect your information and we do not sell your personal
              data. Scan photos and voice audio are kept only as long as needed to produce and show
              your result and your scan history; deleting a scan or your account removes them.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Third-Party Services</h2>
            <p>
              We use trusted providers for hosting and databases, AI recipe and image understanding,
              speech-to-text and text-to-speech, and payment processing (Apple In-App Purchase on
              iPhone and iPad, Stripe on the web). These providers process data on our behalf under
              their own security commitments.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Children</h2>
            <p>
              The app is intended for people aged 13 and over. We do not knowingly collect personal
              information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Your Rights</h2>
            <p>
              You can see, export or delete your information at any time. Account deletion is
              available inside the app under Settings &amp; Help, or at{" "}
              <Link to="/delete-account" className="text-primary underline">Delete account</Link>,
              and removes your account, scans and saved items.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Every Permission, and What Happens If You Say No</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Camera</strong> — asked for the first time you tap a scan button, and used only
                while that scan is being taken. If you decline, you can still scan by choosing a photo
                you already have, or by typing your ingredients.
              </li>
              <li>
                <strong>Photo library</strong> — asked only when you choose "Use a photo I have". We
                read the single picture you pick; we never browse or upload your library.
              </li>
              <li>
                <strong>Microphone and speech recognition</strong> — asked only when you start talking
                to Chef Super J. Audio is captured while you are speaking and stops when you stop.
                There is no background listening, no wake word, and no always-on recording. If you
                decline, every voice feature has a typed equivalent.
              </li>
              <li>
                <strong>Location</strong> — asked only if you open Nearby Stores, and used just to list
                shops near you at that moment. We do not track or store your movements.
              </li>
              <li>
                <strong>Notifications</strong> — optional, and used only for the food expiry reminders
                you switch on yourself. You can turn them off at any time.
              </li>
            </ul>
            <p>
              You can change any of these later in your phone's Settings, and Settings &amp; Help in the
              app explains how.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Using the App Without an Account</h2>
            <p>
              Your first fridge scan and first cupboard scan work without signing up. In that guest
              mode we create a temporary anonymous session so your scan can be processed and shown
              back to you. It is not linked to your name or email, and it is not used to build a
              profile of you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">What We Do Not Do</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>We do not sell or rent your personal information.</li>
              <li>We do not track you across other apps or websites.</li>
              <li>We do not show third-party advertising or include advertising SDKs.</li>
              <li>We do not use your photos or voice to identify you or anyone else.</li>
              <li>We do not use facial recognition, and we do not analyse people in your photos.</li>
              <li>We do not require an account, a card, or a subscription to try the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">How Long We Keep Things</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Scan photos: kept with that scan in your history until you delete the scan, or delete your account.</li>
              <li>Voice audio: used to produce the answer and not stored afterwards; the transcript may stay in your chat until you leave the screen.</li>
              <li>Saved recipes, lists and food preferences: kept until you delete them.</li>
              <li>Account and subscription records: kept while your account exists, then removed, apart from records we must keep for tax or fraud-prevention law.</li>
            </ul>
            <p>
              Data is stored on secured cloud servers in the United States and is encrypted in
              transit. If you use the app from outside the United States, your information is
              transferred there under standard contractual protections.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Legal Bases (EEA and UK)</h2>
            <p>
              We process your information to perform our contract with you (providing scans, recipes
              and subscriptions), with your consent (camera, microphone, photos, notifications and
              location), and for our legitimate interests in keeping the service secure and working.
              You may withdraw consent at any time in your phone's Settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">California and Other State Rights</h2>
            <p>
              If you live in California, Colorado, Connecticut, Virginia or another state with a
              privacy law, you may request access to, correction of, or deletion of your personal
              information, and you may appeal a decision we make. We do not sell or share personal
              information for cross-context behavioural advertising, so there is nothing to opt out
              of. Exercising these rights never changes the price or quality of the app. Write to{" "}
              <a className="text-primary underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Changes to This Policy</h2>
            <p>
              If this policy changes in a meaningful way we will update the effective date above and,
              where the change affects how your photos or voice are used, tell you in the app before
              it takes effect.
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
