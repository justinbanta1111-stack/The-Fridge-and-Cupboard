import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, RotateCcw, Smartphone, Camera, Sparkles, Save, Recycle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/test-checklist")({
  head: () => ({
    meta: [
      { title: "Phone Scan Test Checklist — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Step-by-step QA checklist for verifying the Scan My Fridge flow on iPhone and Android, including the permission-blocked camera case.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TestChecklistPage,
});

type Item = { id: string; label: string; hint?: string };
type Section = { id: string; title: string; icon: typeof Camera; intro: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    id: "device",
    title: "1. Device setup",
    icon: Smartphone,
    intro: "Do this once per device before testing.",
    items: [
      { id: "open-published", label: "Open the published site in your phone browser (Safari on iPhone, Chrome on Android)." },
      { id: "not-iframe", label: "Confirm the URL is thefridgeandcupboard.lovable.app, not the editor preview." },
      { id: "fresh-session", label: "If you've tested before, clear site data so onboarding shows again (optional)." },
    ],
  },
  {
    id: "onboarding",
    title: "2. Onboarding",
    icon: Sparkles,
    intro: "First-launch flow.",
    items: [
      { id: "ob-loads", label: "Onboarding screen loads with the fridge background and 'The Fridge & Cupboard' title." },
      { id: "ob-readable", label: "All headings and body copy are readable (no clipped or overlapping text)." },
      { id: "ob-next", label: "Tap Next through each slide; pagination dots advance." },
      { id: "ob-skip", label: "Skip button works from any slide and lands on the home screen." },
    ],
  },
  {
    id: "auth",
    title: "3. Sign in",
    icon: Check,
    intro: "Required to save scans.",
    items: [
      { id: "auth-open", label: "Tap Sign In in the top bar; /auth opens." },
      { id: "auth-google", label: "Continue with Google completes and returns you to the app signed in." },
      { id: "auth-email", label: "Email + password sign-up works and lands you back signed in." },
      { id: "auth-state", label: "After sign-in, the top bar shows your account (not the Sign In button)." },
    ],
  },
  {
    id: "camera-allow",
    title: "4. Scan — camera allowed",
    icon: Camera,
    intro: "The main happy path.",
    items: [
      { id: "scan-open", label: "Open /scan; storage picker shows Fridge / Freezer / Cupboard / Counter." },
      { id: "scan-pick-storage", label: "Tap a storage type; it highlights as selected." },
      { id: "scan-take", label: "Tap Take Photo; the OS asks for camera permission the first time; allow it." },
      { id: "scan-camera-opens", label: "Native camera opens to the rear lens; capture a photo and confirm." },
      { id: "scan-preview", label: "Captured photo appears in the results card with a dimmed overlay." },
      { id: "scan-progress", label: "Spinner shows and progress messages rotate (e.g. Scanning your fridge…, Identifying ingredients…)." },
      { id: "scan-items", label: "Ingredient list renders within ~20 seconds and the 'X items found' badge appears." },
      { id: "scan-recipes", label: "Meal suggestions appear: 'Make right now' and/or 'Almost ready' sections." },
      { id: "scan-use-first", label: "If any items are urgent, a 'Use these first' chip group is visible." },
      { id: "scan-cuisine", label: "Cuisine picker is usable; selecting one and tapping Get recipes refreshes the meal list." },
    ],
  },
  {
    id: "camera-blocked",
    title: "5. Scan — camera permission blocked",
    icon: Camera,
    intro:
      "Test the failure case. On iPhone: Settings → Safari → Camera → Deny. On Android Chrome: tap the lock icon → Permissions → Camera → Block.",
    items: [
      { id: "block-permission", label: "Block camera access for the site in OS / browser settings, then reload /scan." },
      { id: "block-take-photo", label: "Tap Take Photo. The OS may show a blocked indicator, or nothing happens." },
      { id: "block-hint-visible", label: "The hint under the picker is visible: 'allow camera access in your browser settings, then try again — or use Choose from Photos.'" },
      { id: "block-fallback", label: "Choose from Photos still opens the gallery and lets you finish the scan with an existing image." },
      { id: "block-no-crash", label: "App does not crash, freeze, or show a blank screen after a blocked camera tap." },
      { id: "block-restore", label: "After re-enabling camera permission and reloading, Take Photo opens the camera again." },
    ],
  },
  {
    id: "scan-failure",
    title: "6. Scan — failure & retry",
    icon: RotateCcw,
    intro: "Force a failure to confirm recovery.",
    items: [
      { id: "fail-network", label: "Turn on Airplane mode, tap Take Photo, capture, and wait." },
      { id: "fail-error-card", label: "Scan failed card appears with a readable message (no raw error JSON)." },
      { id: "fail-retry", label: "Turn networking back on and tap Retry scan; the scan completes successfully." },
      { id: "fail-another", label: "Choose another photo resets the flow and lets you start over." },
    ],
  },
  {
    id: "save",
    title: "7. Save scan & history",
    icon: Save,
    intro: "Persistence to your account.",
    items: [
      { id: "save-cta", label: "After a successful scan, the Save scan button is visible and tappable." },
      { id: "save-toast", label: "Tapping Save scan shows a success toast and the button becomes disabled or hidden." },
      { id: "save-history", label: "Scroll to My Scans; the new entry appears with the photo thumbnail." },
      { id: "save-reload", label: "Reload the page; the saved scan is still in My Scans." },
    ],
  },
  {
    id: "going-bad",
    title: "8. What's Going Bad First",
    icon: Recycle,
    intro: "Urgent items + rescue meals.",
    items: [
      { id: "gb-open", label: "Open /going-bad; page loads with the 'Rescue mission' badge and heading." },
      { id: "gb-items", label: "Urgent items from your saved scans appear, grouped by freshness." },
      { id: "gb-rescue", label: "Rescue meal suggestions appear automatically below the items list." },
      { id: "gb-empty", label: "If you have no urgent items, an empty state explains why (instead of an error)." },
    ],
  },
  {
    id: "install",
    title: "9. Install as an app",
    icon: Download,
    intro: "Add to Home Screen (PWA).",
    items: [
      { id: "pwa-banner", label: "The 'Install on your phone' banner appears near the bottom within ~5 seconds." },
      { id: "pwa-android", label: "Android: tap Install in the banner OR Chrome menu → 'Add to Home screen'; app icon lands on the home screen." },
      { id: "pwa-ios", label: "iPhone Safari: tap Share → 'Add to Home Screen'; app icon lands on the home screen." },
      { id: "pwa-launch", label: "Launching from the home-screen icon opens the app full-screen (no browser chrome)." },
    ],
  },
  {
    id: "layout",
    title: "10. Layout & buttons sweep",
    icon: Smartphone,
    intro: "Spot-check every screen for clipping or overlap.",
    items: [
      { id: "layout-tabbar", label: "Bottom tab bar (Fridge / Cupboard / Leftovers / Shop / Savings) is visible and not overlapped by content." },
      { id: "layout-safe-area", label: "Bottom tab bar sits above the iPhone home indicator (no buttons hidden behind it)." },
      { id: "layout-header", label: "Header on every page shows the logo, sign-in/account, and menu without clipping." },
      { id: "layout-text", label: "No headings or button labels are cut off on the narrowest device you have." },
      { id: "layout-tap-targets", label: "Every primary button is comfortably tappable (no accidental neighbor hits)." },
    ],
  },
];

const STORAGE_KEY = "tfc.test-checklist.v1";

function loadState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") ?? {};
  } catch {
    return {};
  }
}

function TestChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setChecked(loadState());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {}
  }, [checked, mounted]);

  const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function resetAll() {
    if (typeof window !== "undefined" && !window.confirm("Reset all checkmarks?")) return;
    setChecked({});
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6 sm:pt-10">
        <header className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">QA</div>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            Phone scan test checklist
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Walk this list on your iPhone and on your Android. Tap to mark items done — progress is
            saved on this device.
          </p>

          <div className="mt-5 rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-foreground">
                {done} / {total} checks complete
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/scan">Open /scan</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/going-bad">Open /going-bad</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/auth">Open /auth</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={resetAll}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const sectionDone = section.items.filter((i) => checked[i.id]).length;
            return (
              <Card key={section.id} className="ring-paper border-border/60 bg-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg leading-tight tracking-tight sm:text-xl">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">{section.intro}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {sectionDone}/{section.items.length}
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  {section.items.map((item) => {
                    const isChecked = !!checked[item.id];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                            isChecked
                              ? "border-success/40 bg-success/[0.06]"
                              : "border-border/60 bg-secondary/30 hover:bg-secondary/60",
                          )}
                          aria-pressed={isChecked}
                        >
                          <span
                            className={cn(
                              "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                              isChecked
                                ? "border-success bg-success text-success-foreground"
                                : "border-border bg-card",
                            )}
                            aria-hidden
                          >
                            {isChecked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 flex-1 text-sm leading-snug",
                              isChecked ? "text-muted-foreground line-through" : "text-foreground",
                            )}
                          >
                            {item.label}
                            {item.hint && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {item.hint}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Found a bug? Note the section + item number and share with a screenshot.
        </p>
      </div>
    </div>
  );
}
