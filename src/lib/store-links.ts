/**
 * Official app store listings.
 *
 * While the apps are still in review these stay empty, and "Add App" shows the
 * Add-to-Home-Screen instructions. As soon as a listing is live, drop the URL
 * in here and the button sends people straight to the right store for their
 * device — no other change needed.
 */

// Apple has not published the listing yet, so its numeric product-page ID is
// not public. This opens the App Store directly to the app search until Apple
// makes the final product URL available.
export const APP_STORE_URL = "https://apps.apple.com/us/search?term=The%20Fridge%20%26%20Cupboard" as string;
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.thefridgeandcupboard.app" as string;

export type StorePlatform = "ios" | "android" | "unknown";

export function detectStorePlatform(): StorePlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "unknown";
}

/** The store listing for this device, or null while the stores aren't live. */
export function storeListingUrl(platform: StorePlatform = detectStorePlatform()): string | null {
  if (platform === "ios") return APP_STORE_URL || null;
  if (platform === "android") return PLAY_STORE_URL || null;
  return null;
}
