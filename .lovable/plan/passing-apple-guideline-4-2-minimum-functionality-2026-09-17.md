# Passing Apple Guideline 4.2 (Minimum Functionality)

Nothing is removed and nothing about the look, voice, recipes, scanning, pricing or sign-in changes. The work is about making the iPhone app behave like a real app instead of a shell around the website.

## The core problem

Right now the iPhone app is configured to load `thefridgeandcupboard.com` over the internet. Apple's reviewers see that immediately, and it is the single most common reason for a 4.2 rejection: if the phone is offline, or the site is slow, the app shows nothing. Everything else below is secondary to fixing this.

## What I plan to change

**1. Ship the app inside the app (the big one)**
The whole app gets packaged into the iPhone build and loads instantly from the device, with no website fetch at launch. Recipes, the kitchen inventory, the shopping list and the grocery data all work with the phone in airplane mode. Only the things that genuinely need the internet — photo scanning, the Chef's voice, payments — reach out to the network, and each shows a friendly "you're offline" message instead of a blank screen.

**2. An offline mode people can actually see**
A small indicator when there is no connection, plus an offline-safe home screen: saved recipes, your fridge/cupboard/freezer inventory, the shopping list and Shopping Trip all remain fully usable and editable, and changes sync when the connection returns.

**3. Real native iPhone features**
- Expiry reminders delivered as real iPhone notifications (scheduled on the device), instead of only in-app banners.
- Native share sheet for recipes and shopping lists.
- Haptic feedback on scan complete, step complete and marking items bought in the Shopping Trip.
- Native camera capture path already exists; I'll make sure it's used on device rather than the browser file picker, keeping the existing "Use this photo / Retake" screen exactly as it is.
- Native speech recognition on iOS (matching what Android already uses) so the Chef's microphone is a device feature, not a web page.
- App resume handling so returning to the app restores the exact recipe step you were on.

**4. Device-only data that proves the app is not a web page**
Kitchen inventory, saved recipes, the shopping list, Chef conversation memory and cooking progress get stored on the device itself, so they survive being offline and being force-quit.

**5. Review paperwork**
`APP_REVIEW_NOTES.md` updated to walk the reviewer through the native-only features in order, with a short "try this with Wi-Fi off" section — reviewers respond well to that. `roadmap.md` updated.

## Technical notes

- Remove `server.url` from `capacitor.config.ts`; build to `dist` and `npx cap sync ios` so the bundle is local. This changes the update story: web-only changes will no longer appear on the phone without a new build — that trade is required to pass 4.2.
- Add `@capacitor/local-notifications`, `@capacitor/share`, `@capacitor/haptics`, `@capacitor/preferences`, `@capacitor/network`; add the matching iOS usage strings/entitlements.
- Every native call goes behind the existing `src/lib/native-runtime.ts` guard, so the website path is untouched and keeps its current behaviour.
- TanStack Start SSR must keep working for the website, so native imports stay dynamic and client-side only.

## What I will not touch

Refrigerator opening animation, emblem, colors, layout, navigation, Chef voice personality and pacing, language rules, photo-confirm flow, scanning behaviour, recipes, Store Mode, pricing, sign-in.
