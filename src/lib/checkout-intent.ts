export type CheckoutPriceId =
  | "standard_monthly"
  | "premium_monthly"
  | "standard_annual"
  | "premium_annual";

const PENDING_CHECKOUT_KEY = "tfc.pendingCheckoutPriceId";
const LEGACY_PENDING_CHECKOUT_KEY = "pendingCheckoutPriceId";

const VALID_PRICE_IDS = new Set<CheckoutPriceId>([
  "standard_monthly",
  "premium_monthly",
  "standard_annual",
  "premium_annual",
]);

function isCheckoutPriceId(value: string | null): value is CheckoutPriceId {
  return Boolean(value && VALID_PRICE_IDS.has(value as CheckoutPriceId));
}

export function closeInstallModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tfc:close-install-modal"));
}

export function storePendingCheckout(priceId: CheckoutPriceId) {
  if (typeof window === "undefined") return;
  closeInstallModal();
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_KEY, priceId);
    sessionStorage.setItem(LEGACY_PENDING_CHECKOUT_KEY, priceId);
  } catch {
    // ignore storage failures
  }
  try {
    localStorage.setItem(PENDING_CHECKOUT_KEY, priceId);
  } catch {
    // ignore storage failures
  }
}

export function consumePendingCheckout(): CheckoutPriceId | null {
  if (typeof window === "undefined") return null;
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(PENDING_CHECKOUT_KEY) || sessionStorage.getItem(LEGACY_PENDING_CHECKOUT_KEY);
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    sessionStorage.removeItem(LEGACY_PENDING_CHECKOUT_KEY);
  } catch {
    // ignore storage failures
  }
  try {
    stored = stored || localStorage.getItem(PENDING_CHECKOUT_KEY);
    localStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    // ignore storage failures
  }
  return isCheckoutPriceId(stored) ? stored : null;
}

export function safeLocalRedirect(value: string | null, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}