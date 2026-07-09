import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { attachReferral } from "@/lib/referrals.functions";

const STORAGE_KEY = "fac:pending-referral";

/**
 * Captures ?ref=CODE from the URL on first paint, stores it in localStorage,
 * then attaches it to the user the next time we see a real (non-anonymous)
 * SIGNED_IN auth event. Silent — does not interrupt UX on failure.
 */
export function ReferralCapture() {
  const attach = useServerFn(attachReferral);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (ref) {
        window.localStorage.setItem(STORAGE_KEY, ref.toUpperCase());
        // Clean the URL so the code doesn't leak into shares / re-loads.
        url.searchParams.delete("ref");
        const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash;
        window.history.replaceState({}, "", next);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    async function tryAttach(userId: string, isAnonymous: boolean) {
      if (isAnonymous) return;
      let code: string | null = null;
      try {
        code = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        return;
      }
      if (!code) return;
      try {
        const result = await attach({ data: { code } });
        if (result.ok || result.reason === "already_linked") {
          window.localStorage.removeItem(STORAGE_KEY);
        } else if (result.reason === "invalid_code" || result.reason === "self_referral") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // network/server issue — leave the code in storage for next time
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (u) void tryAttach(u.id, !!u.is_anonymous);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        void tryAttach(session.user.id, !!session.user.is_anonymous);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [attach]);

  return null;
}
