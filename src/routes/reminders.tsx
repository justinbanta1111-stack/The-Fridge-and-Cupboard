import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Snowflake, ShoppingCart, ChefHat, Recycle, CalendarClock, Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getBestByReminders, type BestByReminder } from "@/lib/scans.functions";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Get gentle nudges from Chef Super J — expiring food, leftovers, meal prep, cook tonight, and grocery reminders.",
      },
    ],
  }),
  component: RemindersPage,
});

type ReminderKey = "expiring" | "leftover" | "mealprep" | "tonight" | "grocery";

const STORAGE_KEY = "tfc.reminders.v1";
const NOTIFIED_KEY = "tfc.reminders.notified.v1";

const REMINDER_OPTIONS: { key: ReminderKey; label: string; desc: string; icon: typeof Bell }[] = [
  { key: "expiring", label: "Expiring food alerts", desc: "Heads-up before items in your fridge go bad.", icon: Snowflake },
  { key: "leftover", label: "Leftover reminders", desc: "Nudges to use yesterday's dinner before it ages out.", icon: Recycle },
  { key: "mealprep", label: "Meal prep reminders", desc: "Sunday and Wednesday meal-prep windows.", icon: Clock },
  { key: "tonight", label: "Cook tonight alerts", desc: "Late-afternoon ping with a meal idea from your pantry.", icon: ChefHat },
  { key: "grocery", label: "Grocery reminders", desc: "Don't leave home without your list (and check pantry first).", icon: ShoppingCart },
];

type Prefs = Record<ReminderKey, boolean>;

