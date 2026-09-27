import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { everythingUnlockedHere } from "@/lib/store-purchases";

export type SubscriptionTier = "free" | "standard" | "premium";

export type SubscriptionState = {
  loading: boolean;
  userId: string | null;
  isActive: boolean;
  isPremium: boolean;
  isStandard: boolean;
  tier: SubscriptionTier;
  priceId: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isTrialing: boolean;
  /** Whole days left in a trial (or in the paid period), null when unknown. */
  daysLeft: number | null;
  refetch: () => void;
};

const PREMIUM_KEYS = ["pro_premium_monthly", "premium_monthly", "pro.premium.monthly"];
const STANDARD_KEYS = ["pro_standard_monthly", "standard_monthly", "pro.standard.monthly"];

function classify(priceId: string | null | undefined): SubscriptionTier {
  if (!priceId) return "free";
  const lc = priceId.toLowerCase();
  if (PREMIUM_KEYS.some((k) => lc.includes(k.toLowerCase())) || lc.includes("premium")) return "premium";
  if (STANDARD_KEYS.some((k) => lc.includes(k.toLowerCase())) || lc.includes("standard")) return "standard";
  // Any other paid lookup_key still counts as standard access.
  return "standard";
}

function isStatusActive(status: string | null, periodEnd: string | null): boolean {
  if (!status) return false;
  const future = !periodEnd || new Date(periodEnd).getTime() > Date.now();
  if (["active", "trialing", "past_due"].includes(status) && future) return true;
  if (status === "canceled" && periodEnd && new Date(periodEnd).getTime() > Date.now()) return true;
  return false;
}

export function useSubscription(): SubscriptionState {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [row, setRow] = useState<{
    price_id: string | null;
    status: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean | null;
  } | null>(null);

  const load = useCallback(async (uid: string | null) => {
    if (!uid) {
      setRow(null);
      setLoading(false);
      return;
    }
    let env: "sandbox" | "live";
    try {
      env = getStripeEnvironment();
    } catch {
      env = "live";
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("price_id,status,current_period_end,cancel_at_period_end")
      .eq("user_id", uid)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow((data as any) ?? null);
    setLoading(false);
  }, []);

  const refetch = useCallback(() => {
    load(userId);
  }, [load, userId]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      load(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "INITIAL_SESSION") return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      // NEVER call other supabase methods synchronously inside this callback —
      // it holds the auth lock, and a query here deadlocks getSession() for
      // every other caller (server-fn bearer attacher, voice pipeline, etc.).
      setTimeout(() => load(uid), 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  // Realtime: refetch when our subscription row changes.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`sub-${userId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => load(userId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const status = row?.status ?? null;
  const periodEnd = row?.current_period_end ?? null;
  const rowActive = isStatusActive(status, periodEnd);

  // Inside the installed app, when store billing isn't wired there is no way
  // to buy anything, so nothing is locked and no prices are shown.
  const [openEverything, setOpenEverything] = useState(false);
  useEffect(() => setOpenEverything(everythingUnlockedHere()), []);

  const active = rowActive || openEverything;
  const tier: SubscriptionTier = rowActive
    ? classify(row?.price_id ?? null)
    : openEverything
      ? "premium"
      : "free";

  return {
    loading,
    userId,
    isActive: active,
    isPremium: active && tier === "premium",
    isStandard: active && (tier === "standard" || tier === "premium"),
    tier,
    priceId: row?.price_id ?? null,
    status,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: !!row?.cancel_at_period_end,
    isTrialing: status === "trialing" && active,
    daysLeft: periodEnd
      ? Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 86_400_000))
      : null,
    refetch,
  };
}
