/**
 * The person's preferred name, used sparingly by Chef Super J.
 *
 * - Signed-in accounts: saved to that account only (auth user metadata
 *   `preferred_name`), so every account has its own name.
 * - Guests: kept only for the current browser session (sessionStorage), so a
 *   later visitor on the same device is never assumed to be the same person.
 * - Never defaults to any name, and never guesses one from an email address.
 */
import { supabase } from "@/integrations/supabase/client";

const LEGACY_DEVICE_KEY = "tfc.user.firstName.v1"; // old device-wide name — no longer trusted
const SESSION_KEY = "tfc.user.name.session.v2"; // { owner: userId | "guest", name }
const SKIP_KEY = "tfc.user.name.skipped.v1"; // session: the person chose not to give a name
const OWNER_KEY = "tfc.user.owner.v1"; // session: whose personal context is loaded

/** Chef's own names — never the person's name. */
const RESERVED = new Set(["chef", "super", "superj", "j"]);

export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const first = raw.trim().split(/\s+/)[0]?.replace(/[.,!?;:]+$/, "") ?? "";
  if (!/^[\p{L}][\p{L}'’-]{0,23}$/u.test(first)) return "";
  if (RESERVED.has(first.toLowerCase())) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

const NOT_NAMES = new Set([
  "yes", "no", "nope", "ok", "okay", "sure", "hi", "hello", "hey", "um", "uh", "well",
  "skip", "nothing", "none", "nobody", "pass", "later", "what", "the", "a", "i", "im", "i'm",
  "just", "my", "call", "it's", "its", "is", "name", "me",
]);

/**
 * Pull a name out of a spoken/typed answer such as "Call me Maria",
 * "My name is Sam", "It's Lee", or just "Priya". Returns "" when unsure.
 */
export function extractName(answer: string, bare = true): string {
  const text = answer.trim();
  const m =
    /\b(?:call me|my name is|my name's|name is|i am|i'm|im|it's|its|this is)\s+([\p{L}][\p{L}'’-]*)/iu.exec(text);
  if (m) {
    const n = cleanName(m[1]);
    return n && !NOT_NAMES.has(n.toLowerCase()) ? n : "";
  }
  if (!bare) return "";
  const words = text.replace(/[.,!?]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 2) return "";
  const n = cleanName(words[0]);
  return n && !NOT_NAMES.has(n.toLowerCase()) ? n : "";
}

/** "Call me X" / "my name is X" / "actually it's X" — a correction mid-conversation. */
export function extractNameCorrection(text: string): string {
  if (!/\b(call me|my name is|my name's|actually,? (?:it's|i'm)|not \w+,? (?:it's|i'm))\b/i.test(text)) return "";
  const m = /\b(?:call me|my name is|my name's|it's|i'm)\s+([\p{L}][\p{L}'’-]*)/iu.exec(text);
  return m ? extractName(`call me ${m[1]}`) : "";
}

type Cached = { owner: string; name: string };

function readCache(): Cached | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const v = raw ? (JSON.parse(raw) as Cached) : null;
    return v && typeof v.owner === "string" ? { owner: v.owner, name: cleanName(v.name) } : null;
  } catch {
    return null;
  }
}

function writeCache(owner: string, name: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ owner, name }));
  } catch {}
}

function emit(name: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tfc:user-name", { detail: name }));
  }
}

function dropLegacy() {
  try {
    localStorage.removeItem(LEGACY_DEVICE_KEY);
  } catch {}
}

async function currentAccount() {
  try {
    const { data } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null } }>((r) => setTimeout(() => r({ data: { session: null } }), 2500)),
    ]);
    const u = data.session?.user;
    return u && !u.is_anonymous ? u : null;
  } catch {
    return null;
  }
}

/** Name already known for whoever is using the app right now (sync, cache only). */
export function getSavedUserName(): string {
  if (typeof window === "undefined") return "";
  const c = readCache();
  if (!c) return "";
  try {
    if (sessionStorage.getItem(OWNER_KEY) !== c.owner) return "";
  } catch {}
  return c.name;
}

