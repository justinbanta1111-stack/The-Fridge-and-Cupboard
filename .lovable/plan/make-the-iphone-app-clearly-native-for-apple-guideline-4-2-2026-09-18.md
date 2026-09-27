# Make the iPhone app clearly native for Apple Guideline 4.2

## Goal
Keep the current design and features intact while changing the iOS package from a live website wrapper into an installed app with visible, useful iPhone capabilities.

## Changes
1. **Package the experience on the phone**
   - Remove the iOS live-site launch URL.
   - Build and copy the real app shell and assets into the iPhone package.
   - Add release checks that reject any build still configured to open the website or missing its local start page.

2. **Finish the existing native integrations**
   - Keep the current camera capture and “Use this photo / Retake” flow.
   - Route recipe and shopping-list sharing through the iOS share sheet.
   - Keep expiry reminders as on-device notifications.
   - Preserve haptics, microphone/speech, offline status, device storage, sign-in, subscriptions, scans, recipes, saved photos, and lists.
   - Repair the device resume/storage setup so listeners are not duplicated.

3. **Make local and automated iOS builds identical**
   - Use one native packaging command for both the local TestFlight script and the automated iOS workflow.
   - Keep the existing static-link and launch-crash guards.
   - Do not change Android.

4. **Update Apple review guidance**
   - Make the review notes match the actual packaged build and provide a short path to demonstrate camera, sharing, notifications, haptics, offline data, and cooking resume.

## Verification
- Run the production app build and native-shell packaging.
- Confirm the generated iOS configuration contains no remote launch URL.
- Confirm the packaged start page and assets exist and reference local resources.
- Run focused checks for native camera, sharing, notifications, storage/resume, and iOS plugin registration.
- Check current build diagnostics before marking the build source ready.

## Scope
No visual redesign, no feature removal, no voice/conversation changes, no pricing changes, no Android changes, and no App Store submission.
