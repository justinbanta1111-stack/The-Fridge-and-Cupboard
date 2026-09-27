/**
 * Single source of truth for microphone permission.
 *
 * Rules:
 *  - Ask the system for microphone access at most once.
 *  - If it was already granted, never ask again (just report granted).
 *  - If it was denied, never re-trigger the system popup automatically —
 *    show one small "how to enable it in Settings" message instead. The user
 *    can still retry explicitly (force = true) from a fresh tap.
 */

import { requestMicPermission } from "@/lib/voice-recognition";

export type MicPermission = "granted" | "denied" | "unsupported" | "unknown";

const KEY = "tfc.mic.permission.v1";

export const MIC_BLOCKED_MESSAGE =
  "Microphone access is off. Turn it on in your phone's Settings for The Fridge & Cupboard, then come back.";

function read(): MicPermission {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "granted" || v === "denied" || v === "unsupported") return v;
  } catch {
    /* ignore */
  }
  return "unknown";
}

function write(state: MicPermission) {
  if (typeof window === "undefined") return;
  try {
    if (state === "unknown") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, state);
  } catch {
    /* ignore */
  }
}

export function getCachedMicPermission(): MicPermission {
  return read();
}

/** Read the browser's own permission state without ever showing a prompt. */
export async function queryMicPermission(): Promise<MicPermission> {
  if (typeof navigator === "undefined") return "unknown";
  const perms = (navigator as Navigator & {
    permissions?: { query?: (d: { name: string }) => Promise<{ state: string }> };
  }).permissions;
  try {
    const status = await perms?.query?.({ name: "microphone" });
    if (status?.state === "granted") {
      write("granted");
      return "granted";
    }
    if (status?.state === "denied") {
      write("denied");
      return "denied";
    }
    if (status?.state === "prompt") return read() === "denied" ? "denied" : "unknown";
  } catch {
    /* Safari / older browsers don't support the microphone permission name */
  }
  return read();
}

/**
 * Make sure we have microphone access.
 * Prompts the system at most once; afterwards it answers from the remembered
 * state unless the user explicitly retries (force).
 */
export async function ensureMicPermission(force = false): Promise<MicPermission> {
  const known = await queryMicPermission();
  if (known === "granted") return "granted";
  if ((known === "denied" || known === "unsupported") && !force) return known;

  const result = await requestMicPermission();
  write(result);
  return result;
}

/** Called after an explicit successful grant elsewhere. */
export function rememberMicGranted() {
  write("granted");
}

export function resetMicPermission() {
  write("unknown");
}
