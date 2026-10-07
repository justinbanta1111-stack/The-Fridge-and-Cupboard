import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type HostedCheckoutResult = { url: string } | { error: string };

type PortalSessionResult = { url: string } | { error: string };

// Allowlist of origins permitted for Stripe return_url / billing portal return_url.
// Anything else is rejected to prevent open-redirect / post-payment phishing.
const ALLOWED_RETURN_ORIGINS = new Set([
  "https://thefridgeandcupboard.com",
  "https://www.thefridgeandcupboard.com",
  "https://thefridgeandcupboard.lovable.app",
]);

function validateReturnUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid returnUrl");
  }
  if (ALLOWED_RETURN_ORIGINS.has(parsed.origin)) return url;
  // Allow Lovable preview subdomains and localhost during development.
  if (
    parsed.protocol === "https:" &&
    (parsed.hostname.endsWith(".lovable.app") || parsed.hostname.endsWith(".lovableproject.com"))
  ) {
    return url;
  }
  if (
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
  ) {
    return url;
  }
  throw new Error("Invalid returnUrl");
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

/**
 * Server-side trial eligibility: a customer gets the 3-day trial only if
 * Stripe has never seen a subscription for them. Also blocks a second
 * subscription while one is already live. Browser state is never trusted.
 */
async function trialPolicy(
  stripe: ReturnType<typeof createStripeClient>,
  customerId: string,
): Promise<{ blocked: boolean; trialDays?: number }> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  if (subs.data.some((s) => ["active", "trialing", "past_due"].includes(s.status))) {
    return { blocked: true };
  }
  const hadAny = subs.data.some((s) => s.status !== "incomplete_expired");
  return { blocked: false, trialDays: hadAny ? undefined : 3 };
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    quantity?: number;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    validateReturnUrl(data.returnUrl);
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      // Trust only server-verified identity from the auth middleware.
      const userId = context.userId;
      const customerEmail =
        typeof context.claims?.email === "string" ? (context.claims.email as string) : undefined;

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: customerEmail,
        userId,
      });

      const policy = isRecurring ? await trialPolicy(stripe, customerId) : { blocked: false };
      if (policy.blocked) {
        return { error: "You already have an active plan. Manage it from your Account page." };
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: { userId },
        ...(isRecurring && {
          // A payment method is always collected, even for the free trial;
          // the paid plan starts automatically when the trial ends.
          payment_method_collection: "always",
          subscription_data: {
            metadata: { userId },
            ...(policy.trialDays && { trial_period_days: policy.trialDays }),
          },
        }),
      } as any);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Hosted (redirect) checkout — universal fallback for browsers that block
 * Stripe's embedded iframe (Brave Shields, strict ITP, in-app webviews,
 * cross-site cookies disabled). Returns the Stripe-hosted session URL so
 * the client can window.location.assign() to it.
 */
export const createHostedCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    quantity?: number;
    successUrl: string;
    cancelUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    validateReturnUrl(data.successUrl);
    validateReturnUrl(data.cancelUrl);
    return data;
  })
  .handler(async ({ data, context }): Promise<HostedCheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      const userId = context.userId;
      const customerEmail =
        typeof context.claims?.email === "string" ? (context.claims.email as string) : undefined;
      const customerId = await resolveOrCreateCustomer(stripe, { email: customerEmail, userId });

      const policy = isRecurring ? await trialPolicy(stripe, customerId) : { blocked: false };
      if (policy.blocked) {
        return { error: "You already have an active plan. Manage it from your Account page." };
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "hosted",
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: { userId },
        ...(isRecurring && {
          // A payment method is always collected, even for the free trial;
          // the paid plan starts automatically when the trial ends.
          payment_method_collection: "always",
          subscription_data: {
            metadata: { userId },
            ...(policy.trialDays && { trial_period_days: policy.trialDays }),
          },
        }),
      } as any);

      if (!session.url) throw new Error("Stripe did not return a hosted URL");
      return { url: session.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });



export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => {
    if (data.returnUrl) validateReturnUrl(data.returnUrl);
    return data;
  })
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError || !sub?.stripe_customer_id) throw new Error("No subscription found");

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id as string,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
