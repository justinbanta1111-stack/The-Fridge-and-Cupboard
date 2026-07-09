# iOS Build Guide — The Fridge & Cupboard

Complete step-by-step to build the iOS app and submit to the Apple App Store.

**Requires a Mac with Xcode 15+.**

---

## Prerequisites

- **macOS Sonoma (14)** or newer
- **Xcode 15+** — install from Mac App Store or Apple Developer portal
- **CocoaPods** — `sudo gem install cocoapods`
- **Node 20+** and **Bun** (or npm)
- **Apple Developer Program** account ($99/year)

---

## One-time setup (first build only)

```bash
# 1. Pull the repo and install dependencies
bun install

# 2. Build the web bundle
bun run build

# 3. Add the iOS platform (creates /ios folder)
npx cap add ios

# 4. Sync web assets + plugins into the iOS project
npx cap sync

# 5. Generate all icon & splash sizes from resources/
npx capacitor-assets generate \
  --iconBackgroundColor '#0b0b0f' \
  --splashBackgroundColor '#0b0b0f'
```

---

## Open in Xcode

```bash
npx cap open ios
```

This opens `ios/App/App.xcworkspace` in Xcode.

---

## Required Info.plist entries

After `npx cap add ios`, paste these into `ios/App/App/Info.plist` inside the `<dict>` block:

```xml
<key>NSCameraUsageDescription</key>
<string>The Fridge &amp; Cupboard uses the camera to scan the food in your fridge and cupboard so Chef Super J can suggest recipes.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Used to select photos of your fridge or cupboard for ingredient scanning.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Used to save scanned ingredient photos to your library.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Used by the Talk to Chef Super J voice button.</string>
<key>NSUserNotificationUsageDescription</key>
<string>Get gentle reminders to use leftovers before they go bad.</string>
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

---

## Configure signing & capabilities

1. In Xcode, select the **App** target.
2. Go to **Signing & Capabilities** tab.
3. Check **Automatically manage signing**.
4. Select your **Apple Development Team**.
5. Register the bundle ID `com.thefridgeandcupboard.app` in your Apple Developer account if not already done.
6. Click **+ Capability** → add **Push Notifications**.

---

## Build & archive for App Store

1. Set the active scheme to **Any iOS Device (arm64)**.
2. **Product → Archive** (this builds and opens the Organizer).
3. In the Organizer, select the latest archive → **Distribute App**.
4. Choose **App Store Connect** → **Upload**.
5. Follow the prompts (signing, app thinning, etc.).
6. The app uploads to App Store Connect. Go to https://appstoreconnect.apple.com to finish.

---

## After every web update (no resubmission needed)

Because the app loads `https://thefridgeandcupboard.com` at runtime, most web changes appear instantly in the installed app.

You only need to rebuild and resubmit when:
- App icon, splash screen, or name changes
- New native plugin or permission added
- Capacitor version bumped

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `pod install` fails | `cd ios/App && pod install --repo-update` |
| Signing errors | Ensure your Apple ID is added in Xcode → Preferences → Accounts |
| Bundle ID mismatch | Go to https://developer.apple.com/account/resources/identifiers/list and register `com.thefridgeandcupboard.app` |
| Archive button greyed out | Select a real device or "Any iOS Device" in the scheme picker (not a simulator) |
| Icons not showing | Delete `ios/App/App/Assets.xcassets/AppIcon.appiconset` and re-run `npx capacitor-assets generate` |
