# Upgrade roadmap (Sept 2026)

## Done this pass
- [x] Store Mode home button + `/store-mode` hub (scan item, help me choose, bulk, list, stores)
- [x] Bulk / Costco shopping planner (`/bulk-shopping`) with add-to-list
- [x] Shopping List prominent home button + share / text / email / print

## Already in the app (verified, do not rebuild)
Fridge animation + greeting timing, male ElevenLabs voice + hands-free loop + ducking,
scan fridge/cupboard/leftovers, photo + video capture, saved scans/history, surprise me,
make it easy for mom, dietary filters incl. GERD & no-citric-acid, i18n + language picker,
food insights, drink pairings, holidays/desserts, subscriptions + plan gating, Google sign-in,
forgot password, delete account, aisle-grouped lists, expiry reminders.

## Next passes
- [x] App-wide hands-free voice: immediate listening, continuous re-arm, barge-in, consistent pacing, and cooking-step continuity
- [x] Remove background music and ambience from the active app experience
- [ ] Validate voice and cooking walkthrough on iPhone, Android, and installed-app display modes
- [x] Recipe panel: print / email / text / share parity with shopping list
- [x] Store Mode produce-quality prompt tuning (bruising, mold, ripeness) + no-guess price rule
- [x] Free-trial gating audit: 1 free fridge + 1 free cupboard scan before signup prompt
- [ ] Subscriber cleanup: hide trial/add-app banners everywhere for active subscribers
- [x] iOS compliance sweep: restore purchases, native billing sheet, Settings & Help hub, mic consent gate, review notes
- [x] Real food photos on recipe cards + share links (og:image, absolute URL)
- [x] Apple + Google sign-in providers enabled
- [x] App Review notes rewritten: free scan flow, Restore Purchases locations, Store Mode, Shopping List
- [x] App Store Connect metadata pack (name, subtitle, promo, description, keywords, screenshot shot list) — APP_STORE_METADATA.md
- [x] Fix recurring iOS launch crash (builds 240/312/314): CocoaPods-only Capacitor, static pod linkage removes cross-framework dyld resolution, clean integration, archive/exported-IPA guards reject dynamic or unresolved Capacitor symbols, and stale queued release runs are cancelled/rejected
- [x] Real recipe library expanded to 30 dishes + `src/lib/recipe-match.ts` + `MatchedDishes` on scan results and Type My Ingredients
- [x] Recipe detail pages: photo, JSON-LD image, real og:image, add-ingredients-to-shopping-list
- [x] Privacy policy expanded (per-permission camera/mic/photos/location/notifications, guest mode, retention, state/EEA rights)
- [x] iOS resubmission build — signed Guideline 4.2 package uploaded successfully to Apple on Sept 18
- [x] Submission pack complete: build 99 accepted, listing text, screenshots, privacy answers, review notes with the real test account — see SUBMIT_TO_APPLE.md
- [ ] App Store Connect listing upload + submit (Justin's Apple account required)
- [x] Full regression pass before the iOS build (typecheck clean, launch guards pass, fresh + corrupted-state launch tested)
- [x] Home secondary features grouped: More Ways to Cook / Smart Tools / Shopping Tools
- [x] Spoken "Let me take a look." + "Almost there." during photo processing
- [x] VoiceOver labels on the primary home actions
- [x] Per-store price lists (user_stores + store picker in the price editor, on Store Mode and Cost per meal)
- [x] App Privacy disclosure answers written (APP_PRIVACY.md)
- [ ] Live grocery price API — needs a paid data provider + key from Justin


## Current opening fix
- [x] Restore only the historically correct refrigerator opening and emblem/header placement
- [x] Polish the existing warm male voice transitions, pauses, and confidence
- [x] Verify fresh-launch opening at iPhone and Android preview sizes
- [ ] Physical TestFlight launch check for the first build produced from the static-link workflow after 314 — BLOCKED: requires the user's iPhone/TestFlight access

## Current grocery recipe and voice polish
- [x] Refine Chef Super J's warm, mellow voice with smoother phrasing and confident delivery
- [x] Restrict Grocery Store scan meal ideas to real recipes in the app
- [x] Make every Grocery Store meal result open its complete recipe
- [x] Verify a fresh Grocery Store photo scan and recipe handoff in Preview

- Voice greeting: welcome line once per session, varied relaxed follow-ups (done)
- Grocery data: typical pack sizes, prices, calories keyed to real ingredient ids (done)
- Live grocery price API: blocked on provider choice + credentials

- [x] Shopping Trip page (/shopping-trip): list from Store Mode, prices, aisle grouping, mark bought
- [ ] Live grocery price API in Store Mode — blocked on user choosing a provider (Kroger / Spoonacular) and supplying a key

## Apple Guideline 4.2 (minimum functionality) — source ready
- iPhone/Android build now ships the whole app on the device (capacitor webDir dist/client, no remote URL).
- scripts/build-native-shell.mjs renders the real home page + bundles project images into dist/client; wired into ios-testflight.sh, both workflows, and `bun run build:native`.
- Internet-only calls are routed to the live site from the packaged app (src/lib/native-api-origin.ts + serverFns fetch in src/start.ts).
- Native features: device notifications for expiry, iOS share sheet, haptics, native camera capture, on-device storage with sync, offline banner.
- APP_REVIEW_NOTES.md has the native walkthrough + "try it with Wi-Fi off" path.

### Still open
- Live grocery prices: waiting on provider choice (Kroger free vs Spoonacular paid) + credentials.
- App icon: exact older black-background icon (red cape flowing left) not yet located.

## App Store compliance pass (done)
- Installed app shows no prices/purchase buttons and no outside payment links (3.1.1).
- All features unlocked in the app while store billing is unconfigured — no dead ends.
- Real in-app account deletion for signed-in users on /delete-account (5.1.1(v)).
- Smoke-tested 18 routes: all 200, no page errors.

Outside Lovable: register the two subscriptions in App Store Connect + set
VITE_REVENUECAT_IOS_KEY if you want to sell inside the app; upload a new
TestFlight build; grocery price provider choice; exact old black app icon.

## Pre-submission pass (Sept 18)
- [x] iPhone launches its installed app package; Google/Apple authentication returns through the app's URL scheme and internet-only requests use the live service
- [x] Chef uses the person's first name occasionally (account page field, Google/Apple name auto-filled)
- [x] Verified home, sign-in, Store Mode, Grocery List, scan, account on an iPhone-sized view — no page errors
- [ ] Physical TestFlight check of sign-in + scanning — BLOCKED: needs your iPhone

## Guideline 4.2 correction (Sept 18)
- [x] Removed the iOS remote website launch URL.
- [x] Unified local and automated iOS packaging on the rendered native shell.
- [x] Added build guards for a missing/empty local start page and any remote launch URL.
- [x] Routed recipe and shopping-list sharing through the iOS share sheet.
- [x] Repaired duplicate native resume/auth listener registration.
- [ ] Test the newly uploaded signed App Store build — waiting for Apple processing and a physical iPhone walkthrough.
- [x] iOS App Store build upload — corrected package uploaded successfully with no Apple upload errors (run 35398511117, revision b9948ee).

## Apple submission hardening
- [x] Remove the unused older speech-recognition and push modules from the iPhone package while preserving Android voice.
- [x] Add release guards that reject an iPhone archive if either unused module returns.
- [x] Reconcile App Review notes and listing copy with the no-purchase iOS build.
- [ ] Verify the hardened signed build opens on a physical iPhone before submitting for review.

## iPhone launch crash fix (build 95)
- [x] Audio setup moved off the launch/main thread with a playback fallback (watchdog kill at open)
- [x] Start page normalises its address and self-recovers, fixing the blank/dead launch when opened as /index.html
- [x] Release guard rejects a package missing the launch guard
- [x] Verified packaged app renders online and fully offline with no page errors
- [ ] Install the new TestFlight build on the iPhone and confirm it opens

## iPhone update-launch hardening (next TestFlight build)
- [x] Remove native audio-session work from app activation; the existing Chef voice flow owns audio only when used
- [x] Eliminate date/random server-to-device first-render mismatches
- [x] Validate restored device data and correct the persisted feature keys
- [x] Reject mismatched Capacitor core/iOS/CLI versions and regenerated SPM linkage
- [x] Validate clean and corrupted update-state launches, then upload one new TestFlight build

- [x] Confirmation reminder emails (24h + 3 day final) and post-use feedback email, sent by an hourly scheduled job

## Sep 23 — Homepage order
- [x] Sep 23 homepage-order report: verified correct order in preview + live site, signed out/in, phone + desktop (allergies section sits below Fridge/Cupboard/Freezer/Grocery cards). No code order bug found; bumped PWA cache-cleanup version (20260923-order-refresh) so devices holding a stale cached copy refresh it. Live site must be republished for that cleanup to reach the user's phone.

## Sep 24 — App Review polish
- [x] Replace the installed-app “Add App” action with an App Store link.
- [x] Keep technical error details out of the customer-facing recovery screen while preserving error reporting and recovery.
