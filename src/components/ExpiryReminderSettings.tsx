import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_REMINDER_PREFS,
  getDueItems,
  getReminderPrefs,
  notificationState,
  requestNotificationPermission,
  runExpiryReminderCheck,
  setReminderPrefs,
  type ExpiryReminderPrefs,
  type NotificationState,
} from "@/lib/expiry-reminders";

const LEAD_CHOICES = [1, 2, 3, 5];

/** Controls for use-by reminder notifications. */
export function ExpiryReminderSettings({ className }: { className?: string }) {
  const [prefs, setPrefs] = useState<ExpiryReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [state, setState] = useState<NotificationState>("default");
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    const p = getReminderPrefs();
    setPrefs(p);
    setState(notificationState());
    setDueCount(getDueItems(p).length);
  }, []);

  function update(next: Partial<ExpiryReminderPrefs>) {
    const merged = setReminderPrefs(next);
    setPrefs(merged);
    setDueCount(getDueItems(merged).length);
  }

  async function enable() {
    const res = await requestNotificationPermission();
    setState(res);
    if (res === "granted") {
      update({ enabled: true });
      toast.success("Reminders on — we'll warn you before food goes past its best.");
      runExpiryReminderCheck();
    } else if (res === "denied") {
      toast.error("Notifications are blocked. Turn them on in your device settings.");
    }
  }

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {prefs.enabled && state === "granted" ? (
            <Bell className="h-5 w-5" aria-hidden />
          ) : (
            <BellOff className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight">Use-by reminders</p>
          <p className="text-sm text-muted-foreground">
            Get a gentle notification when tracked items are close to their date.
            {dueCount > 0 ? ` ${dueCount} item${dueCount === 1 ? "" : "s"} qualify right now.` : ""}
          </p>
        </div>
        {state === "granted" && (
          <Switch
            checked={prefs.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
            aria-label="Use-by reminders"
          />
        )}
      </div>

      {state !== "granted" && (
        <div className="px-4 pb-4">
          {state === "unsupported" ? (
            <p className="text-sm text-muted-foreground">
              This device doesn't support notifications. Add the app to your home screen for
              reminders.
            </p>
          ) : (
            <Button onClick={enable} className="font-bold">
              <Bell className="mr-2 h-4 w-4" aria-hidden /> Turn on reminders
            </Button>
          )}
        </div>
      )}

      {state === "granted" && prefs.enabled && (
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
          <span className="text-sm text-muted-foreground">Warn me</span>
          {LEAD_CHOICES.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={prefs.leadDays === d ? "default" : "outline"}
              onClick={() => update({ leadDays: d })}
            >
              {d} day{d === 1 ? "" : "s"} ahead
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              const fired = runExpiryReminderCheck();
              toast.success(
                fired.length > 0
                  ? "Sent a reminder for what needs using."
                  : "Nothing new to warn about right now.",
              );
            }}
          >
            Test now
          </Button>
        </div>
      )}
      {state === "granted" && prefs.enabled && (
        <p className="px-4 pb-4 text-xs text-muted-foreground">
          Quiet hours: reminders only between {prefs.quietStart}:00 and {prefs.quietEnd}:00, at most
          once per item per day.
        </p>
      )}
    </Card>
  );
}
