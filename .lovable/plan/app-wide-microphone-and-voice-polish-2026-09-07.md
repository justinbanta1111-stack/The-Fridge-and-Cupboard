# App-wide microphone and voice polish

## Goal
Make Chef Super J continuously available from app opening through scanning, recipe selection, and cooking, with one warm voice, steady pacing, reliable interruption handling, and no competing background audio.

## Changes
1. **Unify the voice session**
   - Keep one global hands-free listener active across page changes instead of creating competing microphone sessions.
   - Start listening as early as the device allows; on iPhone/browser installs, use the first required permission gesture without dropping the user's first spoken turn.
   - Re-arm immediately after every reply, recognition end, recoverable error, and page transition with bounded restart timing.

2. **Make speech and interruption consistent**
   - Lock all assistant output to the existing warm male Chef Super J voice and one slightly slow playback rate.
   - Add barge-in monitoring while Chef is speaking: stop speech at detected user speech, acknowledge with “Oh, pardon me. Yes, go ahead.”, then listen.
   - Ensure only one assistant audio source can play at a time and prevent the microphone from transcribing Chef's own output.

3. **Preserve cooking progress**
   - Keep cooking mode listening between every step and after every answer.
   - Persist the current recipe step while the walkthrough is open and restore the exact step after questions or interruptions.
   - Read one step at a time, pause for the user, and support next, repeat, previous, timers, and free-form help without resetting progress.

4. **Remove competing sounds**
   - Disable and stop background music and kitchen ambience everywhere.
   - Keep only intentional functional alerts where they do not interfere with listening.

5. **Verify the complete journey**
   - Check app opening, scan entry, recipe selection, cooking steps, next/repeat/question flows, mute behavior, and interruption recovery.
   - Run phone-sized iPhone and Android browser checks plus installed-app display-mode checks, and verify the app has no build or runtime errors.

## Technical details
- Reuse the existing ElevenLabs-backed speech output and mobile WAV transcription path; keep credentials server-side.
- Centralize voice lifecycle events and remove overlapping recognizers rather than adding another microphone implementation.
- Respect platform permission rules: native installs may request at startup; Safari/browser installs cannot legally activate a microphone before permission/user interaction, so the app will arm immediately and complete activation at the earliest permitted interaction.
- Browser simulation can validate lifecycle, state, layout, routing, and mocked recognition/audio timing. Final physical-device acoustic latency and echo cancellation still require a real iPhone and Android handset build.