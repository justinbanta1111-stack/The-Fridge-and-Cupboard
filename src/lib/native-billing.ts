/**
 * Native In-App Purchase bridge (Apple / Google).
 *
 * The web build uses Stripe Checkout (`src/utils/payments.functions.ts`).
 * Apple and Google REQUIRE their own billing for digital subscriptions sold
 * inside the native apps, so every purchase started inside the Capacitor
 * shell goes through this module instead of Stripe.
 *
 * Implementation notes
 * --------------------
 * The store SDK is loaded lazily and defensively: if the RevenueCat plugin
 * (`@revenuecat/purchases-capacitor`) is installed in the native build, we use
 * it. If it is not present (web build, or a native build made before the
 * plugin was added) every call resolves/throws with a clear, user-readable
 * message instead of crashing — Apple rejects apps that crash on a tap.
 *
 * To finish wiring real purchases:
 *   1. `bun add @revenuecat/purchases-capacitor` and `npx cap sync ios`
 *   2. Create the two auto-renewing subscriptions in App Store Connect using
 *      the product IDs below and attach them to a RevenueCat offering.
 *   3. Set `VITE_REVENUECAT_IOS_KEY` (and `VITE_REVENUECAT_ANDROID_KEY`).
 * No other file has to change.
 */

import { isIosApp, isNativeApp, nativePlatform } from "@/lib/native-runtime";

export type NativeProductId =
  | "pro.standard.monthly" // $3.99 / month — App Store Connect ID
  | "pro.premium.monthly"; // $5.99 / month — App Store Connect ID

export type NativeEntitlement = {
  active: boolean;
  productId: NativeProductId | null;
  expiresAt: string | null; // ISO timestamp from the receipt
};

export const NATIVE_PRODUCTS: Record<
  NativeProductId,
  { name: string; price: string; period: string; trial: string }
> = {
  "pro.standard.monthly": {
    name: "Standard",
    price: "$3.99",
    period: "per month",
    trial: "3-day free trial, then $3.99 per month",
  },
  "pro.premium.monthly": {
    name: "Premium",
    price: "$5.99",
    period: "per month",
    trial: "3-day free trial, then $5.99 per month",
  },
};

const INACTIVE: NativeEntitlement = { active: false, productId: null, expiresAt: null };

export const STORE_UNAVAILABLE =
  "The App Store isn't available right now. Please check your connection and try again.";

/** RevenueCat public iOS SDK key (publishable, safe to ship in the app). */
export const REVENUECAT_IOS_PUBLIC_KEY = "appl_pYJSbZdYdRRtLJJpOzJQnoylfkF";

type PurchasesModule = any;

let sdkPromise: Promise<PurchasesModule | null> | null = null;

/** Store calls can stall (no network, StoreKit not answering). Never wait forever. */
export class StoreTimeoutError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "StoreTimeoutError";
  }
}
function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new StoreTimeoutError(msg)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}
function logStore(step: string, detail?: unknown) {
  try { console.warn(`[native-billing] ${step}`, detail ?? ""); } catch { /* ignore */ }
}

async function loadSdk(): Promise<PurchasesModule | null> {
  if (!isNativeApp()) return null;
  if (!sdkPromise) {
    sdkPromise = (async () => {
      try {
        // Must be a literal import so the plugin is bundled into the app.
        const mod: any = await import("@revenuecat/purchases-capacitor");
        const Purchases = mod?.Purchases ?? mod?.default?.Purchases;
        if (!Purchases) return null;
        const apiKey = isIosApp()
          ? (import.meta.env["VITE_REVENUECAT_IOS_KEY"] || REVENUECAT_IOS_PUBLIC_KEY)
          : import.meta.env["VITE_REVENUECAT_ANDROID_KEY"];
        if (!apiKey) return null;
        await withTimeout(Purchases.configure({ apiKey }), 10000, STORE_UNAVAILABLE);
        // Linking the account must never block the purchase sheet.
        void (async () => {
          try {
            const { supabase } = await import("@/integrations/supabase/client");
            const { data } = await withTimeout(supabase.auth.getUser(), 5000, "auth timeout");
            if (data.user?.id) await withTimeout(Purchases.logIn({ appUserID: data.user.id }), 8000, "login timeout");
          } catch (e) {
            logStore("logIn skipped", e);
          }
        })();
        return Purchases;
      } catch (e) {
        logStore("configure failed", e);
        sdkPromise = null; // allow a retry on the next tap
        return null;
      }
    })();
  }
  return sdkPromise;
}

/** True when real store billing can actually run on this device. */
export async function isNativeBillingReady(): Promise<boolean> {
  return (await loadSdk()) !== null;
}

