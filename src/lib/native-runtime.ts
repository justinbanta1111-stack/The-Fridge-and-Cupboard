/**
 * Tiny runtime check for "are we inside the iOS / Android app shell?".
 * Kept dependency-free so it is safe to import anywhere, including SSR.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function isNativeApp(): boolean {
  try {
    return cap()?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function nativePlatform(): "ios" | "android" | "web" {
  try {
    const p = cap()?.getPlatform?.();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}

export function isIosApp(): boolean {
  return isNativeApp() && nativePlatform() === "ios";
}
