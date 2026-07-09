import { supabase } from "@/integrations/supabase/client";

export const GUEST_SCAN_LIMIT = 5;
const KEY = "tfc_guest_scan_count";

export function getGuestScanCount(): number {
  if (typeof window === "undefined") return 0;
  const v = Number(window.localStorage.getItem(KEY) ?? "0");
  return Number.isFinite(v) ? v : 0;
}

export function getGuestScansRemaining(): number {
  return Math.max(0, GUEST_SCAN_LIMIT - getGuestScanCount());
}

export function incrementGuestScanCount(): number {
  if (typeof window === "undefined") return 0;
  const next = getGuestScanCount() + 1;
  window.localStorage.setItem(KEY, String(next));
  return next;
}

export function resetGuestScanCount() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/**
 * Ensure the visitor has a Supabase session. If signed out, create an
 * anonymous one so RLS-protected scan endpoints work without forcing signup.
 * Returns the user (anonymous or real).
 */
export async function ensureGuestSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.user;
}

export function isAnonymousUser(user: { is_anonymous?: boolean | null } | null | undefined): boolean {
  return !!user?.is_anonymous;
}
