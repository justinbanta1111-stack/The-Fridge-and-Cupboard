# Eliminate intermittent audio screeching

## Scope
Harden only the existing audio lifecycle. Preserve the refrigerator animation and timing, automatic hands-free loop, background music, custom ElevenLabs voice, and all UI.

## Changes
- Make voice playback generation-based and atomic so stale async greeting/reply work cannot seize or restart the singleton audio element.
- Remove the overlapping greeting-start race between automatic startup and gesture fallback while preserving the existing 1-second refrigerator-aligned start.
- Keep the microphone fully disconnected from all speaker destinations; suspend barge-in capture where mobile audio routing could create feedback, then resume normal recognition after speech.
- Harden ambient music teardown so old scheduled sources are silenced immediately, disconnected, and cannot overlap a replacement engine.
- Add conservative output gain/limiting and lifecycle cleanup for navigation, backgrounding, auth rerenders, and unmounts.

## Verification
- Run targeted audio lifecycle checks and confirm the app build remains clean.
- Exercise repeated reloads, navigation/remount behavior, and mobile iPhone/Android emulation; verify one greeting source, one music engine, no simultaneous mic-to-output path, and automatic listening resumes after playback.
