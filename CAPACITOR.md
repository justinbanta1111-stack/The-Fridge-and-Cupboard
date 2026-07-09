# Native iOS & Android Build Guide

This project is wrapped with **Capacitor 8** so it can be submitted to the Apple App Store and Google Play Store.

**Important:** Native builds cannot run inside Lovable. You must do this on your own machine. iOS requires a **Mac**.

---

## What's already done for you

- ✅ `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` installed
- ✅ Native plugins installed: `app`, `camera`, `splash-screen`, `status-bar`, `browser`
- ✅ `@capacitor/assets` installed (auto-generates every required icon + splash size)
- ✅ `capacitor.config.ts` configured — bundle ID `com.TheFridgeandCupboard.app`
- ✅ `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732) — source images for asset generation
- ✅ Splash, theme color, status bar, and OAuth domain allowlist pre-configured

---

## One-time setup on your machine

### Prerequisites
- **Node 20+** and **Bun** (or npm/yarn)
- **iOS:** Mac with **Xcode 15+** + CocoaPods (`sudo gem install cocoapods`)
- **Android:** [Android Studio](https://developer.android.com/studio) + JDK 17

### Clone & install
```bash
git clone <your-github-repo>
cd <project>
bun install
```

### Generate all native icons & splash screens
This reads `resources/icon.png` + `resources/splash.png` and generates every Apple/Google size:
```bash
bunx capacitor-assets generate --iconBackgroundColor '#e36b3f' --splashBackgroundColor '#e36b3f'
```

### Add the native projects (first time only)
```bash
bun run build                # builds the web shell into .output/public
bunx cap add ios
bunx cap add android
bunx cap sync
```

---

## Build & run

### iOS (Mac only)
```bash
bun run build && bunx cap sync ios
bunx cap open ios            # opens Xcode
```
In Xcode: select your team under **Signing & Capabilities** → press ▶ (run on simulator) or **Product → Archive** for App Store submission.

### Android
```bash
bun run build && bunx cap sync android
bunx cap open android        # opens Android Studio
```
In Android Studio: **Build → Generate Signed Bundle → Android App Bundle (AAB)** for Play Store submission.

---

## Required native permissions (already declared)

### iOS — add these keys to `ios/App/App/Info.plist` after `cap add ios`
```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of your fridge, cupboard, and leftovers to scan ingredients.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Choose existing photos of your food to scan ingredients.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save scan results to your photo library.</string>
```

### Android — already handled by `@capacitor/camera` in `AndroidManifest.xml`

---

## How the native app talks to your backend

The bundled app loads a **local static shell** but **all server functions, auth, and AI calls go to `https://thefridgeandcupboard.com`** (configured in `capacitor.config.ts → server.hostname`).

This means:
- ✅ App opens instantly (no white screen)
- ✅ All backend calls work without re-deploying the app
- ✅ Bug fixes to server logic ship instantly without a new store submission
- ⚠️ The device must have internet (app is online-first)

---

## Submission checklist reminder

Before submitting, you still need (covered in Phase 1):
- [x] Privacy Policy live at `/privacy`
- [x] Terms of Service live at `/terms`
- [x] In-app Delete Account flow at `/account`
- [x] Sign in with Apple button on `/auth`
- [ ] Apple Developer account ($99/yr) — register the bundle ID `com.TheFridgeandCupboard.app`
- [ ] Google Play Console account ($25 one-time)
- [ ] Configure Apple OAuth Service ID + private key (.p8) in your backend OAuth settings
- [ ] 5 screenshots per device class (1290×2796 iPhone 6.7", 1080×1920+ Android)
- [ ] 1024×500 Google Play feature graphic
- [ ] App Privacy questionnaire (App Store Connect) + Data Safety form (Play Console)

---

## Updating the app after first publish

Web changes only (most updates):
```bash
bun run build && bunx cap sync
# rebuild in Xcode / Android Studio → submit new version
```

Native code or plugin changes:
```bash
bunx cap sync
# rebuild & resubmit
```
