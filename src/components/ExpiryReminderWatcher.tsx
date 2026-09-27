import { useEffect } from "react";
import { runExpiryReminderCheck } from "@/lib/expiry-reminders";

/**
 * Headless watcher: checks tracked use-by dates and fires a grouped
 * notification when something is approaching (or past) its date.
 * Renders nothing and never asks for permission on its own.
 */
export function ExpiryReminderWatcher() {
  useEffect(() => {
    const check = () => {
      try {
        runExpiryReminderCheck();
      } catch {
        /* ignore */
      }
    };
    const start = window.setTimeout(check, 4000);
    const interval = window.setInterval(check, 30 * 60 * 1000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
