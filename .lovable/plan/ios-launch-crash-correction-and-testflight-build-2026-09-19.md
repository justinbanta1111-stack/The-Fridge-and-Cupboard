# iOS launch-crash correction and TestFlight build

## Scope
- Preserve the current website, design, Android behavior, voice conversation, scanning, accounts, subscriptions, and photo flow.
- Change only verified iPhone startup risks and release safeguards.

## Changes
1. Remove native work from the app activation callback so launch and foreground restoration cannot enter a device-specific audio-route notification loop before the first screen. Keep audio activation owned by the existing voice flow when it actually speaks or listens.
2. Make the installed start page deterministic during server render and hydration, eliminating the confirmed random/date-dependent first-screen mismatch.
3. Harden device-backed state restoration: validate restored values, quarantine malformed saved values, and prevent an older installation’s state from destabilizing an updated app.
4. Strengthen release checks for exact Capacitor/plugin version alignment, one dependency source, required local assets, valid property lists/storyboards, and exported-package linkage.
5. Validate the packaged app at `/` and `/index.html`, online and offline, and test both clean storage and intentionally corrupted update-state scenarios.
6. Push only the iPhone/release files, create one signed build with a new build number, and monitor the TestFlight upload result.

## Technical details
- iOS remains CocoaPods-only with statically linked Capacitor.
- Android-only speech recognition and unused push code remain excluded from the iOS archive.
- No remote `server.url` will be introduced.
- The greeting remains exactly “Welcome to The Fridge & Cupboard.” once per session, followed by listening.