/** Resolve the preferred name for the current account (or guest session). */
export async function resolveUserName(): Promise<string> {
  if (typeof window === "undefined") return "";
  dropLegacy();
  const user = await currentAccount();
  const owner = user?.id ?? "guest";
  syncOwner(owner);
  if (!user) return readCache()?.owner === "guest" ? (readCache()?.name ?? "") : "";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromAccount =
    cleanName(meta.preferred_name) ||
    cleanName(meta.first_name) ||
    cleanName(meta.given_name) ||
    cleanName(meta.full_name) ||
    cleanName(meta.name);
  writeCache(owner, fromAccount);
  return fromAccount;
}

/** Save (or clear) the preferred name for the current account / guest session. */
export async function setPreferredName(name: string): Promise<string> {
  const value = cleanName(name);
  const user = await currentAccount();
  const owner = user?.id ?? "guest";
  syncOwner(owner);
  writeCache(owner, value);
  if (value) clearNameSkipped();
  emit(value);
  if (user) {
    try {
      await supabase.auth.updateUser({ data: { preferred_name: value || null } });
    } catch (e) {
      console.warn("[name] couldn't save preferred name to account", e);
    }
  }
  return value;
}

/** Back-compat wrapper used by the settings card. */
export function setSavedUserName(name: string): string {
  const value = cleanName(name);
  void setPreferredName(value);
  return value;
}

export function markNameSkipped() {
  try {
    sessionStorage.setItem(SKIP_KEY, "1");
  } catch {}
}
export function clearNameSkipped() {
  try {
    sessionStorage.removeItem(SKIP_KEY);
  } catch {}
}
export function wasNameSkipped(): boolean {
  try {
    return sessionStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

/** Session keys that hold one person's private conversation context. */
const PERSONAL_SESSION_KEYS = ["tfc.voice.history.v1", "tfc.voice.interruptions.v1", SKIP_KEY];
const PERSONAL_LOCAL_KEYS = ["tfc_scan_context_v1"];

/** Wipe the previous person's name and conversation from this device. */
export function clearPersonalContext() {
  try {
    for (const k of PERSONAL_SESSION_KEYS) sessionStorage.removeItem(k);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
  try {
    for (const k of PERSONAL_LOCAL_KEYS) localStorage.removeItem(k);
  } catch {}
  dropLegacy();
  emit("");
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("tfc:personal-reset"));
}

/**
 * Called whenever we learn who is using the app. When the person changes,
 * the previous person's context is cleared. A guest who signs up/in during
 * this session carries their guest name into the new account.
 */
function syncOwner(owner: string) {
  let prev: string | null = null;
  try {
    prev = sessionStorage.getItem(OWNER_KEY);
  } catch {}
  if (prev === owner) return;
  const guestName = prev === "guest" && readCache()?.owner === "guest" ? readCache()?.name ?? "" : "";
  if (prev !== null && !(prev === "guest" && owner !== "guest")) clearPersonalContext();
  try {
    sessionStorage.setItem(OWNER_KEY, owner);
  } catch {}
  if (guestName && owner !== "guest") pendingCarry = guestName;
}

let pendingCarry = "";

/**
 * Wire once at app start: reacts to sign-in, sign-out and account switches.
 */
export function initNameIdentity() {
  if (typeof window === "undefined") return () => {};
  dropLegacy();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      clearPersonalContext();
      try {
        sessionStorage.setItem(OWNER_KEY, "guest");
      } catch {}
      return;
    }
    if (event !== "SIGNED_IN" && event !== "USER_UPDATED" && event !== "INITIAL_SESSION") return;
    const u = session?.user;
    if (!u || u.is_anonymous) return;
    syncOwner(u.id);
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const saved = cleanName(meta.preferred_name);
    if (!saved && pendingCarry) {
      const carry = pendingCarry;
      pendingCarry = "";
      // Defer: never call auth methods inside the auth callback.
      setTimeout(() => void setPreferredName(carry), 0);
      return;
    }
    pendingCarry = "";
    void resolveUserName().then(emit);
  });
  return () => data.subscription.unsubscribe();
}

/** Greeting Chef speaks and shows when the app opens. */
export function greetingFor(name: string): string {
  return name
    ? `Welcome back, ${name}! What are we cooking today?`
    : "Welcome to The Fridge & Cupboard! What would you like me to call you?";
}
