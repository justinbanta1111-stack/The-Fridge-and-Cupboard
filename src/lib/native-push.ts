/**
 * Native push notifications placeholder.
 *
 * The web build does not request push permission (per project rules — no
 * spammy notifications). This module exists so the native iOS/Android shell
 * can opt in later without scattering platform checks across the codebase.
 *
 * When ready, install `@capacitor/push-notifications` and implement the
 * three functions below. Until then, every call is a no-op so the existing
 * UI keeps working unchanged.
 *
 * Suggested notification copy (do NOT enable by default — let the user opt in
 * from Settings):
 *   - "You have leftovers that may need to be used."
 *   - "Want dinner ideas from what you already have?"
 *   - "Use today before it goes bad."
 *
 * Apple requires `NSUserNotificationUsageDescription` in `Info.plist`.
 * Android 13+ requires the runtime `POST_NOTIFICATIONS` permission.
 */

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

export async function requestPushPermission(): Promise<PushPermission> {
  return "unsupported";
}

export async function getPushPermission(): Promise<PushPermission> {
  return "unsupported";
}

/** Returns the APNs / FCM token once registered. */
export async function getPushToken(): Promise<string | null> {
  return null;
}
