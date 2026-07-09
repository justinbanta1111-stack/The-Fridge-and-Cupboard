# Android Play Internal CI — Setup Guide

This repo includes `.github/workflows/android-play-internal.yml`, a GitHub Actions
workflow that builds a **signed Android App Bundle (`.aab`)** and uploads it to the
Google Play Console **internal testing** track every time you push a release tag
like `v1.2.3`.

Runs on `ubuntu-latest` with JDK 17 + Gradle, using
[`r0adkll/upload-google-play`](https://github.com/r0adkll/upload-google-play) for the
Play upload — no Fastlane required.

---

## 1. One-time Google / Android setup

### 1a. Generate the upload keystore (keep this safe forever)
```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```
You'll be prompted for a keystore password, key password, and a distinguished name.
**Back this file up** — losing it means you can never update the app again (unless
you use Play App Signing key reset, which is slow and limited).

Base64 encode for GitHub:
```bash
base64 -i upload-keystore.jks | pbcopy
```

### 1b. First manual upload (REQUIRED)
The Play Console will not accept API uploads until the app exists and Play App
Signing is enrolled. One-time only:
1. In Play Console, create the app with package name `com.thefridgeandcupboard.app`.
2. Build a signed `.aab` locally (`cd android && ./gradlew bundleRelease`) and
   upload it manually to the **internal** track.
3. Opt into **Play App Signing** during that first upload (default).

After that, this workflow handles every subsequent release.

### 1c. Play Console service account
1. Play Console → **Setup → API access** → Link a Google Cloud project (or use the
   suggested one) → **Create service account**.
2. In Google Cloud Console, give the new SA a JSON key → download.
3. Back in Play Console → API access → next to the SA, **Grant access** →
   permissions: at minimum **Release to testing tracks** for this app → **Invite user**.
4. Wait ~5 minutes for permissions to propagate.

---

## 2. GitHub repository secrets

Add these under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64 output from step 1a |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password from step 1a |
| `ANDROID_KEY_ALIAS` | `upload` (or your alias) |
| `ANDROID_KEY_PASSWORD` | Key password from step 1a |
| `PLAY_SERVICE_ACCOUNT_JSON` | Full JSON contents of the service account key from step 1c |
| `ANDROID_PACKAGE_NAME` *(optional)* | Override applicationId. Defaults to `com.thefridgeandcupboard.app` |

---

## 3. Repo prerequisites

The workflow expects:
- `android/` directory committed to the repo (already present from `npx cap add android`).
- `npm run build` produces the web bundle that `npx cap sync android` copies in.
- `android/app/build.gradle` exposes `applicationId`, `versionCode`, `versionName`
  in `defaultConfig { ... }` (the Capacitor default).

---

## 4. Triggering a build

**Tag-based (recommended):**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Manual:** GitHub → Actions → **Android Play Internal** → **Run workflow**. You
can override `versionCode` and switch the `track` (`internal`, `alpha`, `beta`,
`production`).

---

## 5. How versioning works

- `versionName` is derived from the tag — `v1.2.3` → `"1.2.3"`.
- `versionCode` defaults to the CI `run_number` so it's strictly increasing —
  Play rejects duplicate codes.
- Both are patched into `android/app/build.gradle` before `bundleRelease`.

---

## 6. After upload

1. Play Console processes the AAB in 1–10 minutes.
2. Internal testers on your list get the build via the Play Store within minutes
   (no review required for the internal track).
3. To promote: Play Console → Testing → Internal → **Promote release** → choose
   alpha/beta/production. Closed/open testing and production require Google review.

---

## 7. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `APK specifies a version code that has already been used` | `versionCode` collision. Re-run with a higher `version_code` input. |
| `The caller does not have permission` | Service account not granted in Play Console, or wait longer (~5 min propagation), or wrong `packageName`. |
| `Package not found: com.thefridgeandcupboard.app` | First upload wasn't done manually (step 1b), or package name typo. |
| `Keystore was tampered with, or password was incorrect` | Wrong `ANDROID_KEYSTORE_PASSWORD` or base64 encoding corrupted the file. Use `base64 -i` (no line wraps issue with `base64` on macOS; on Linux use `base64 -w 0`). |
| `Cannot recover key` | Wrong `ANDROID_KEY_PASSWORD`. |
| `Failed to read key upload from store` | Wrong `ANDROID_KEY_ALIAS`. List with `keytool -list -v -keystore upload-keystore.jks`. |
| Gradle build fails on `bundleRelease` only in CI | Run `cd android && ./gradlew bundleRelease` locally with the same JDK 17 to reproduce. |
| `Changes cannot be sent for review automatically` | Set `changesNotSentForReview: true` on tracks that require manual review (production with first release). |

---

## 8. Security notes

- The keystore is decoded to `$RUNNER_TEMP`, used by Gradle via env vars, and
  deleted in the `Cleanup` step.
- The service account JSON is written with `chmod 600` and deleted after the run.
- All secrets stay in GitHub Actions — none are written to the repo.
- Never commit `*.jks`, `*.keystore`, or the service account JSON. Add to
  `.gitignore` if they land locally.
