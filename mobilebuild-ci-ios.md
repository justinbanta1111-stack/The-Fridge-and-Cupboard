# iOS TestFlight CI — Setup Guide

This repo includes `.github/workflows/ios-testflight.yml`, a GitHub Actions workflow
that builds a **signed iOS `.ipa`** and uploads it to **TestFlight (internal testing)**
every time you push a release tag like `v1.2.3`.

It runs on `macos-14` with Xcode 15.4 and uses `xcodebuild` + `xcrun altool` — no
Fastlane required.

---

## 1. One-time Apple setup

### 1a. Apple Distribution certificate (`.p12`)
1. In Xcode → Settings → Accounts → your team → **Manage Certificates** → `+` → **Apple Distribution**.
2. In **Keychain Access**, find the new "Apple Distribution: <Your Team>" cert,
   expand it, right-click the cert **plus its private key** → **Export 2 items…** → save as `dist.p12` and set a password.
3. Base64 encode it for GitHub:
   ```bash
   base64 -i dist.p12 | pbcopy
   ```

### 1b. App Store provisioning profile (`.mobileprovision`)
1. Go to [developer.apple.com](https://developer.apple.com) → Certificates, IDs & Profiles → **Profiles** → `+`.
2. Type: **App Store** (iOS). App ID: `com.thefridgeandcupboard.app`. Cert: the Distribution cert from step 1a.
3. Download the `.mobileprovision`, then:
   ```bash
   base64 -i com_thefridgeandcupboard_app.mobileprovision | pbcopy
   ```

### 1c. App Store Connect API key
1. [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → **Keys** (Integrations tab) → `+`.
2. Name it `Lovable CI`, access: **App Manager**.
3. Download the `.p8` file **once** (you cannot re-download it). Note the **Key ID** and **Issuer ID**.

---

## 2. GitHub repository secrets

Add these under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID from step 1c (e.g. `ABC123XYZ9`) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID UUID from step 1c |
| `APP_STORE_CONNECT_API_KEY_P8` | Full contents of `AuthKey_XXXX.p8` (paste including `-----BEGIN PRIVATE KEY-----` lines) |
| `IOS_DIST_CERT_P12_BASE64` | Base64 output from step 1a |
| `IOS_DIST_CERT_PASSWORD` | Password you set when exporting the `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64 output from step 1b |
| `IOS_KEYCHAIN_PASSWORD` | Any strong random string (used only inside the CI runner's temp keychain) |
| `IOS_TEAM_ID` | 10-character Apple Developer Team ID (Membership page) |
| `IOS_BUNDLE_ID` *(optional)* | Override bundle id. Defaults to `com.thefridgeandcupboard.app` |

---

## 3. Repo prerequisites

The workflow expects:
- `ios/` directory committed to the repo (run `npx cap add ios` locally once, commit).
- `npm run build` produces the web bundle that `npx cap sync ios` copies into the iOS app.
- iOS scheme `App` in `ios/App/App.xcworkspace` (the Capacitor default).

If you change the bundle id, update it in:
- Xcode → App target → Signing & Capabilities
- `capacitor.config.ts`
- `IOS_BUNDLE_ID` GitHub secret (or the default in the workflow)
- The provisioning profile (must match)

---

## 4. Triggering a build

**Tag-based (recommended):**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Manual:** GitHub → Actions → **iOS TestFlight** → **Run workflow**. You can pass a custom build number.

---

## 5. How versioning works

- `CFBundleShortVersionString` (marketing version) is derived from the tag — `v1.2.3` → `1.2.3`.
- `CFBundleVersion` (build number) defaults to the CI `run_number` so it's strictly increasing — TestFlight rejects duplicates.
- Both are written into `ios/App/App/Info.plist` before archiving.

---

## 6. After upload

1. App Store Connect takes 5–20 minutes to process the build.
2. You'll get an email when it's ready, or `Invalid Binary` if something failed.
3. In **TestFlight → Internal Testing**, add the build to your internal group — testers get it instantly via the TestFlight app.
4. External testers require an Apple beta review (usually <24h).

---

## 7. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `No signing certificate "iOS Distribution" found` | `.p12` didn't include the private key. Re-export selecting **both** cert and key. |
| `Provisioning profile doesn't match bundle identifier` | Profile bundle id ≠ `IOS_BUNDLE_ID`. Regenerate profile or fix the secret. |
| `The bundle version must be higher than the previously uploaded version` | TestFlight saw this build number before. Re-run with a higher `build_number` input, or push a new tag. |
| `Unable to authenticate with App Store Connect` | API key revoked, wrong Issuer ID, or `.p8` contents truncated (must include BEGIN/END lines and trailing newline). |
| `xcodebuild: error: Unable to find a destination` | Xcode version mismatch — bump `sudo xcode-select -s` line to a Xcode present on `macos-14`. |
| `pod install` fails on M-series mismatches | Delete `ios/App/Podfile.lock` and re-tag, or pin CocoaPods in the workflow. |

---

## 8. Security notes

- The signing keychain is created in `$RUNNER_TEMP`, unlocked only for the job, and deleted in the `Cleanup` step.
- The `.p8` API key is written with `chmod 600` and deleted after the run.
- All secrets stay in GitHub Actions — none are written to the repo.
- Never commit `.p12`, `.mobileprovision`, or `.p8` files. Add to `.gitignore` if they ever land locally.
