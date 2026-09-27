/**
 * The person's first name, used sparingly by Chef Super J ("Sounds good,
 * Tammy."). Saved on the device and taken from the account when it is there.
 */
import { supabase } from "@/integrations/supabase/client";

const KEY = "tfc.user.firstName.v1";

function clean(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const first = raw.trim().split(/\s+/)[0] ?? "";
  // Names only: letters, apostrophes and hyphens, sensible length.
  if (!/^[\p{L}][\p{L}'’-]{0,23}$/u.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Name saved on this device, if any. */
export function getSavedUserName(): string {
  if (typeof window === "undefined") return "";
  try {
    return clean(localStorage.getItem(KEY));
  } catch {
    return "";
  }
}

export function setSavedUserName(name: string): string {
  const value = clean(name);
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tfc:user-name", { detail: value }));
  }
  return value;
}

/**
 * Device name first, otherwise the name Google / Apple / sign-up gave us.
 * Never guesses a name from an email address.
 */
export async function resolveUserName(): Promise<string> {
  const saved = getSavedUserName();
  if (saved) return saved;
  try {
    const { data } = await supabase.auth.getUser();
    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    const fromAccount =
      clean(meta.first_name) || clean(meta.full_name) || clean(meta.name) || clean(meta.given_name);
    if (fromAccount) {
      setSavedUserName(fromAccount);
      return fromAccount;
    }
  } catch {
    /* signed out or offline */
  }
  return "";
}
