import { useEffect, useState, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, CheckCircle2, ExternalLink, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  getPwaDiagnosticsSnapshot,
  subscribePwaDiagnostics,
  type PwaDiagnosticsSnapshot,
  type Platform,
} from "@/lib/pwa-install";
import appIcon from "@/assets/chef-super-j-icon.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { APP_STORE_URL, storeListingUrl } from "@/lib/store-links";
import { nativePlatform } from "@/lib/native-runtime";

export const INSTALL_DISMISS_KEY = "fc.installPrompt.dismissedAt";
export const INSTALLED_FLAG_KEY = "fc.pwa.installed";
/** iOS Safari never fires `appinstalled`, so we remember that we showed the steps. */
export const IOS_PROMPTED_KEY = "fc.pwa.iosPromptedAt";

function isNativeApp() {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; platform?: string } }).Capacitor;
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === "function") return cap.isNativePlatform();
  } catch {
    /* ignore */
  }
  return cap.platform === "ios" || cap.platform === "android";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return true;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function readInstalledFlag() {
  try {
    return localStorage.getItem(INSTALLED_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function writeInstalledFlag() {
  try {
    localStorage.setItem(INSTALLED_FLAG_KEY, "1");
  } catch {
    /* ignore */
  }
}

function markIosPrompted() {
  try { localStorage.setItem(IOS_PROMPTED_KEY, String(Date.now())); } catch { /* ignore */ }
}

function readIosPrompted() {
  try { return Boolean(localStorage.getItem(IOS_PROMPTED_KEY)); } catch { return false; }
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (!isIos) return false;
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line|MicroMessenger/i.test(ua);
  if (isOtherBrowser) return false;
  return /Safari/.test(ua);
}

type BrowserKind =
  | "ios-safari"
  | "ios-chrome"
  | "ios-firefox"
  | "ios-edge"
  | "ios-inapp"
  | "android-chrome"
  | "android-samsung"
  | "android-brave"
  | "android-firefox"
  | "android-edge"
  | "android-opera"
  | "android-inapp"
  | "desktop-chrome"
  | "desktop-edge"
  | "desktop-brave"
  | "desktop-safari"
  | "desktop-firefox"
  | "desktop-other";

function detectBrowser(platform: Platform): BrowserKind {
  if (typeof navigator === "undefined") return "desktop-other";
  const ua = navigator.userAgent;
  if (platform === "ios") {
    if (/FBAN|FBAV|Instagram|Line|MicroMessenger|TikTok|Snapchat/i.test(ua)) return "ios-inapp";
    if (/CriOS/i.test(ua)) return "ios-chrome";
    if (/FxiOS/i.test(ua)) return "ios-firefox";
    if (/EdgiOS/i.test(ua)) return "ios-edge";
    return "ios-safari";
  }
  if (platform === "android") {
    if (/FBAN|FBAV|Instagram|Line|MicroMessenger|TikTok|Snapchat/i.test(ua)) return "android-inapp";
    if (/SamsungBrowser/i.test(ua)) return "android-samsung";
    if (/Brave/i.test(ua) || (typeof (navigator as Navigator & { brave?: unknown }).brave !== "undefined")) return "android-brave";
    if (/EdgA/i.test(ua)) return "android-edge";
    if (/OPR|Opera/i.test(ua)) return "android-opera";
    if (/Firefox|FxiOS/i.test(ua)) return "android-firefox";
    return "android-chrome";
  }
  if (/Edg\//i.test(ua)) return "desktop-edge";
  if (/Brave/i.test(ua) || (typeof (navigator as Navigator & { brave?: unknown }).brave !== "undefined")) return "desktop-brave";
  if (/Chrome\//i.test(ua) && !/Edg|OPR/i.test(ua)) return "desktop-chrome";
  if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) return "desktop-safari";
  if (/Firefox/i.test(ua)) return "desktop-firefox";
  return "desktop-other";
}

function browserInstructions(kind: BrowserKind): { title: string; steps: string } {
  switch (kind) {
    case "ios-safari":
      return { title: "iPhone Safari", steps: "Tap the Share button, then Add to Home Screen." };
    case "ios-chrome":
      return { title: "iPhone Chrome", steps: "Tap the Share icon in the address bar, then Add to Home Screen." };
    case "ios-edge":
      return { title: "iPhone Edge", steps: "Tap the menu (•••), then Share → Add to Home Screen." };
    case "ios-firefox":
      return { title: "iPhone Firefox", steps: "iOS Firefox can't install apps. Open this page in Safari." };
    case "ios-inapp":
      return { title: "In-app browser", steps: "Tap the • • • menu and choose Open in Safari, then Add to Home Screen." };
    case "android-chrome":
      return { title: "Android Chrome", steps: "Tap the ⋮ menu, then Install app or Add to Home Screen." };
    case "android-samsung":
      return { title: "Samsung Internet", steps: "Tap the ☰ menu at the bottom, then Add page to → Home screen." };
    case "android-brave":
      return { title: "Brave (Android)", steps: "Tap the ⋮ menu, then Add to Home screen or Install app." };
    case "android-edge":
      return { title: "Edge (Android)", steps: "Tap the ••• menu, then Add to phone." };
    case "android-opera":
      return { title: "Opera (Android)", steps: "Tap the Opera menu, then Add to → Home screen." };
    case "android-firefox":
      return { title: "Firefox (Android)", steps: "Tap the ⋮ menu, then Install or Add to Home screen." };
    case "android-inapp":
      return { title: "In-app browser", steps: "Tap the ⋮ menu and choose Open in Chrome, then Install app." };
    case "desktop-chrome":
      return { title: "Desktop Chrome", steps: "Click the install icon in the address bar, or ⋮ → Install The Fridge & Cupboard." };
    case "desktop-edge":
      return { title: "Desktop Edge", steps: "Click the install icon in the address bar, or ••• → Apps → Install this site as an app." };
    case "desktop-brave":
      return { title: "Desktop Brave", steps: "Click the install icon in the address bar, or ☰ → Install The Fridge & Cupboard." };
    case "desktop-safari":
      return { title: "Desktop Safari", steps: "From the File menu, choose Add to Dock." };
    case "desktop-firefox":
      return { title: "Desktop Firefox", steps: "Firefox desktop doesn't install web apps. Use Chrome, Edge, Brave or Safari." };
    default:
      return { title: "Install", steps: "Use your browser menu and choose Install or Add to Home Screen." };
  }
}


export function markDismissed() {
  try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
}

export function InstallAppButton({
  className,
  label = "Add App to Phone",
  showDiagnostics = false,
}: {
  className?: string;
  label?: string;
  showDiagnostics?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [iosPrompted, setIosPrompted] = useState(false);
  const [nativeIos, setNativeIos] = useState(false);
  // Existing members (already signed in) are already "in" the app — never
  // offer them the add/install prompt again.
  const [existingUser, setExistingUser] = useState(false);
  const [diagnostics, setDiagnostics] = useState<PwaDiagnosticsSnapshot>(() =>
    getPwaDiagnosticsSnapshot(),
  );

  const closeModal = () => {
    markDismissed();
    setOpen(false);
  };

  useEffect(() => {
    return subscribePwaDiagnostics((snapshot) => {
      setDiagnostics(snapshot);
      setPlatform(snapshot.platform);
      const standaloneNow = snapshot.installed || isStandalone();
      if (standaloneNow) {
        setStandalone(true);
        writeInstalledFlag();
      }
      setInstalled((prev) => prev || standaloneNow);
    });
  }, []);

  // Remember installs across sessions so an installed user is never asked again.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readInstalledFlag()) setInstalled(true);

    const onInstalled = () => {
      writeInstalledFlag();
      setInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    type RelatedApp = { id?: string; platform?: string; url?: string };
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
    };
    void nav.getInstalledRelatedApps?.().then((apps) => {
      if (apps && apps.length > 0) {
        writeInstalledFlag();
        setInstalled(true);
      }
    }).catch(() => { /* ignore */ });

    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setExistingUser(Boolean(data.session?.user));
    }).catch(() => { /* ignore */ });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setExistingUser(Boolean(session?.user));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("tfc:close-install-modal", closeModal);
    return () => window.removeEventListener("tfc:close-install-modal", closeModal);
  }, []);

  // iOS Safari fallback: `appinstalled` and getInstalledRelatedApps() never fire there.
  // Re-check display-mode on every resume, and remember that we showed the steps so we
  // can ask the user once ("Already added it?") instead of relying on an event.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setNativeIos(isNativeApp() && nativePlatform() === "ios");
    setIosPrompted(readIosPrompted());

    const recheck = () => {
      if (isStandalone()) {
        writeInstalledFlag();
        setStandalone(true);
        setInstalled(true);
      }
    };
    recheck();

    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", recheck);
    window.addEventListener("visibilitychange", recheck);
    window.addEventListener("pageshow", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      mql?.removeEventListener?.("change", recheck);
      window.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, []);

  if (nativeIos) {
    return (
      <Button asChild className={cn("h-9 shrink-0 gap-1.5 px-3 text-xs", className)}>
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="View The Fridge and Cupboard in the App Store">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> View in App Store
        </a>
      </Button>
    );
  }

  const confirmInstalled = () => {
    writeInstalledFlag();
    setInstalled(true);
    setOpen(false);
  };

  async function handleClick(e: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if ("nativeEvent" in e && e.nativeEvent && !e.nativeEvent.isTrusted) return;
    try { (navigator as Navigator & { vibrate?: (p: number) => void }).vibrate?.(8); } catch { /* ignore */ }

    // Once the official App Store / Google Play listings are live, send people
    // straight to the right one for their device.
    const listing = storeListingUrl();
    if (listing) {
      window.open(listing, "_blank", "noopener,noreferrer");
      return;
    }

    if (isStandalone()) {
      setInstalled(true);
      setOpen(true);
      return;
    }


    const promptEvent = getDeferredInstallPrompt();
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        clearDeferredInstallPrompt(choice?.outcome);
        if (choice?.outcome === "accepted") {
          setInstalled(true);
        }
      } catch {
        clearDeferredInstallPrompt("dismissed");
      }
    }

    if (platform === "ios" || isIosSafari()) {
      markIosPrompted();
      setIosPrompted(true);
    }

    setOpen(true);
  }

  // Already running inside the installed app — nothing to offer. Signed-in
  // members who haven't installed still get the button (native app install).
  if (standalone || isStandalone()) return null;

  // Once installed, the browser and native app should not advertise installation again.
  if (installed) return null;

  const kind = detectBrowser(platform);
  const unsupportedBrowser = kind === "ios-firefox" || kind === "desktop-firefox";
  if (unsupportedBrowser) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-royal-deep px-5 py-2.5 text-sm font-bold text-ivory shadow-lg ring-1 ring-white/12 transition hover:scale-[1.02] hover:brightness-115 active:scale-[0.97] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal/50",
          className,
        )}
      >
        <img src={appIcon.url} alt="" className="h-5 w-5 rounded-md object-cover" /> {installed ? "Already installed" : label}
      </button>

      {iosPrompted && (kind === "ios-safari" || kind === "ios-chrome" || kind === "ios-edge") && (
        <button
          type="button"
          onClick={confirmInstalled}
          className="mt-1 block w-full text-center text-xs font-semibold text-muted-foreground underline underline-offset-2"
        >
          Already added it? Switch to Open App
        </button>
      )}

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative flex w-full max-w-md flex-col rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
            style={{ maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 rounded-t-2xl border-b border-border/60 bg-card/95 px-5 py-3 backdrop-blur">
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
                {installed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <img src={appIcon.url} alt="App icon" className="h-full w-full object-cover" />
                )}
              </div>
              <h2 className="font-display text-lg font-bold leading-tight">
                {installed ? "App is installed" : "Add to your home screen"}
              </h2>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div
              className="overflow-y-auto overscroll-contain px-5 pt-4"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
            >
              {installed ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  You're using the installed app. Look for The Fridge &amp; Cupboard icon on your home screen.
                </p>
              ) : (() => {
                const kind = detectBrowser(platform);
                const info = browserInstructions(kind);
                const needsSafariShortcut = kind === "ios-firefox" || kind === "ios-inapp";
                const isIosSafariNow = kind === "ios-safari";
                return (
                  <div className="mt-2 space-y-4">
                    <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {info.title}
                      </div>
                      <p className="mt-1 text-sm text-foreground">{info.steps}</p>
                    </div>
                    {isIosSafariNow && (
                      <div className="flex flex-col items-center text-primary">
                        <Share className="h-5 w-5" />
                        <ArrowDown className="mt-1 h-7 w-7 animate-bounce" />
                        <span className="mt-1 text-xs font-semibold text-muted-foreground">
                          Look at the Safari toolbar
                        </span>
                      </div>
                    )}
                    {needsSafariShortcut && (
                      <Button
                        className="w-full gap-2"
                        onClick={() => {
                          const url = window.location.href.replace(/^https?:\/\//, "");
                          window.location.href = `x-safari-https://${url}`;
                          setTimeout(closeModal, 400);
                        }}
                      >
                        <Smartphone className="h-4 w-4" /> Open in Safari
                      </Button>
                    )}
                    <button
                      type="button"
                      className="block w-full text-xs text-muted-foreground underline"
                      onClick={async () => {
                        try { await navigator.clipboard?.writeText(window.location.href); } catch { /* ignore */ }
                        closeModal();
                      }}
                    >
                      Copy link
                    </button>
                    {kind.startsWith("ios-") && (
                      <Button className="w-full gap-2" onClick={confirmInstalled}>
                        <CheckCircle2 className="h-4 w-4" /> I added it to my Home Screen
                      </Button>
                    )}
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={closeModal}
                    >
                      Got it
                    </Button>
                  </div>
                );
              })()}


              {showDiagnostics && (
                <details className="mt-5 rounded-xl border border-border/70 bg-secondary/40 p-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-semibold text-foreground">Install status</summary>
                  <PwaDiagnosticsPanel diagnostics={diagnostics} />
                </details>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function PwaDiagnosticsPanel({
  diagnostics,
  compact = false,
}: {
  diagnostics?: PwaDiagnosticsSnapshot;
  compact?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<PwaDiagnosticsSnapshot | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (diagnostics) {
      setSnapshot(diagnostics);
      return;
    }
    setSnapshot(getPwaDiagnosticsSnapshot());
    return subscribePwaDiagnostics(setSnapshot);
  }, [diagnostics]);

  if (!mounted || !snapshot) {
    return (
      <div
        className="mt-4 rounded-xl border border-border/70 bg-secondary/50 p-3 text-left text-xs text-foreground"
        suppressHydrationWarning
      />
    );
  }

  return (
    <div
      className="mt-4 rounded-xl border border-border/70 bg-secondary/50 p-3 text-left text-xs text-foreground"
      suppressHydrationWarning
    >
      {!compact && <div className="font-semibold">Install diagnostics</div>}
      <div className="mt-2 grid gap-1.5">
        {snapshot.platform === "ios" ? (
          <div className="flex items-center justify-between gap-3">
            <span>Install method =</span>
            <span className="font-bold text-primary">Manual (Share → Add to Home Screen)</span>
          </div>
        ) : (
          <DiagnosticRow label="Install prompt available" value={snapshot.installPromptAvailable} />
        )}
        <DiagnosticRow label="Service worker active" value={snapshot.serviceWorkerActive} />
        <DiagnosticRow label="Manifest loaded" value={snapshot.manifestLoaded} />
      </div>
      <p className="mt-2 rounded-lg bg-background/70 p-2 text-[11px] leading-relaxed text-muted-foreground">
        {snapshot.reason}
      </p>
    </div>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label} =</span>
      <span className={cn("font-bold", value ? "text-primary" : "text-destructive")}>
        {value ? "yes" : "no"}
      </span>
    </div>
  );
}
