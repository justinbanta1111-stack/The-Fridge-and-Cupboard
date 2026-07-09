import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REFERRAL_GOAL = 3;

function generateCode(): string {
  // 8-char alphanumeric, easy to read (no 0/O/1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export type ReferralStats = {
  code: string;
  inviteUrl: string;
  count: number;
  goal: number;
  rewardApplied: boolean;
  rewardAppliedAt: string | null;
  invites: { id: string; createdAt: string }[];
};

export const getMyReferralStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReferralStats> => {
    const { supabase, userId } = context;

    // Ensure the user has a code; create via admin if missing (RLS only allows SELECT).
    let { data: row, error: rowError } = await supabase
      .from("referral_codes")
      .select("code, reward_applied, reward_applied_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (rowError) throw new Error(rowError.message);

    if (!row) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Retry a few times in case of unique-collision (extremely unlikely).
      for (let attempt = 0; attempt < 5 && !row; attempt++) {
        const code = generateCode();
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("referral_codes")
          .insert({ user_id: userId, code })
          .select("code, reward_applied, reward_applied_at")
          .maybeSingle();
        if (!insertError && inserted) {
          row = inserted;
          break;
        }
      }
      if (!row) throw new Error("Could not create referral code");
    }

    const { data: invites, error: invitesError } = await supabase
      .from("referrals")
      .select("id, created_at, completed")
      .eq("referrer_user_id", userId)
      .eq("completed", true)
      .order("created_at", { ascending: false });
    if (invitesError) throw new Error(invitesError.message);

    const origin =
      process.env.PUBLIC_SITE_ORIGIN || "https://thefridgeandcupboard.com";
    return {
      code: row.code,
      inviteUrl: `${origin}/?ref=${row.code}`,
      count: invites?.length ?? 0,
      goal: REFERRAL_GOAL,
      rewardApplied: !!row.reward_applied,
      rewardAppliedAt: row.reward_applied_at,
      invites: (invites ?? []).map((i) => ({ id: i.id, createdAt: i.created_at })),
    };
  });

const AttachInput = z.object({ code: z.string().min(4).max(16) });

export const attachReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AttachInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = data.code.trim().toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find the referrer.
    const { data: codeRow, error: codeError } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id")
      .eq("code", code)
      .maybeSingle();
    if (codeError) throw new Error(codeError.message);
    if (!codeRow) return { ok: false, reason: "invalid_code" as const };
    if (codeRow.user_id === userId) return { ok: false, reason: "self_referral" as const };

    // Already linked?
    const { data: existing } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_user_id", userId)
      .maybeSingle();
    if (existing) return { ok: false, reason: "already_linked" as const };

    const { error: insertError } = await supabaseAdmin.from("referrals").insert({
      referrer_user_id: codeRow.user_id,
      referred_user_id: userId,
      code,
      completed: true,
    });
    if (insertError) throw new Error(insertError.message);

    return { ok: true as const };
  });

export type ClaimResult =
  | { ok: true; couponId: string; alreadyApplied?: boolean; message: string }
  | { ok: false; error: string };

export const claimReferralReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClaimResult> => {
    const { supabase, userId } = context;

    const { data: row, error: rowError } = await supabase
      .from("referral_codes")
      .select("reward_applied, stripe_coupon_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (rowError) return { ok: false, error: rowError.message };
    if (!row) return { ok: false, error: "Referral code not set up yet." };
    if (row.reward_applied && row.stripe_coupon_id) {
      return {
        ok: true,
        couponId: row.stripe_coupon_id,
        alreadyApplied: true,
        message: "Your free month is already applied to your subscription.",
      };
    }

    const { count, error: countError } = await supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", userId)
      .eq("completed", true);
    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) < REFERRAL_GOAL) {
      return {
        ok: false,
        error: `You need ${REFERRAL_GOAL} signed-up friends to unlock the reward (currently ${count ?? 0}).`,
      };
    }

    // Look up subscription (live first, then sandbox)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subRows } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, environment, status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(2);
    const sub = subRows?.[0];
    if (!sub) {
      return {
        ok: false,
        error:
          "We couldn't find an active subscription to apply the free month to. Start a Pro plan, then claim again.",
      };
    }

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const env = (sub.environment === "live" ? "live" : "sandbox") as "live" | "sandbox";
      const stripe = createStripeClient(env);

      const coupon = await stripe.coupons.create({
        duration: "once",
        percent_off: 100,
        name: "Referral reward — 1 month free",
        metadata: { kind: "referral_reward", user_id: userId },
      });

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        discounts: [{ coupon: coupon.id }],
        metadata: { referral_reward: coupon.id },
      });

      await supabaseAdmin
        .from("referral_codes")
        .update({
          reward_applied: true,
          reward_applied_at: new Date().toISOString(),
          stripe_coupon_id: coupon.id,
        })
        .eq("user_id", userId);

      return {
        ok: true,
        couponId: coupon.id,
        message: "Your free month is applied to your next invoice. Enjoy! 🎉",
      };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });
