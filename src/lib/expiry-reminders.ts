/**
 * Local reminder notifications for tracked expiry items.
 * Works for guests — everything lives in localStorage, nothing server-side.
 * Does not touch the voice, scanning, or audio pipelines.
 */

import { daysUntil, friendlyWindow, getExpiryItems, type ExpiryItem } from "@/lib/expiry";
import { isNativeApp } from "@/lib/native-runtime";
import {
  nativeNotificationPermission,
  requestNativeNotificationPermission,
  scheduleNativeNotification,
} from "@/lib/native-bridge";

/**
 * Inside the iOS / Android app these reminders are delivered as real device
 * notifications through Capacitor Local Notifications, so they arrive even
 * when the app is closed. The website keeps using the browser Notification API.
 */
let nativePermissionCache: "granted" | "denied" | "prompt" | "unsupported" = "unsupported";
if (typeof window !== "undefined" && isNativeApp()) {
  void nativeNotificationPermission().then((p) => {
    nativePermissionCache = p;
  });
}

const PREFS_KEY = "tfc_expiry_reminders_v1";
const SENT_KEY = "tfc_expiry_reminders_sent_v1";

export type ExpiryReminderPrefs = {
  /** Master switch for use-by reminders. */
  enabled: boolean;
  /** How many days ahead of the best-by date to warn. */
  leadDays: number;
  /** No notifications before this hour (0-23). */
  quietStart: number;
  /** No notifications after this hour (0-23). */
  quietEnd: number;
};

export const DEFAULT_REMINDER_PREFS: ExpiryReminderPrefs = {
  enabled: true,
  leadDays: 2,
  quietStart: 8,
  quietEnd: 21,
};

export function getReminderPrefs(): ExpiryReminderPrefs {
  if (typeof localStorage === "undefined") return DEFAULT_REMINDER_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_REMINDER_PREFS;
    return { ...DEFAULT_REMINDER_PREFS, ...(JSON.parse(raw) as Partial<ExpiryReminderPrefs>) };
  } catch {
    return DEFAULT_REMINDER_PREFS;
  }
}

export function setReminderPrefs(next: Partial<ExpiryReminderPrefs>): ExpiryReminderPrefs {
  const merged = { ...getReminderPrefs(), ...next };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
  return merged;
}

export type NotificationState = NotificationPermission | "unsupported";

export function notificationState(): NotificationState {
  if (typeof window === "undefined") return "unsupported";
  if (isNativeApp()) {
    return nativePermissionCache === "prompt" ? "default" : (nativePermissionCache as NotificationState);
  }
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationState> {
  if (isNativeApp()) {
    nativePermissionCache = await requestNativeNotificationPermission();
    return nativePermissionCache === "prompt" ? "default" : (nativePermissionCache as NotificationState);
  }
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readSent(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(SENT_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeSent(sent: Record<string, string>) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    /* ignore */
  }
}

function inQuietHours(prefs: ExpiryReminderPrefs, now = new Date()): boolean {
  const h = now.getHours();
  const { quietStart, quietEnd } = prefs;
  if (quietStart === quietEnd) return false;
  // Allowed window is [quietStart, quietEnd); outside it we stay silent.
  return quietStart < quietEnd ? h < quietStart || h >= quietEnd : h < quietStart && h >= quietEnd;
}

/** Items due within the lead window (or already past). */
export function getDueItems(prefs = getReminderPrefs(), items?: ExpiryItem[]): ExpiryItem[] {
  return (items ?? getExpiryItems()).filter((i) => daysUntil(i.bestBy) <= prefs.leadDays);
}

function bodyFor(items: ExpiryItem[]): string {
  const first = items
    .slice(0, 3)
    .map((i) => `${i.name} — ${friendlyWindow(i.bestBy)}`)
    .join("; ");
  const extra = items.length > 3 ? ` and ${items.length - 3} more` : "";
  return `${first}${extra}. Cook or freeze before it goes to waste.`;
}

/**
 * Fires at most one grouped notification per item per day.
 * Returns the items that were included in a notification.
 */
export function runExpiryReminderCheck(): ExpiryItem[] {
  const prefs = getReminderPrefs();
  if (!prefs.enabled) return [];
  if (notificationState() !== "granted") return [];
  if (inQuietHours(prefs)) return [];

  const due = getDueItems(prefs);
  if (due.length === 0) return [];

  const sent = readSent();
  const today = todayKey();
  const fresh = due.filter((i) => sent[`${i.id}|${i.bestBy}`] !== today);
  if (fresh.length === 0) return [];

  const title = fresh.length === 1 ? "Use this soon 🧑‍🍳" : `${fresh.length} items to use soon 🧑‍🍳`;
  const body = bodyFor(fresh);

  if (isNativeApp()) {
    // Real iPhone / Android notification, scheduled on the device.
    void scheduleNativeNotification({ title, body });
  } else {
    try {
      new Notification(title, { body, tag: "tfc-use-by", icon: "/icons/icon-192.png" });
    } catch {
      return [];
    }
  }

  for (const i of fresh) sent[`${i.id}|${i.bestBy}`] = today;
  // Keep the ledger from growing forever.
  const trimmed = Object.fromEntries(Object.entries(sent).slice(-300));
  writeSent(trimmed);
  return fresh;
}
