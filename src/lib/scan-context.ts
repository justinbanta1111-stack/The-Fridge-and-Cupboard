/**
 * Lightweight client-side memory of the most recent scan so the chef voice
 * conversation can talk about the food the user just showed it.
 * Purely additive — nothing in the scanning or voice pipeline depends on it.
 */

const KEY = "tfc_scan_context_v1";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type ScanContext = {
  items: string[];
  useFirst: string[];
  summary?: string;
  storage?: string;
  at: number;
};

export function setScanContext(ctx: Omit<ScanContext, "at">) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        items: ctx.items.slice(0, 25),
        useFirst: ctx.useFirst.slice(0, 8),
        summary: ctx.summary?.slice(0, 400),
        storage: ctx.storage,
        at: Date.now(),
      } satisfies ScanContext),
    );
  } catch {
    /* ignore */
  }
}

export function getScanContext(): ScanContext | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScanContext;
    if (!parsed?.at || Date.now() - parsed.at > TTL_MS) return null;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
