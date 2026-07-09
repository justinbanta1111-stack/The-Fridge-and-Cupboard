# Android E2E Test Checklist — Fridge Scanning

Use this on a signed release build (internal testing track or sideloaded APK) on at least one low-end and one flagship Android device (API 26+). Mark each item ✅ / ❌ / N/A.

---

## 1. Install & First Launch
- [ ] AAB installs from Play Internal Testing without "package invalid" error
- [ ] App icon, name (`The Fridge & Cupboard`), and splash render correctly
- [ ] App opens to `/onboarding` for new install; existing users land on home
- [ ] No crash on cold start (check `adb logcat | grep -i AndroidRuntime`)
- [ ] Branding, colors, fonts match web preview (no fallback system font)

## 2. Camera Permission Flow
- [ ] First tap on **Scan Fridge** triggers Android system camera prompt
- [ ] Granting permission opens camera preview immediately
- [ ] Denying permission shows in-app explainer with "Open Settings" deep link
- [ ] "Don't ask again" → Settings deep link works and returns user to scan screen
- [ ] Revoking permission in OS settings → next scan re-prompts cleanly (no crash)
- [ ] Permission persists across app restarts
- [ ] Verify `AndroidManifest.xml` declares only `CAMERA`, `POST_NOTIFICATIONS`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` (no extras)

## 3. Camera Capture
- [ ] Preview is not stretched / rotated on portrait and landscape
- [ ] Front/back camera toggle works (if exposed)
- [ ] Tap-to-focus works; capture button is responsive (<300ms)
- [ ] Flash/torch toggle works in low light
- [ ] Captured image preview shows before submit
- [ ] "Retake" discards and reopens camera
- [ ] Gallery picker fallback works (pick existing photo → same recognition path)
- [ ] Large images (>4MB) are compressed before upload (check network payload size)

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

- [ ] Latency from capture → results <8s on Wi-Fi, <15s on 4G
- [ ] Loading state visible the whole time (no frozen UI)
- [ ] Network failure mid-scan → retry button, no lost photo

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

## 7. Subscription / Quota Gating
- [ ] Free tier hits scan quota → upgrade sheet appears, branding intact
- [ ] Paid tier: unlimited scans, no quota banner
- [ ] Quota counter updates immediately after each scan

## 8. Performance & Stability
- [ ] No memory leak after 20 consecutive scans (`adb shell dumpsys meminfo <pkg>`)
- [ ] CPU returns to idle between scans
- [ ] No ANRs in `adb logcat`
- [ ] Battery: 10 scans drain <3% on flagship
- [ ] App size <60MB installed

## 9. Accessibility
- [ ] TalkBack reads capture button, results list, and item names
- [ ] Minimum tap targets ≥48dp on scan UI
- [ ] Color contrast meets WCAG AA on results screen
- [ ] Dynamic font sizing (system Large text) doesn't clip results

## 10. Regression — Existing Features
- [ ] Sign in with Google works (native flow, not web redirect)
- [ ] Push notifications received (POST_NOTIFICATIONS granted)
- [ ] Recipes, shopping list, meal plan all load
- [ ] Community recipes upvote still locked (cannot self-set votes)
- [ ] Stripe / billing portal returnUrl returns to app, not browser tab loop
- [ ] Deep links (`thefridgeandcupboard.com/...`) open in app

---

## Test Devices (minimum)
- Pixel 6+ (Android 14/15) — flagship baseline
- Samsung A-series or older Pixel 4a — mid/low-end
- Tablet (optional) — layout sanity

## Sign-off
- Tester: __________  Build: __________  Date: __________
- Result: ☐ Ship  ☐ Ship with known issues  ☐ Block release
