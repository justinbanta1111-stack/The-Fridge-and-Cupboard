import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, BellOff, Clock, Sparkles, Settings2, ChefHat } from "lucide-react";

type Prefs = {
  enabled: boolean;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  chefVoice: boolean;
};
const KEY = "tfc.use-it-tonight.prefs.v1";
const LAST_KEY = "tfc.use-it-tonight.last-shown.v1";

const DEFAULTS: Prefs = { enabled: true, morning: false, afternoon: true, evening: true, chefVoice: true };

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULTS; }
}
function savePrefs(p: Prefs) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }

// Rough freshness ranking — same spirit as the rest of the app
const SHORT_LIFE = ["spinach", "lettuce", "arugula", "kale", "mushroom", "berries", "strawberry", "raspberry", "cilantro", "basil", "parsley", "avocado", "fish", "shrimp", "ground beef", "ground turkey"];
const MEDIUM_LIFE = ["chicken", "pork", "beef", "tortilla", "sour cream", "yogurt", "cheese", "milk", "tomato", "cucumber", "pepper", "broccoli", "leftover"];

function urgency(item: string): number {
  const x = item.toLowerCase();
  if (SHORT_LIFE.some((s) => x.includes(s))) return 0; // tonight
  if (MEDIUM_LIFE.some((s) => x.includes(s))) return 1; // soon
  return 2;
}

function timeSlot(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 11) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function buildMessage(items: string[], chefVoice: boolean): string | null {
  if (!items.length) return null;
  const ranked = [...items].sort((a, b) => urgency(a) - urgency(b));
  const top = ranked.slice(0, 3);
  const first = top[0];
  if (urgency(first) === 0) {
    return chefVoice
      ? `Hey — don't forget that ${first}. Let's turn it into dinner tonight.`
      : `Your ${first} should be used tonight.`;
  }
  if (top.length >= 2 && urgency(top[0]) <= 1) {
    return chefVoice
      ? `Your ${top[0]} and ${top[1]} could make dinner in 10 minutes — let's go!`
      : `${top[0]} and ${top[1]} could make dinner in 10 minutes.`;
  }
  return chefVoice
    ? `That ${first} is ready for a meal idea — want one?`
    : `Use your ${first} soon for best flavor.`;
}

function estimateSavings(items: string[]): number {
  // rough: $2 per perishable saved
  const at = items.filter((i) => urgency(i) <= 1).length;
  return Math.min(25, Math.max(3, at * 2));
}

export function UseItTonightStrip({ items = [] as string[] }: { items?: string[] }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [openSettings, setOpenSettings] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPrefs(loadPrefs());
    if (typeof Notification !== "undefined") setNotifPerm(Notification.permission);
    else setNotifPerm("unsupported");
  }, []);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const message = useMemo(() => buildMessage(items, prefs.chefVoice), [items, prefs.chefVoice]);
  const saved = useMemo(() => estimateSavings(items), [items]);

  // Fire an opt-in browser notification once per slot per day if enabled
  useEffect(() => {
    if (!prefs.enabled || notifPerm !== "granted" || !message) return;
    const slot = timeSlot();
    if (!prefs[slot]) return;
    const today = new Date().toISOString().slice(0, 10);
    const tag = `${today}:${slot}`;
    try {
      const last = localStorage.getItem(LAST_KEY);
      if (last === tag) return;
      new Notification("Use It Tonight 🍳", { body: message, tag });
      localStorage.setItem(LAST_KEY, tag);
    } catch {}
  }, [prefs, notifPerm, message]);

  const requestPerm = async () => {
    if (typeof Notification === "undefined") return;
    const res = await Notification.requestPermission();
    setNotifPerm(res);
  };

  if (!message && items.length === 0) {
    // Show a quiet teaser even when no items yet
    return (
      <Card className="mt-4 p-4 border-amber-200/60 bg-gradient-to-br from-amber-50/60 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Use It Tonight</h3>
            <p className="text-xs text-muted-foreground">Scan your fridge to get gentle reminders before food goes bad.</p>
          </div>
          <SettingsButton open={openSettings} setOpen={setOpenSettings} prefs={prefs} update={update} notifPerm={notifPerm} requestPerm={requestPerm} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-4 p-4 border-amber-300/70 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {prefs.chefVoice ? <ChefHat className="h-5 w-5 text-amber-600" /> : <Bell className="h-5 w-5 text-amber-600" />}
          <h3 className="font-semibold">Use It Tonight</h3>
          <Badge variant="secondary" className="text-xs">Smart reminder</Badge>
        </div>
        <SettingsButton open={openSettings} setOpen={setOpenSettings} prefs={prefs} update={update} notifPerm={notifPerm} requestPerm={requestPerm} />
      </div>

      {message && <p className="text-sm mb-2">{message}</p>}
      {saved > 0 && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-3">
          💰 You could save about ${saved} by using this tonight.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild variant="default">
          <Link to="/">
            <Sparkles className="h-4 w-4 mr-1" /> Show meal ideas
          </Link>
        </Button>
        <Button size="sm" asChild variant="outline">
          <Link to="/use-it-soon">Use leftovers</Link>
        </Button>
        <Button size="sm" asChild variant="outline">
          <Link to="/going-bad">
            <Clock className="h-4 w-4 mr-1" /> What's going bad first?
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function SettingsButton({
  open, setOpen, prefs, update, notifPerm, requestPerm,
}: {
  open: boolean; setOpen: (b: boolean) => void; prefs: Prefs;
  update: (p: Partial<Prefs>) => void;
  notifPerm: NotificationPermission | "unsupported";
  requestPerm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Reminder settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reminder settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="r-enabled" className="flex items-center gap-2">
              {prefs.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              Reminders
            </Label>
            <Switch id="r-enabled" checked={prefs.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>
          <div className="space-y-2 pl-1">
            <Row id="r-m" label="Morning (8–11am)" checked={prefs.morning} disabled={!prefs.enabled} onChange={(v) => update({ morning: v })} />
            <Row id="r-a" label="Afternoon (11am–5pm)" checked={prefs.afternoon} disabled={!prefs.enabled} onChange={(v) => update({ afternoon: v })} />
            <Row id="r-e" label="Evening (5–9pm)" checked={prefs.evening} disabled={!prefs.enabled} onChange={(v) => update({ evening: v })} />
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <Label htmlFor="r-chef" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" /> Chef Super J voice
            </Label>
            <Switch id="r-chef" checked={prefs.chefVoice} onCheckedChange={(v) => update({ chefVoice: v })} />
          </div>
          <div className="border-t pt-3 text-xs text-muted-foreground space-y-2">
            {notifPerm === "unsupported" && <p>Browser notifications aren't supported on this device.</p>}
            {notifPerm === "default" && (
              <Button size="sm" variant="outline" className="w-full" onClick={requestPerm}>
                <Bell className="h-4 w-4 mr-1" /> Enable browser notifications
              </Button>
            )}
            {notifPerm === "denied" && <p>Notifications are blocked in your browser settings.</p>}
            {notifPerm === "granted" && <p className="text-emerald-600 dark:text-emerald-400">✓ Browser notifications enabled.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className={disabled ? "text-muted-foreground" : ""}>{label}</Label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
