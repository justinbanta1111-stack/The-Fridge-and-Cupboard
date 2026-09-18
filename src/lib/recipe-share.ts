/**
 * Turning a recipe into something you can print, text, email or share.
 * Pure helpers — no UI, no network.
 */

import { isNativeApp } from "@/lib/native-runtime";
import { nativeShareSheet } from "@/lib/native-bridge";

export type ShareableRecipe = {
  title: string;
  description?: string;
  usesFromFridge?: string[];
  alsoNeed?: string[];
  steps?: string[];
  timeMinutes?: number | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  servings?: number | null;
  chefTip?: string | null;
  storageTip?: string | null;
};

const BRAND = "The Fridge & Cupboard";

export function buildRecipeText(r: ShareableRecipe): string {
  const lines: string[] = [r.title.toUpperCase(), ""];
  if (r.description) lines.push(r.description, "");

  const facts: string[] = [];
  if (typeof r.prepMinutes === "number" && r.prepMinutes > 0) facts.push(`Prep ${r.prepMinutes}m`);
  if (typeof r.cookMinutes === "number" && r.cookMinutes > 0) facts.push(`Cook ${r.cookMinutes}m`);
  if (typeof r.timeMinutes === "number" && r.timeMinutes > 0) facts.push(`Total ${r.timeMinutes}m`);
  if (typeof r.servings === "number" && r.servings > 0) facts.push(`Serves ${r.servings}`);
  if (facts.length) lines.push(facts.join(" · "), "");

  if (r.usesFromFridge?.length) {
    lines.push("WHAT YOU ALREADY HAVE");
    for (const x of r.usesFromFridge) lines.push(`  • ${x}`);
    lines.push("");
  }
  if (r.alsoNeed?.length) {
    lines.push("ALSO NEED");
    for (const x of r.alsoNeed) lines.push(`  • ${x}`);
    lines.push("");
  }
  if (r.steps?.length) {
    lines.push("STEPS");
    r.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    lines.push("");
  }
  if (r.chefTip) lines.push(`Chef Super J tip: ${r.chefTip}`, "");
  if (r.storageTip) lines.push(`Leftovers: ${r.storageTip}`, "");
  lines.push(`— ${BRAND}`);
  return lines.join("\n").trim();
}

/** Pack a recipe into a link that opens a clean, printable recipe card. */
export function encodeRecipe(r: ShareableRecipe): string {
  const payload = JSON.stringify(r);
  const bytes = new TextEncoder().encode(payload);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRecipe(code: string): ShareableRecipe | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed.title !== "string") return null;
    return parsed as ShareableRecipe;
  } catch {
    return null;
  }
}

/** Public link to the shareable recipe card, or null if the recipe is too big. */
export function buildRecipeUrl(r: ShareableRecipe): string | null {
  if (typeof window === "undefined") return null;
  const url = `${window.location.origin}/recipe-card?r=${encodeRecipe(r)}`;
  return url.length > 4000 ? null : url;
}

/**
 * Open the system share sheet (iOS/iPadOS/Android). Shares the recipe text plus
 * a link to a clean recipe card so Messages, Mail, Notes and AirDrop all show
 * something readable. Falls back to copying when sharing isn't available.
 */
export async function shareRecipe(r: ShareableRecipe): Promise<"shared" | "copied"> {
  const text = buildRecipeText(r);
  const url = buildRecipeUrl(r);
  if (
    isNativeApp() &&
    (await nativeShareSheet({
      title: r.title,
      text,
      url: url ?? undefined,
      dialogTitle: `Share ${r.title}`,
    }))
  ) {
    return "shared";
  }
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const data: ShareData = url
    ? { title: r.title, text, url }
    : { title: r.title, text };
  if (nav && typeof nav.share === "function") {
    const canShare = typeof nav.canShare === "function" ? nav.canShare(data) : true;
    try {
      await nav.share(canShare ? data : { title: r.title, text });
      return "shared";
    } catch {
      /* cancelled or unsupported — fall through to copy */
    }
  }
  if (nav?.clipboard?.writeText) await nav.clipboard.writeText(url ? `${text}\n\n${url}` : text);
  return "copied";
}


export function emailRecipe(r: ShareableRecipe) {
  const url = buildRecipeUrl(r);
  const body = encodeURIComponent(buildRecipeText(r) + (url ? `\n\n${url}` : ""));
  window.location.href = `mailto:?subject=${encodeURIComponent(`Recipe: ${r.title}`)}&body=${body}`;
}

export function textRecipe(r: ShareableRecipe) {
  const url = buildRecipeUrl(r);
  // A text message stays readable: short intro + link to the full card.
  const short = url ? `${r.title} — from The Fridge & Cupboard\n${url}` : buildRecipeText(r);
  const body = encodeURIComponent(short);
  // iOS wants &body=, Android wants ?body= — this form works on both.
  window.location.href = `sms:&body=${body}`;
}


function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}

export function printRecipe(r: ShareableRecipe) {
  const text = buildRecipeText(r);
  const win = window.open("", "_blank", "width=620,height=780");
  if (!win) {
    window.print();
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>${escapeHtml(r.title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px/1.65 -apple-system,system-ui,Georgia,serif;padding:32px;white-space:pre-wrap;color:#141414;max-width:42rem;margin:0 auto}</style></head><body>${escapeHtml(text)}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}
