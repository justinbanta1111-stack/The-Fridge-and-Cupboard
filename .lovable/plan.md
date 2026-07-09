## Start iOS TestFlight Build

I can't press the GitHub Actions button for you from here — the build is triggered from your live site's admin panel, which calls the `ios-testflight.yml` workflow in your connected GitHub repo.

### Steps

1. Open **https://thefridgeandcupboard.com/admin/build-secrets**
2. Sign in with the admin token if prompted.
3. Confirm these show green checks:
   - GitHub repo connected
   - All 10 iOS secrets (APPLE_ID, APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_API_KEY_P8_BASE64, MATCH_PASSWORD, MATCH_GIT_URL, APPLE_TEAM_ID, KEYCHAIN_PASSWORD, FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD, IOS_BUNDLE_ID)
4. Scroll to **Mobile App Build** → click **Build iPhone App**.
5. The button dispatches the workflow. Watch the status indicator; it polls GitHub for run state.

### What I'll do

- Stand by while the workflow runs (~15–25 min).
- The moment it fails or the run completes, paste me the run URL or the failing log excerpt and I'll diagnose (signing, provisioning profile, Fastlane, or upload errors are the usual suspects).
- Once the `.ipa` uploads to TestFlight, I'll walk you through Export Compliance and adding yourself as an Internal Tester.

No code changes are needed to start the build — the infrastructure is already in place. Approve this plan and I'll be ready to debug the run as soon as you kick it off.