function toEntitlement(info: any): NativeEntitlement {
  const ci = info?.customerInfo ?? info ?? {};
  const active: any[] = Object.values(ci?.entitlements?.active ?? {});
  const subs: string[] = ci?.activeSubscriptions ?? [];
  const ids = [...active.map((e) => String(e?.productIdentifier ?? "")), ...subs];
  // Premium wins if both are somehow active.
  const productId: NativeProductId | null = ids.some((i) => i.startsWith("pro.premium.monthly"))
    ? "pro.premium.monthly"
    : ids.some((i) => i.startsWith("pro.standard.monthly"))
      ? "pro.standard.monthly"
      : null;
  if (!productId) return INACTIVE;
  const match = active.find((e) => String(e?.productIdentifier ?? "").startsWith(productId));
  return { active: true, productId, expiresAt: match?.expirationDate ?? null };
}

/** Thrown when the shopper closes Apple's sheet — not an error to show. */
export class PurchaseCancelledError extends Error {
  constructor() {
    super("Purchase cancelled");
    this.name = "PurchaseCancelledError";
  }
}

function isCancel(e: any): boolean {
  return Boolean(
    e?.userCancelled || e?.code === "1" || e?.code === 1 ||
      /cancel/i.test(String(e?.code ?? "")) || /cancel/i.test(String(e?.message ?? "")),
  );
}

/** Launch the platform purchase sheet for the given subscription. */
export async function startNativePurchase(productId: NativeProductId): Promise<NativeEntitlement> {
  const Purchases = await loadSdk();
  if (!Purchases) throw new Error(STORE_UNAVAILABLE);
  let products: any[] = [];
  try {
    const res = await withTimeout<any>(
      Purchases.getProducts({ productIdentifiers: [productId] }),
      15000,
      "The App Store didn't respond. Please check your connection and try again.",
    );
    products = res?.products ?? [];
  } catch (e) {
    logStore("getProducts failed", e);
    throw e instanceof StoreTimeoutError ? e : new Error(STORE_UNAVAILABLE);
  }
  logStore("getProducts", products.map((p: any) => p?.identifier));
  const product = products.find((p: any) => p?.identifier === productId) ?? products[0];
  if (!product) throw new Error("That subscription isn't available on this device right now.");
  try {
    // Apple's sheet waits on the shopper, so allow a long window, but never forever.
    const result = await withTimeout<any>(
      Purchases.purchaseStoreProduct({ product }),
      180000,
      "The purchase didn't finish. If you were charged it will appear after Restore Purchases.",
    );
    const ent = toEntitlement(result);
    notifyEntitlementChanged();
    return ent;
  } catch (e) {
    logStore("purchase failed", e);
    if (isCancel(e)) throw new PurchaseCancelledError();
    if (e instanceof StoreTimeoutError) throw e;
    throw new Error("The purchase couldn't be completed. Nothing was charged.");
  }
}

/** Apple + Google require a visible "Restore Purchases" entry in the UI. */
export async function restoreNativePurchases(): Promise<NativeEntitlement> {
  const Purchases = await loadSdk();
  if (!Purchases) {
    // Not an error state for the user: nothing to restore on this device.
    if (!isNativeApp()) return INACTIVE;
    throw new Error(STORE_UNAVAILABLE);
  }
  const result = await withTimeout<any>(
    Purchases.restorePurchases(),
    30000,
    "The App Store didn't respond. Please try Restore Purchases again.",
  );
  notifyEntitlementChanged();
  return toEntitlement(result);
}

/** Read the cached entitlement from the billing SDK (no purchase sheet). */
export async function getNativeEntitlement(): Promise<NativeEntitlement> {
  const Purchases = await loadSdk();
  if (!Purchases) return INACTIVE;
  try {
    const info = await withTimeout<any>(Purchases.getCustomerInfo(), 10000, "timeout");
    return toEntitlement(info);
  } catch {
    return INACTIVE;
  }
}

/** Deep link to the platform subscription management screen. */
export function nativeManageSubscriptionsUrl(): string {
  return nativePlatform() === "android"
    ? "https://play.google.com/store/account/subscriptions"
    : "https://apps.apple.com/account/subscriptions";
}

/**
 * Apple/Google product ID ⇄ internal price lookup key used by the Stripe
 * webhook. Keep these in sync so the subscription gate works the same on
 * web and native.
 */
export const NATIVE_TO_INTERNAL: Record<NativeProductId, "pro_standard_monthly" | "pro_premium_monthly"> = {
  "pro.standard.monthly": "pro_standard_monthly",
  "pro.premium.monthly": "pro_premium_monthly",
};

/** Map a Stripe price lookup key used across the web UI to a store product. */
export function nativeProductForPriceId(priceId: string): NativeProductId {
  return /premium/i.test(priceId) ? "pro.premium.monthly" : "pro.standard.monthly";
}

/** Lets the subscription hook refresh right after a purchase or restore. */
export const ENTITLEMENT_EVENT = "native-entitlement-changed";
function notifyEntitlementChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ENTITLEMENT_EVENT));
}
