/**
 * In the iOS / Android app the whole site is packaged on the device, so the
 * page itself is served from `capacitor://localhost` (or `file://`). Anything
 * that genuinely needs the internet — photo scanning, Chef's voice, payments —
 * has to be pointed back at the live site instead of the local bundle.
 */
export const REMOTE_API_ORIGIN = "https://thefridgeandcupboard.com";

/** True when the page was loaded from the device bundle rather than the web. */
export function isBundledOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const protocol = window.location.protocol;
  return protocol === "capacitor:" || protocol === "file:" || protocol === "ionic:";
}

/** Rewrites a same-origin request path so it reaches the live site. */
export function toRemoteUrl(input: string): string {
  if (!isBundledOrigin()) return input;
  if (/^[a-z]+:\/\//i.test(input)) {
    // Absolute URL that points at the local bundle: move it to the live site.
    try {
      const url = new URL(input);
      if (url.origin === window.location.origin) {
        return `${REMOTE_API_ORIGIN}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      /* leave it alone */
    }
    return input;
  }
  if (input.startsWith("/")) return `${REMOTE_API_ORIGIN}${input}`;
  return input;
}
