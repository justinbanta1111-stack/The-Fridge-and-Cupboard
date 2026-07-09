# iOS E2E Test Checklist — Fridge Scanning

Use this on a signed release build (TestFlight internal group or ad-hoc IPA) on at least one recent iPhone and one older iPhone (iOS 16+). Mark each item ✅ / ❌ / N/A.

---

## 1. Install & First Launch
- [ ] App installs from TestFlight without "Unable to Install" error
- [ ] App icon, name (`The Fridge & Cupboard`), and launch screen render correctly
- [ ] App opens to `/onboarding` for new install; existing users land on home
- [ ] No crash on cold start (check Xcode Devices & Simulators console, or TestFlight crash reports)
- [ ] Branding, colors, fonts match web preview (no fallback system font)
- [ ] App Store badge / "Beta" label not visible in-app
- [ ] App resume from background (after 10+ min) returns to previous screen without reload

## 2. Camera Permission Flow
- [ ] First tap on **Scan Fridge** triggers iOS system camera permission alert (`Info.plist` string reads clearly)
- [ ] Granting permission opens camera preview immediately
- [ ] Denying permission shows in-app explainer with "Open Settings" deep link
- [ ] Settings deep link opens directly to app permissions pane; returning to app re-checks permission state
- [ ] Revoking permission in Settings → next scan re-prompts cleanly (no crash)
- [ ] Permission persists across app restarts
- [ ] Verify `Info.plist` declares `NSCameraUsageDescription` with user-facing reason (e.g. "Scan your fridge to track ingredients")

## 3. Camera Capture
- [ ] Preview is not stretched / rotated on portrait; landscape orientation handled gracefully
- [ ] Front/back camera toggle works (if exposed)
- [ ] Tap-to-focus works; capture button is responsive (<300ms)
- [ ] Flash/torch toggle works in low light
- [ ] Captured image preview shows before submit
- [ ] "Retake" discards and reopens camera
- [ ] Photo library picker fallback works (pick existing photo → same recognition path)
- [ ] Large images (>4MB) are compressed before upload (check network payload size in Xcode Network Inspector)
- [ ] Live Photo / HDR / Portrait mode photos from library are downsampled correctly

## 4. Recognition Accuracy — Fridge Contents
Test with these reference scenes and record results:

| Scene | Expected items | Detected | Notes |
|---|---|---|---|
| Open fridge, 5–8 items, good light | All visible items | | |
| Crowded shelf (15+ items) | ≥80% recall | | |
| Dim lighting | Graceful degradation, no crash | | |
| Single packaged item (label visible) | Brand + product name | | |
| Loose produce (apples, broccoli) | Generic name correct | | |
| Glass/transparent containers | Contents identified or flagged | | |
| Handwritten label on leftover container | Parsed as leftover with note | | |
| Empty fridge | Empty-state UI, no hallucinated items | | |
| Non-fridge photo (e.g. living room) | Friendly "no food detected" message | | |

- [ ] Latency from capture → results <8s on Wi-Fi, <15s on 4G/5G
- [ ] Loading state visible the whole time (no frozen UI)
- [ ] Network failure mid-scan → retry button, no lost photo
- [ ] Recognition works on both HEIC and JPEG source images

## 5. Leftovers Parsing
- [ ] Container with visible food → item type + estimated portion
- [ ] Date label ("Made 6/12") parsed into `created_at` / age display
- [ ] "Use by" / "Best before" dates parsed into expiry
- [ ] Multiple leftovers in one shot → each becomes a distinct entry
- [ ] Leftover without label → user prompted to name it before save
- [ ] Edit leftover name/qty/expiry before saving — changes persist
- [ ] Saved leftovers appear in inventory with correct category tag

## 6. Data Persistence
- [ ] Scanned items written to Lovable Cloud (verify in inventory list)
- [ ] RLS: items only visible to the signed-in user (test with 2 accounts)
- [ ] Guest mode: scan works, items attached to anonymous session
- [ ] Sign-in after guest scan → items migrate to user account
- [ ] Offline scan → queued and synced on reconnect (or clear error)
- [ ] Background app refresh enabled: sync completes even if app was backgrounded

## 7. Subscription / Quota Gating
- [ ] Free tier hits scan quota → upgrade sheet appears, branding intact
- [ ] Paid tier: unlimited scans, no quota banner
- [ ] Quota counter updates immediately after each scan
- [ ] In-app purchase sheet (App Store) presents correctly; no web-view billing leaks

## 8. Performance & Stability
- [ ] No memory leak after 20 consecutive scans (Xcode Memory Graph / Instruments)
- [ ] CPU returns to idle between scans
- [ ] No watchdog terminations or jetsam events in Console app
- [ ] Battery: 10 scans drain <3% on flagship iPhone
- [ ] App size <60MB installed; App Store Connect reports <100MB download
- [ ] No excessive thermal throttling during 10 back-to-back scans

## 9. Accessibility
- [ ] VoiceOver reads capture button, results list, and item names
- [ ] Minimum tap targets ≥44pt on scan UI
- [ ] Color contrast meets WCAG AA on results screen
- [ ] Dynamic Type (system Large text) doesn't clip results
- [ ] Reduce Motion respected: no animated transitions if user preference is on
- [ ] Supports both Light and Dark Mode (system appearance)

## 10. iOS Ecosystem & Edge Cases
- [ ] App works correctly when device is in Low Power Mode
- [ ] App works correctly when device is in Focus / Do Not Disturb mode
- [ ] Scan works after receiving a phone call / FaceTime and returning to app
- [ ] Scan works after system camera was used by another app (Camera, Instagram, etc.)
- [ ] App handles iOS 17+ Privacy-sensitive photo library permission (Limited Access) gracefully
- [ ] iPad: app runs in full-screen or Split View; camera preview doesn't crash on external display
- [ ] App Clip / Widget quick-action to scan (if implemented) routes correctly

## 11. Regression — Existing Features
- [ ] Sign in with Apple works (native ASAuthorizationController flow, not web redirect)
- [ ] Sign in with Google works (SDK or SFSafariViewController, not external Safari)
- [ ] Push notifications received (APNs token registers, badge updates)
- [ ] Recipes, shopping list, meal plan all load
- [ ] Community recipes upvote still locked (cannot self-set votes)
- [ ] Stripe / billing portal returnUrl returns to app, not browser tab loop
- [ ] Universal Links (`thefridgeandcupboard.com/...`) open in app (not Safari)
- [ ] Associated Domains entitlement configured for custom domain

---

## Test Devices (minimum)
- iPhone 15 Pro / iPhone 16 — flagship baseline (iOS 18)
- iPhone 12 / SE (3rd gen) — older device, slower CPU (iOS 17+)
- iPad Air / Pro (optional) — layout sanity, multitasking

## Sign-off
- Tester: __________  Build: __________  Date: __________
- Result: ☐ Ship  ☐ Ship with known issues  ☐ Block release
