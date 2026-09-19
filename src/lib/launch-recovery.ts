/**
 * First-screen recovery for the installed iPhone / Android app.
 *
 * If anything throws while the first screen renders, the app used to show only
 * "Something didn't load." with no way to know why and no way out. This module:
 *   1. turns the error into readable text so it can be shown on the device,
 *   2. clears this app's own saved kitchen state ONCE per install and reloads,
 *      which recovers a device whose saved data is full or corrupted.
 *
 * Signed-in sessions (Supabase "sb-*" keys) are never touched.
 */

const HEALED_KEY = "tfc.launch.healed.v1";

/** Saved values this app owns and can safely rebuild. */
function isAppOwnedKey(key: string): boolean {
  return (
    key.startsWith("tfc_") ||
    key.startsWith("tfc.") ||
    key.startsWith("fac:") ||
    key.startsWith("chef_") ||
    key.startsWith("cooking_")
  );
}

export function describeLaunchError(error: unknown): string {
  try {
    if (error instanceof Error) {
      const stack = typeof error.stack === "string" ? error.stack.split("\n").slice(0, 6).join("\n") : "";
      return `${error.name}: ${error.message}\n${stack}`.trim();
    }
    return String(error);
  } catch {
    return "Unknown error";
  }
}

/** True the first time the first screen fails on this install. */
export function canSelfHeal(): boolean {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
    return localStorage.getItem(HEALED_KEY) !== "1";
  } catch {
    return false;
  }
}

/**
 * Clears this app's saved state once, then reloads the first screen.
 * Safe to call from a render-error boundary.
 */
export function selfHealAndReload(): void {
  try {
    localStorage.setItem(HEALED_KEY, "1");
  } catch {
    // Storage is unusable; the reload below is still worth attempting.
  }
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && isAppOwnedKey(key)) doomed.push(key);
    }
    doomed.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    window.location.replace("/");
  } catch {
    try {
      window.location.reload();
    } catch {
      /* ignore */
    }
  }
}
