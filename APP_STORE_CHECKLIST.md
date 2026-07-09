# 🚀 App Store & Google Play Readiness Checklist

Single-source checklist for shipping **The Fridge & Cupboard** to the Apple App Store and Google Play Store. Pair with [`CAPACITOR.md`](./CAPACITOR.md) (build steps) and [`STORE_LISTING.md`](./STORE_LISTING.md) (copy + assets).

---

## ✅ Step 1 — Capacitor support (DONE inside Lovable)

| Item | Status |
|---|---|
| `@capacitor/core` + `@capacitor/cli` installed | ✅ v8.4 |
| `@capacitor/ios` installed | ✅ |
| `@capacitor/android` installed | ✅ |
| `@capacitor/camera` (fridge/cupboard/leftovers scan) | ✅ |
| `@capacitor/splash-screen` | ✅ |
| `@capacitor/status-bar` | ✅ |
| `@capacitor/browser` (OAuth / external links) | ✅ |
| `@capacitor/app` (deep links, back button) | ✅ |
| `@capacitor/assets` (auto icon + splash generation) | ✅ |
| `capacitor.config.ts` — bundle ID `com.TheFridgeandCupboard.app` | ✅ |
| `resources/icon.png` (1024×1024) | ✅ |
| `resources/splash.png` (2732×2732) | ✅ |
| Native billing placeholder (`src/lib/native-billing.ts`) | ✅ |
| Native push placeholder (`src/lib/native-push.ts`) | ✅ |

---

## 📱 Step 2 — Generate `/ios` and `/android` folders (DO ON YOUR MAC/PC)

Lovable cannot create these folders — Apple/Google tooling is required. Run **once**, on your own machine, after cloning the repo from GitHub:

```bash
bun install
bun run build
bunx cap add ios          # creates /ios       (Mac + Xcode required)
bunx cap add android      # creates /android   (Android Studio + JDK 17)
bunx cap sync
bunx capacitor-assets generate \
  --iconBackgroundColor '#e36b3f' \
  --splashBackgroundColor '#e36b3f'
```

Open the native projects:
```bash
bunx cap open ios          # opens Xcode
bunx cap open android      # opens Android Studio
```

---

## 🔐 Step 3 — Native permissions

### iOS — paste into `ios/App/App/Info.plist` after `cap add ios`
```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of your fridge, cupboard, and leftovers to scan ingredients.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Choose existing photos of your food to scan ingredients.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save scan results to your photo library.</string>
<key>NSUserNotificationUsageDescription</key>
<string>Get gentle reminders to use leftovers before they go bad.</string>
```

### Android — `android/app/src/main/AndroidManifest.xml`
Camera permissions are auto-added by `@capacitor/camera`. For notifications on Android 13+, add:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## 🧪 Step 4 — Verify nothing broke (all preserved)

After `bunx cap sync` and launching in simulator, confirm:

- [ ] 🧊 Refrigerator intro animation (slow open + fade)
- [ ] 📷 Scan My Fridge (camera)
- [ ] 🥫 Scan My Cupboard (camera)
- [ ] 🍱 Use My Leftovers
- [ ] ⌨️ "I'll Type My Ingredients" — manual entry + Use First mode
- [ ] 💾 Saved recipes
- [ ] 🔐 Login (Email + Google + Apple)
- [ ] 💳 Subscriptions page (web Stripe still works; native IAP wired later)
- [ ] 👵 Elderly / cancer / brain support section
- [ ] 📲 "Add App to My Phone" install button (web build only — native build hides itself)

---

## 📝 Step 5 — App Store submission checklist

### Accounts (you must create these)
- [ ] **Apple Developer Program** — $99/year — https://developer.apple.com/programs/
- [ ] **Google Play Console** — $25 one-time — https://play.google.com/console
- [ ] Register bundle ID `com.TheFridgeandCupboard.app` in Apple Developer portal

### Required visual assets
- [ ] App icon — ✅ source at `resources/icon.png` (auto-resized by capacitor-assets)
- [ ] Splash screen — ✅ source at `resources/splash.png`
- [ ] iPhone 6.7" screenshots (1290×2796), min 3 / max 10
- [ ] Android phone screenshots (min 1080×1920), min 2 / max 8
- [ ] Google Play feature graphic (1024×500)
- [ ] Google Play hi-res icon (512×512)

### Required URLs (all live ✅)
- [x] Privacy Policy — https://thefridgeandcupboard.com/privacy
- [x] Terms of Service — https://thefridgeandcupboard.com/terms
- [x] Delete Account — https://thefridgeandcupboard.com/delete-account
- [x] Support email — support@thefridgeandcupboard.com
- [x] Marketing URL — https://thefridgeandcupboard.com

### In-app purchases (Phase 2 — after first submission)
- [ ] Apple App Store Connect → IAPs:
  - `pro.standard.monthly` — $3.99/mo
  - `pro.premium.monthly` — $5.99/mo
- [ ] Google Play Console → Subscriptions:
  - `pro_standard_monthly` — $3.99/mo
  - `pro_premium_monthly` — $5.99/mo
- [ ] Install `@revenuecat/purchases-capacitor`
- [ ] Wire up `src/lib/native-billing.ts` (placeholder is ready)
- [ ] Add visible **Restore Purchases** button
- [ ] Web Stripe stays in place for web users (detect with `Capacitor.isNativePlatform()`)

### Store metadata (copy ready)
- [x] App name, subtitle, description, keywords — see [`STORE_LISTING.md`](./STORE_LISTING.md)
- [x] App Privacy questionnaire answers (Apple)
- [x] Data Safety form answers (Google)

### OAuth on native
- [ ] Apple Sign In — configure Service ID + `.p8` private key in backend OAuth settings (required for App Store)
- [ ] Google Sign In — add iOS + Android client IDs in Google Cloud Console

---

## 🎯 You are here

Everything Lovable can do is done. **Next physical step:** clone the repo to your Mac, run the commands in Step 2, then open Xcode / Android Studio. Follow [`CAPACITOR.md`](./CAPACITOR.md) for the exact build & submit flow.
