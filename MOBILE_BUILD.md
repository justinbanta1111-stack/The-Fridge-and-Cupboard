# Native iOS & Android Builds — The Fridge & Cupboard

The app is wrapped with **Capacitor**. The native shell loads
`https://thefridgeandcupboard.com`, so all branding, buttons, subscriptions,
voice button, fridge animation, and login work exactly like the live site.
Web updates ship instantly without resubmitting to the stores.

- **App ID / Bundle ID:** `com.thefridgeandcupboard.app`
- **App name:** The Fridge & Cupboard
- **Source URL:** https://thefridgeandcupboard.com
- **Icon / Splash source:** `resources/icon.png`, `resources/splash.png`
  (generated from the existing brand logo at `public/icon-512.png`)
- **Native permissions wired in:** Camera (Scan Fridge / Scan Cupboard),
  Push Notifications

## Prerequisites (on your Mac / PC)

- macOS with **Xcode 15+** (for iOS / App Store)
- **Android Studio** with SDK 34+ (for Google Play)
- Node 18+ and **bun** or npm
- An Apple Developer account ($99/yr) and Google Play Console account ($25 one-time)

## One-time setup

```bash
# 1. Pull this repo locally and install
bun install

# 2. Build the web bundle (only used as a fallback shell; the app loads the live URL)
bun run build

# 3. Add the native platforms
npx cap add ios
npx cap add android

# 4. Generate all icon + splash sizes from resources/icon.png & resources/splash.png
npx capacitor-assets generate --iconBackgroundColor '#0b0b0f' --splashBackgroundColor '#0b0b0f'

# 5. Sync web + plugins into the native projects
npx cap sync
```

## Native permission strings

### iOS — add to `ios/App/App/Info.plist`

```xml
<key>NSCameraUsageDescription</key>
<string>The Fridge &amp; Cupboard uses the camera to scan the food in your fridge and cupboard so Chef Super J can suggest recipes.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Used to select photos of your fridge or cupboard for ingredient scanning.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Used to save scanned ingredient photos to your library.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Used by the Talk to Chef Super J voice button.</string>
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

### Android — already added automatically by the plugins

`@capacitor/camera` and `@capacitor/push-notifications` inject the required
`CAMERA`, `READ_MEDIA_IMAGES`, and `POST_NOTIFICATIONS` permissions into
`android/app/src/main/AndroidManifest.xml` on `cap sync`. Re-run `npx cap sync`
after every plugin change.

## Open the native projects

```bash
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

## Build for the stores

### iOS — App Store

1. In Xcode, select the **App** target → Signing & Capabilities → your Apple Team.
2. Bump the Version + Build number.
3. Enable the **Push Notifications** capability.
4. Product → Archive → Distribute App → App Store Connect.

### Android — Google Play

1. In Android Studio: Build → Generate Signed App Bundle / APK → **Android App Bundle (.aab)**.
2. Create / select your upload keystore.
3. Upload the `.aab` to Play Console → Production (or Internal Testing first).

## Updating the app

Because the shell loads the live URL, **any change you publish on Lovable
appears immediately in the installed app** — no resubmission needed. You only
need to rebuild and resubmit when you:

- change the app icon, splash, name, or bundle ID
- add a new native plugin or permission
- bump Capacitor versions

---
*GitHub force-sync triggered: 2026-06-16 10:15 UTC — repository: The-Fridge-and-Cupboard | full codebase push requested*
