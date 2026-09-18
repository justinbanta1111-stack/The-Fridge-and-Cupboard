/**
 * Turning the shopping list into something you can print, text, email or share.
 * Pure helpers — no UI, no network.
 */

import { groupByAisle } from "@/lib/aisles";
import type { ShoppingListItem } from "@/lib/shopping-list";
import { isNativeApp } from "@/lib/native-runtime";
import { nativeShareSheet } from "@/lib/native-bridge";

export function buildShoppingListText(items: ShoppingListItem[]): string {
  const open = items.filter((i) => !i.done);
  if (open.length === 0) return "Shopping list (The Fridge & Cupboard)\n\nNothing left to buy.";
  const groups = groupByAisle(open);
  const lines: string[] = ["Shopping list — The Fridge & Cupboard", ""];
  for (const g of groups) {
    lines.push(`${g.emoji} ${g.label}`);
    for (const item of g.items) {
      lines.push(`  • ${item.name}${item.qty ? ` — ${item.qty}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export async function shareShoppingList(items: ShoppingListItem[]): Promise<"shared" | "copied"> {
  const text = buildShoppingListText(items);
  if (
    isNativeApp() &&
    (await nativeShareSheet({
      title: "Shopping list",
      text,
      dialogTitle: "Share shopping list",
    }))
  ) {
    return "shared";
  }
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title: "Shopping list", text });
      return "shared";
    } catch {
      /* user cancelled or unsupported — fall through to copy */
    }
  }
  if (nav?.clipboard?.writeText) await nav.clipboard.writeText(text);
  return "copied";
}

export function emailShoppingList(items: ShoppingListItem[]) {
  const body = encodeURIComponent(buildShoppingListText(items));
  window.location.href = `mailto:?subject=${encodeURIComponent("My shopping list")}&body=${body}`;
}

export function textShoppingList(items: ShoppingListItem[]) {
  const body = encodeURIComponent(buildShoppingListText(items));
  // iOS wants &body=, Android wants ?body= — this form works on both.
  window.location.href = `sms:&body=${body}`;
}

export function printShoppingList(items: ShoppingListItem[]) {
  const text = buildShoppingListText(items);
  const win = window.open("", "_blank", "width=520,height=680");
  if (!win) {
    window.print();
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>Shopping list</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px/1.6 -apple-system,system-ui,sans-serif;padding:28px;white-space:pre-wrap;color:#111}</style></head><body>${text.replace(
      /[&<>]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string,
    )}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}
