/**
 * Who is allowed to sell inside the app.
 *
 * Apple (Guideline 3.1.1) and Google require their own in-app purchase for
 * digital subscriptions sold inside the installed app, and they reject apps
 * that show a purchase button which cannot complete a purchase.
 *
 * So the rule is simple:
 *   • Website  → normal Stripe checkout, unchanged.
 *   • Installed app → only show plans when store billing is actually wired
 *     (a RevenueCat key is present). Until then the app shows no prices, no
 *     purchase buttons and no outside payment links, and every feature is
 *     open so nothing in the app is a dead end.
 */
import { isIosApp, isNativeApp } from "@/lib/native-runtime";

/** True when store billing keys are configured for this build. */
export function storeBillingConfigured(): boolean {
  const env = import.meta.env as Record<string, string | undefined>;
  const key = isIosApp() ? env["VITE_REVENUECAT_IOS_KEY"] : env["VITE_REVENUECAT_ANDROID_KEY"];
  return Boolean(key);
}

/** True when plans/prices/purchase buttons may be shown on this device. */
export function canSellHere(): boolean {
  if (!isNativeApp()) return true;
  return storeBillingConfigured();
}

/**
 * True when the installed app cannot sell, so paid features are simply open
 * to everyone there instead of showing locks with no way to unlock them.
 */
export function everythingUnlockedHere(): boolean {
  return isNativeApp() && !storeBillingConfigured();
}
