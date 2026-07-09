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

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: { userId },
        ...(isRecurring && {
          subscription_data: {
            metadata: { userId },
            trial_period_days: 3,
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
          subscription_data: {
            metadata: { userId },
            trial_period_days: 3,
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

type StartTrialResult =
  | { status: "started" | "already_active"; subscriptionId?: string }
  | { error: string };

/**
 * Start a 3-day free trial WITHOUT collecting a card.
 * Creates a Stripe subscription with trial_period_days=3 and
 * trial_settings.end_behavior.missing_payment_method=cancel so the
 * subscription auto-cancels at trial end if the user hasn't added a card.
 */
export const startFreeTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<StartTrialResult> => {
    const { supabase, userId } = context;
    const priceLookupKey = data.priceId || "premium_monthly";
    if (!/^[a-zA-Z0-9_-]+$/.test(priceLookupKey)) {
      return { error: "Invalid priceId" };
    }

    try {
      // Block duplicate trials / active subscriptions.
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id, status, current_period_end")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (
        existing &&
        ["trialing", "active", "past_due"].includes(existing.status as string)
      ) {
        return {
          status: "already_active",
          subscriptionId: existing.stripe_subscription_id as string | undefined,
        };
      }

      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [priceLookupKey] });
      if (!prices.data.length) return { error: "Price not found" };
      const stripePrice = prices.data[0];

      const customerEmail =
        typeof context.claims?.email === "string"
          ? (context.claims.email as string)
          : undefined;
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: customerEmail,
        userId,
      });

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: stripePrice.id }],
        trial_period_days: 3,
        // No card required up front. If the user doesn't add a card before
        // trial end, Stripe cancels the subscription.
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: { userId, source: "free_trial_no_card" },
      } as any);

      return { status: "started", subscriptionId: subscription.id };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
