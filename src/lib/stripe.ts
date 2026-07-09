import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Stripe payments are not configured for this build. Complete Stripe go-live in your Lovable project to enable production checkout.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string).catch((err) => {
      // Brave Shields or other ad/tracker blockers can prevent js.stripe.com
      // from loading. Surface a clear message so callers can recover.
      console.error("Stripe.js failed to load (likely blocked by shields/ad-blocker):", err);
      return null;
    });
  }
  return stripePromise;
}

export async function isStripeAvailable(): Promise<boolean> {
  try {
    const s = await getStripe();
    return s !== null;
  } catch {
    return false;
  }
}


export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}
