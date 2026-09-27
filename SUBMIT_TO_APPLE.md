# Submit The Fridge & Cupboard to the App Store

Everything on the app side is finished. Build 99 was signed and accepted by
Apple on 19 Sept 2026 (workflow run 35409734533). The steps below are the only
ones left, and they all happen in App Store Connect with your Apple account.

---

## 1. Confirm the build

App Store Connect → **TestFlight** → iOS builds.
Wait until build **99** shows *Ready to Test* (processing takes 10–30 minutes).
Install it once from TestFlight and open it before submitting.

## 2. Create the version

App Store Connect → **Apps → The Fridge & Cupboard → App Store → + Version**
Version number: **1.0.0**

## 3. Paste the listing text

Copy each block, as written, from `APP_STORE_METADATA.md`:
- Name, Subtitle, Promotional text, Keywords
- Description
- Support URL: https://thefridgeandcupboard.com
- Marketing URL: https://thefridgeandcupboard.com
- Privacy Policy URL: https://thefridgeandcupboard.com/privacy

## 4. Upload the screenshots

Six 6.7-inch iPhone screenshots are ready in Files:
`fridge-cupboard-app-store/screenshots/` (1-home, 2-grocery-store,
3-cook-with-chef, 4-fridge-scan, 5-shopping-trip, 6-kitchen-guide).
Upload all six in that order to the 6.7" display size, then use
"Copy to other sizes" for 6.5".

## 5. Answer App Privacy

Use `APP_PRIVACY.md` — it has the exact answer for every data question Apple
asks (collected data, linking, tracking).

## 6. Answer the submission questions

Use `APP_STORE_SUBMISSION_ANSWERS.md`:
- Encryption: Yes, exempt (standard HTTPS)
- Third-party content: No
- Advertising identifier: No
- Age rating: 4+
- No in-app purchases in this build

## 7. App Review Information

Paste the whole of `APP_REVIEW_NOTES.md` into the Notes field. It already
contains:
- the Guideline 4.2 native-functionality walkthrough (offline launch, on-device
  storage, native camera, local notifications, share sheet, haptics, speech)
- the five-minute review path
- the test account: `justin.test@thefridgeandcupboard.com` / `FridgeChef2026!`
- where Delete Account lives

## 8. Select build 99 and submit

Choose build 99, set release to **Manual** (so you control the launch day), then
press **Add for Review → Submit**.

---

## What was verified on the app before this build

- No remote launch URL — the app runs from the installed package, checked by a
  release guard that fails the build otherwise.
- No launch-time audio work in the native startup code.
- Deterministic first render (no launch-time randomness or date mismatch).
- Restored device data is validated; corrupted data is ignored instead of
  crashing an update launch.
- Capacitor core/iOS/CLI versions locked to the same version, static linkage,
  no duplicate framework copies.
- Unused plugins removed from the iOS build.
- Fresh-install and corrupted-update launches tested and clean.
- Full code check passes with no errors.

## Known open items (not blockers)

- Live grocery price data still needs a provider and key from you; the app uses
  saved and estimated prices until then.
- Subscriptions are not sold in this iOS build, matching the review notes.
