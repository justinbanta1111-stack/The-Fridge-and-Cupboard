import { supabase } from "@/integrations/supabase/client";

export const GUEST_SCAN_LIMIT = 5;
const KEY = "tfc_guest_scan_count";

/**
 * Try-before-signup: one free fridge scan and one free cupboard scan,
 * tracked separately, before we ask the visitor to create an account.
 */
export type FreeScanKind = "fridge" | "cupboard";
export const FREE_SCANS_PER_KIND = 1;
const FREE_KEY = "tfc_free_scans_v1";

function readFree(): Record<FreeScanKind, number> {
  const empty = { fridge: 0, cupboard: 0 } as Record<FreeScanKind, number>;
  if (typeof window === "undefined") return empty;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FREE_KEY) ?? "{}");
    return {
      fridge: Number(parsed?.fridge) || 0,
      cupboard: Number(parsed?.cupboard) || 0,
    };
  } catch {
    return empty;
  }
}

/** Fridge & freezer count as "fridge"; pantry & counter count as "cupboard". */
export function freeScanKindFor(storage: string): FreeScanKind {
  return storage === "fridge" || storage === "freezer" ? "fridge" : "cupboard";
}

export function getFreeScansUsed(kind: FreeScanKind): number {
  return readFree()[kind];
}

export function hasFreeScanLeft(kind: FreeScanKind): boolean {
  return getFreeScansUsed(kind) < FREE_SCANS_PER_KIND;
}

export function recordFreeScan(kind: FreeScanKind) {
  if (typeof window === "undefined") return;
  const next = readFree();
  next[kind] = next[kind] + 1;
  try {
    window.localStorage.setItem(FREE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function resetFreeScans() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(FREE_KEY);
}


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
