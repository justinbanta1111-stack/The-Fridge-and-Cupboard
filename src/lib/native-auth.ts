/**
 * Sign-in inside the iOS / Android app.
 *
 * The app's pages are served from the device bundle (`capacitor://localhost`),
 * which Google and Apple will never redirect back to. So the app opens the
 * live site in the system browser, signs in there, and the live site hands the
 * finished session back to the app through the app's own URL scheme. Nothing
 * here runs on the website except the small hand-back step.
 */
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/native-runtime";
import { REMOTE_API_ORIGIN } from "@/lib/native-api-origin";

/** Matches CFBundleURLSchemes in ios/App/App/Info.plist. */
export const NATIVE_AUTH_SCHEME = "com.thefridgeandcupboard.app";
export const NATIVE_AUTH_CALLBACK = `${NATIVE_AUTH_SCHEME}://auth-callback`;

/** True when this web page was opened by the app to complete sign-in. */
export function isNativeAuthHandoff(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("native") === "1";
  } catch {
    return false;
  }
}

/** App side: open the live sign-in page in the system browser. */
export async function startNativeOAuth(provider: "google" | "apple"): Promise<void> {
  const url = `${REMOTE_API_ORIGIN}/auth?native=1&provider=${provider}`;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" });
  } catch {
    window.open(url, "_blank");
  }
}

/**
 * Website side: once a session exists during a native hand-off, pass the
 * tokens back to the app through its URL scheme and close the browser sheet.
 */
export async function deliverSessionToNativeApp(): Promise<boolean> {
  if (typeof window === "undefined" || !isNativeAuthHandoff()) return false;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token || !session.refresh_token) return false;
  const target =
    `${NATIVE_AUTH_CALLBACK}#access_token=${encodeURIComponent(session.access_token)}` +
    `&refresh_token=${encodeURIComponent(session.refresh_token)}`;
  window.location.href = target;
  return true;
}

function tokensFromUrl(rawUrl: string): { access_token: string; refresh_token: string } | null {
  try {
    const hash = rawUrl.split("#")[1] ?? "";
    const query = rawUrl.split("?")[1]?.split("#")[0] ?? "";
    const params = new URLSearchParams(hash || query);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) return { access_token, refresh_token };
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * App side: listen for the finished sign-in coming back from the browser.
 * Returns a cleanup function. Safe to call on the website (does nothing).
 */
export function registerNativeAuthListener(): () => void {
  if (!isNativeApp()) return () => {};
  let cancelled = false;
  let remove: (() => void) | null = null;

  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        const tokens = tokensFromUrl(url ?? "");
        if (!tokens) return;
        try {
          await supabase.auth.setSession(tokens);
        } catch {
          /* surfaced by the sign-in screen */
        }
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.close();
        } catch {
          /* the sheet may already be gone */
        }
        try {
          sessionStorage.setItem("tfc.voice.resume-after-auth.v1", "1");
        } catch {}
        window.location.replace("/");
      });
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    } catch {
      /* plugin unavailable */
    }
  })();

  return () => {
    cancelled = true;
    remove?.();
  };
}