const DEFAULTS: Prefs = {
  expiring: true,
  leftover: true,
  mealprep: false,
  tonight: true,
  grocery: false,
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function urgencyStyles(u: BestByReminder["urgency"]) {
  switch (u) {
    case "overdue":
      return { label: "Overdue", cls: "bg-destructive/15 text-destructive border-destructive/30" };
    case "today":
      return { label: "Use today", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" };
    case "soon":
      return { label: "Use soon", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
    default:
      return { label: "On deck", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" };
  }
}

function formatBestBy(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function RemindersPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [items, setItems] = useState<BestByReminder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const fetchReminders = useServerFn(getBestByReminders);

  async function loadReminders() {
    setLoading(true);
    try {
      const res = await fetchReminders();
      setItems(res.items);
      setScanCount(res.scanCount);
      setNeedsAuth(false);
    } catch (err: any) {
      const msg = (err?.message ?? "").toString();
      if (/unauthor|401|no authorization/i.test(msg)) {
        setNeedsAuth(true);
      } else {
        toast.error("Couldn't load reminders. Try again.");
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
    loadReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire browser notifications for overdue / use-today items (dedup per day).
  useEffect(() => {
    if (!mounted || !items || permission !== "granted" || !prefs.expiring) return;
    if (typeof Notification === "undefined") return;

    let notified: Record<string, string> = {};
    try {
      notified = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "{}");
    } catch {
      notified = {};
    }
    const today = new Date().toISOString().slice(0, 10);
    const urgent = items.filter((i) => i.urgency === "overdue" || i.urgency === "today").slice(0, 3);
    let changed = false;
    for (const it of urgent) {
      const key = `${it.name.toLowerCase()}|${it.scanId}`;
      if (notified[key] === today) continue;
      try {
        new Notification("Use this next 🧑‍🍳", {
          body:
            it.urgency === "overdue"
              ? `${it.name} is past its best-by (${formatBestBy(it.bestByISO)}). Cook or freeze today.`
              : `${it.name} is best used today (best by ${formatBestBy(it.bestByISO)}).`,
          tag: `bestby-${key}`,
        });
        notified[key] = today;
        changed = true;
      } catch {
        /* ignore */
      }
    }
    if (changed) {
      try {
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));
      } catch {
        /* ignore */
      }
    }
  }, [items, permission, prefs.expiring, mounted]);

  function toggle(key: ReminderKey, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    toast.success(value ? "Reminder turned on" : "Reminder turned off");
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const res = await Notification.requestPermission();
    setPermission(res);
    if (res === "granted") {
      toast.success("Notifications enabled — Chef will tap you on the shoulder.");
      new Notification("Chef Super J", { body: "All set. I'll keep your kitchen on track." });
    } else {
      toast.error("Notifications blocked. Enable in your browser settings to receive nudges.");
    }
  }

  const urgentItems = (items ?? []).filter((i) => i.urgency !== "later").slice(0, 8);
  const laterItems = (items ?? []).filter((i) => i.urgency === "later").slice(0, 8);

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-2 text-primary">
          <Bell className="h-5 w-5" />
          <span className="text-xs uppercase tracking-widest">Reminders</span>
        </div>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Gentle nudges from Chef Super J.</h1>
        <p className="mt-2 text-muted-foreground">
          Chef watches your best-by dates and tells you what to use next — so leftovers become tonight's dinner instead of tomorrow's compost.
        </p>

        {permission !== "granted" && permission !== "unsupported" && (
          <Card className="mt-6 border-primary/30 bg-primary/5 p-5">
            <div className="font-semibold">Turn on browser notifications</div>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll ping you the day something needs to be used, based on your last fridge scan.
            </p>
            <Button onClick={enableNotifications} className="mt-3">
              <Bell className="mr-2 h-4 w-4" /> Enable notifications
            </Button>
          </Card>
        )}
        {permission === "unsupported" && (
          <Card className="mt-6 border-border p-5 text-sm text-muted-foreground">
            Your browser doesn't support push notifications. Install Fridge & Cupboard on your home screen
            for the best reminder experience.
          </Card>
        )}

        {/* Use next / best-by panel */}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl">Use next</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadReminders}
              disabled={loading}
              aria-label="Refresh reminders"
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by best-by date from your most recent scans. Cook the top of the list for zero waste.
          </p>

          {needsAuth ? (
            <Card className="mt-4 border-dashed border-border p-5 text-sm text-muted-foreground">
              Sign in to see reminders based on your fridge scans.
              <div className="mt-3">
                <Button asChild size="sm">
                  <Link to="/auth">Sign in</Link>
                </Button>
              </div>
            </Card>
          ) : loading ? (
            <Card className="mt-4 border-dashed border-border p-5 text-sm text-muted-foreground">
              Loading your best-by list…
            </Card>
          ) : (items?.length ?? 0) === 0 ? (
            <Card className="mt-4 border-dashed border-border p-5">
              <div className="text-sm text-muted-foreground">
                {scanCount === 0
                  ? "Snap a fridge photo and Chef will build your best-by reminder list from what's inside."
                  : "Nothing urgent in your recent scans — nice work."}
              </div>
              <div className="mt-3">
                <Button asChild size="sm">
                  <Link to="/scan">
                    <Camera className="mr-1.5 h-4 w-4" /> Scan my fridge
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {urgentItems.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {urgentItems.map((it) => {
                    const u = urgencyStyles(it.urgency);
                    return (
                      <Card key={`${it.scanId}-${it.name}`} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold">{it.name}</span>
                            <Badge variant="outline" className={u.cls}>
                              {u.label}
                            </Badge>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Best by {formatBestBy(it.bestByISO)}
                            {it.daysUntilBestBy < 0
                              ? ` · ${Math.abs(it.daysUntilBestBy)}d past`
                              : it.daysUntilBestBy === 0
                                ? " · today"
                                : ` · in ${it.daysUntilBestBy}d`}
                            {it.category ? ` · ${it.category}` : ""}
                          </div>
                        </div>
                        <Button asChild size="sm" variant="secondary">
                          <Link to="/rescue">Cook</Link>
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}

              {laterItems.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold text-muted-foreground">Coming up</h3>
                  <div className="mt-2 grid gap-2">
                    {laterItems.map((it) => (
                      <Card key={`later-${it.scanId}-${it.name}`} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{it.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Best by {formatBestBy(it.bestByISO)} · in {it.daysUntilBestBy}d
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <h2 className="mt-10 font-display text-xl">Reminder types</h2>
        <div className="mt-3 grid gap-3">
          {REMINDER_OPTIONS.map(({ key, label, desc, icon: Icon }) => (
            <Card key={key} className="flex items-center gap-4 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              <Switch
                checked={mounted ? prefs[key] : DEFAULTS[key]}
                onCheckedChange={(v) => toggle(key, v)}
              />
            </Card>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Tip: Install the app to your home screen so reminders work even when the browser is closed.
        </p>
      </main>
    </div>
  );
}
