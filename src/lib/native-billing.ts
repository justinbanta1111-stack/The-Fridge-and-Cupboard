/**
 * Native In-App Purchase placeholder.
 *
 * The web build uses Stripe Checkout (see `src/utils/payments.functions.ts`).
 * Apple and Google REQUIRE their own billing for digital subscriptions sold
 * inside the native iOS / Android apps — Stripe is not allowed there.
 *
 * This module is a typed placeholder so the rest of the app can already call
 * `startNativePurchase()` / `restoreNativePurchases()` / `getNativeEntitlement()`
 * from the native build. The functions intentionally throw so we never
 * silently grant entitlements before real billing is wired up.
 *
 * When you are ready to ship native billing, install one of:
 *   - `@revenuecat/purchases-capacitor`  (recommended — unifies iOS + Android)
 *   - `@capacitor-community/in-app-purchases`
 *
 * Then implement the three functions below. Keep the same signatures so the
 * UI (Pricing page, Restore button, subscription gate) does not have to change.
 *
 * IMPORTANT: keep the existing Stripe flow working on the web build. Detect
 * the native runtime with `Capacitor.isNativePlatform()` and only call these
 * functions when running inside the iOS/Android shell.
 */

export type NativeProductId =
  | "pro.standard.monthly" // $3.99 / month — App Store Connect ID
  | "pro.premium.monthly"; // $5.99 / month — App Store Connect ID

export type NativeEntitlement = {
  active: boolean;
  productId: NativeProductId | null;
  expiresAt: string | null; // ISO timestamp from the receipt
};

const NOT_WIRED =
  "Native billing is not wired up yet. Install @revenuecat/purchases-capacitor (or @capacitor-community/in-app-purchases), then implement src/lib/native-billing.ts. Web build continues to use Stripe.";

/** Launch the platform purchase sheet for the given subscription. */
export async function startNativePurchase(_productId: NativeProductId): Promise<NativeEntitlement> {
  throw new Error(NOT_WIRED);
}

/** Apple + Google require a visible "Restore Purchases" entry in the UI. */
export async function restoreNativePurchases(): Promise<NativeEntitlement> {
  throw new Error(NOT_WIRED);
}

/** Read the cached entitlement from the billing SDK (no network round-trip). */
export async function getNativeEntitlement(): Promise<NativeEntitlement> {
  return { active: false, productId: null, expiresAt: null };
}

/**
 * Apple/Google product ID ⇄ internal price lookup key used by the Stripe
 * webhook (`stripe-subscriptions` knowledge). Keep these in sync so the
 * subscription gate works the same on web and native.
 */
export const NATIVE_TO_INTERNAL: Record<NativeProductId, "pro_standard_monthly" | "pro_premium_monthly"> = {
  "pro.standard.monthly": "pro_standard_monthly",
  "pro.premium.monthly": "pro_premium_monthly",
};
