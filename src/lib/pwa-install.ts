export type Platform = "ios" | "android" | "desktop" | "unknown";

export type PwaDiagnosticsSnapshot = {
  serviceWorkerActive: boolean;
  beforeInstallPromptDetected: boolean;
  appInstallable: boolean;
  installPromptAvailable: boolean;
  manifestLoaded: boolean;
  installed: boolean;
  platform: Platform;
  isSecureContext: boolean;
  isIframe: boolean;
  isChromium: boolean;
  manifestValid: boolean | null;
  serviceWorkerScope: string;
  registrationError: string;
  reason: string;
};

type PwaWindowState = PwaDiagnosticsSnapshot & {
  subscribers: Set<(snapshot: PwaDiagnosticsSnapshot) => void>;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

declare global {
  interface Window {
    __tfcPwaEarlyListener?: boolean;
    __tfcPwaSetupComplete?: boolean;
    __tfcPwaState?: Partial<PwaWindowState>;
    __tfcDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const SW_PATH = "/sw.js";
const LEGACY_SW_PATHS = ["/sw.js", "/service-worker.js"];
const PWA_CLEANUP_VERSION = "20260617-safari-sw-off";

function hasWindow() {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function isStandalone() {
  if (!hasWindow()) return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function detectPlatform(): Platform {
  if (!hasWindow()) return "unknown";
  const ua = navigator.userAgent;
  const isAppleTouchDevice = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if ((/iPad|iPhone|iPod/.test(ua) || isAppleTouchDevice) && !("MSStream" in window)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function detectChromium() {
  if (!hasWindow()) return false;
  const ua = navigator.userAgent;
  return /Chrome|CriOS|Edg|SamsungBrowser/i.test(ua) && !/Firefox|FxiOS|OPR|Opera/i.test(ua);
}

function isSafariFamily() {
  if (!hasWindow()) return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Opera|SamsungBrowser/i.test(ua);
}

function isPreviewHost() {
  if (!hasWindow()) return false;
  const host = window.location.hostname;
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

function baseSnapshot(): PwaDiagnosticsSnapshot {
  return {
    serviceWorkerActive: false,
    beforeInstallPromptDetected: false,
    appInstallable: false,
    installPromptAvailable: false,
    manifestLoaded: false,
    installed: false,
    platform: "unknown",
    isSecureContext: false,
    isIframe: false,
    isChromium: false,
    manifestValid: null,
    serviceWorkerScope: "",
    registrationError: "",
    reason: "Checking install status…",
  };
}

function ensureState(): PwaWindowState {
  const existing = window.__tfcPwaState || {};
  const state = {
    ...baseSnapshot(),
    ...existing,
    subscribers: existing.subscribers instanceof Set ? existing.subscribers : new Set(),
  } as PwaWindowState;

  state.platform = detectPlatform();
  state.installed = isStandalone();
  state.isSecureContext = window.isSecureContext;
  state.isIframe = window.top !== window.self;
  state.isChromium = detectChromium();
  state.installPromptAvailable = Boolean(window.__tfcDeferredInstallPrompt);
  state.beforeInstallPromptDetected = Boolean(state.beforeInstallPromptDetected || state.installPromptAvailable);
  state.appInstallable = computeAppInstallable(state);
  state.reason = determineReason(state);
  window.__tfcPwaState = state;
  return state;
}

function computeAppInstallable(state: PwaDiagnosticsSnapshot) {
  if (state.installed) {
    return true;
  }
  return Boolean(
    state.manifestValid === true &&
    state.isSecureContext &&
    !state.isIframe &&
    state.isChromium,
  );
}

function determineReason(state: PwaDiagnosticsSnapshot) {
  if (state.installed) return "The app is already installed on this device.";
  if (!state.isSecureContext) {
    return "Native install prompts require HTTPS. Open the published secure website.";
  }
  if (state.isIframe) {
    return "Native install prompts are blocked inside embedded previews. Open the published site directly in Android Chrome.";
  }
  if (!import.meta.env.PROD || isPreviewHost()) {
    return "Native Android install prompts are only available on the published website. Preview mode does not register the service worker.";
  }
  if (state.platform === "ios") {
    return "iPhone and iPad do not support the native Android/Chrome install prompt. Use Share, then Add to Home Screen.";
  }
  if (!state.isChromium) {
    return "This browser does not expose the native beforeinstallprompt flow. Use Android Chrome or Samsung Internet.";
  }
  if (state.registrationError) {
    return `Service worker registration failed: ${state.registrationError}`;
  }
  if (!state.manifestLoaded) {
    return "The web app manifest has not loaded yet. Open the published site directly, then refresh once.";
  }
  if (state.manifestValid === false) {
    return "The web app manifest is missing required install metadata.";
  }
  if (state.installPromptAvailable) {
    return "Native Android install prompt is ready. Tap Install App inside the Add to Phone popup to launch it.";
  }
  if (state.beforeInstallPromptDetected) {
    return "Chrome detected installability, but the prompt was already used or dismissed in this session. Refresh and tap Add to Phone again.";
  }
  return "Chrome has not fired beforeinstallprompt yet. Common causes: app already installed, Chrome recently dismissed the prompt, or Chrome has not rechecked installability after the service worker became active.";
}

function publish(patch: Partial<PwaDiagnosticsSnapshot>) {
  if (!hasWindow()) return;
  const state = ensureState();
  Object.assign(state, patch);
  state.installed = isStandalone();
  state.installPromptAvailable = patch.installPromptAvailable ?? Boolean(window.__tfcDeferredInstallPrompt);
  state.beforeInstallPromptDetected = Boolean(
    patch.beforeInstallPromptDetected ?? state.beforeInstallPromptDetected ?? state.installPromptAvailable,
  );
  state.appInstallable = computeAppInstallable(state);
  state.reason = determineReason(state);
  window.__tfcPwaState = state;
  const snapshot = getPwaDiagnosticsSnapshot();
  state.subscribers.forEach((subscriber) => subscriber(snapshot));
  window.dispatchEvent(new CustomEvent("tfc:pwa-update", { detail: snapshot }));
}

async function validateManifest() {
  try {
    const response = await fetch(`/manifest.json?v=${PWA_CLEANUP_VERSION}`, { cache: "no-store" });
    if (!response.ok) {
      publish({ manifestLoaded: false, manifestValid: false });
      return;
    }
    const manifest = await response.json();
    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    const hasName = Boolean(manifest.name || manifest.short_name);
    const hasDisplay = ["standalone", "fullscreen", "minimal-ui"].includes(manifest.display);
    const hasStartUrl = Boolean(manifest.start_url);
    const has192 = icons.some((icon: { sizes?: string }) => /192x192/.test(icon.sizes || ""));
    const has512 = icons.some((icon: { sizes?: string }) => /512x512/.test(icon.sizes || ""));
    publish({ manifestLoaded: true, manifestValid: hasName && hasDisplay && hasStartUrl && has192 && has512 });
  } catch {
    publish({ manifestLoaded: false, manifestValid: false });
  }
}

function isMatchingLegacyServiceWorker(registration: ServiceWorkerRegistration) {
  return LEGACY_SW_PATHS.some((path) => {
    const absolutePath = `${window.location.origin}${path}`;
    return (
      registration.active?.scriptURL === absolutePath ||
      registration.installing?.scriptURL === absolutePath ||
      registration.waiting?.scriptURL === absolutePath ||
      registration.scope === `${window.location.origin}/`
    );
  });
}

function isAppShellCache(name: string) {
  return (
    /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name) ||
    /workbox|vite|tanstack|app-shell|fridge|cupboard|tfc|sw-cache|pwa/i.test(name)
  );
}

async function clearAppShellCaches() {
  if (!("caches" in window)) return;
  try {
    const cacheNames = await caches.keys();
    await Promise.allSettled(cacheNames.filter(isAppShellCache).map((name) => caches.delete(name)));
  } catch {
    // Best effort only — never block app startup.
  }
}

async function refreshServiceWorkerStatus() {
  if (!("serviceWorker" in navigator)) {
    publish({
      serviceWorkerActive: false,
      registrationError: "Service workers are not supported in this browser.",
    });
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    publish({
      serviceWorkerActive: Boolean(registration?.active),
      serviceWorkerScope: registration?.scope || "",
    });
  } catch (error) {
    publish({
      registrationError:
        error instanceof Error ? error.message : "Unknown service worker status error",
    });
  }
}

async function unregisterMatchingServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter(isMatchingLegacyServiceWorker)
        .map((registration) => registration.unregister()),
    );
  } catch {
    // Service worker cleanup must never block page load.
  }
  publish({ serviceWorkerActive: false, serviceWorkerScope: "" });
}

export async function cleanupBrokenPwaState() {
  if (!hasWindow()) return;
  try {
    const previousVersion = localStorage.getItem("tfc.pwaCleanupVersion");
    if (previousVersion !== PWA_CLEANUP_VERSION) {
      await clearAppShellCaches();
      localStorage.setItem("tfc.pwaCleanupVersion", PWA_CLEANUP_VERSION);
    } else if (isSafariFamily() || detectPlatform() === "ios" || window.location.search.includes("sw=off")) {
      await clearAppShellCaches();
    }
  } catch {
    await clearAppShellCaches();
  }
  await unregisterMatchingServiceWorkers();
}

export function setupPwaInstallDiagnostics() {
  if (!hasWindow()) return;
  ensureState();

  if (!window.__tfcPwaSetupComplete) {
    window.__tfcPwaSetupComplete = true;
    window.addEventListener("appinstalled", () => {
      console.info("[PWA] appinstalled event fired");
      window.__tfcDeferredInstallPrompt = null;
      publish({
        installed: true,
        installPromptAvailable: false,
        beforeInstallPromptDetected: true,
      });
    });
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      window.__tfcDeferredInstallPrompt = event as BeforeInstallPromptEvent;
      publish({
        beforeInstallPromptDetected: true,
        installPromptAvailable: true,
      });
    });
    navigator.serviceWorker?.addEventListener?.("controllerchange", () => {
      void refreshServiceWorkerStatus();
    });
  }

  void cleanupBrokenPwaState();
  void validateManifest();
  void refreshServiceWorkerStatus();
}

export async function registerPwaServiceWorker() {
  if (!hasWindow() || !("serviceWorker" in navigator)) {
    publish({
      serviceWorkerActive: false,
      registrationError: "Service workers are not supported in this browser.",
    });
    return;
  }

  setupPwaInstallDiagnostics();
  await cleanupBrokenPwaState();
  publish({ registrationError: "", serviceWorkerActive: false, serviceWorkerScope: "" });
}

export function getDeferredInstallPrompt() {
  if (!hasWindow()) return null;
  return window.__tfcDeferredInstallPrompt ?? null;
}

export function clearDeferredInstallPrompt(outcome?: "accepted" | "dismissed") {
  if (!hasWindow()) return;
  window.__tfcDeferredInstallPrompt = null;
  publish({
    installed: outcome === "accepted" || isStandalone(),
    installPromptAvailable: false,
    beforeInstallPromptDetected: true,
  });
}

export function getPwaDiagnosticsSnapshot(): PwaDiagnosticsSnapshot {
  if (!hasWindow()) return baseSnapshot();
  const state = ensureState();
  return {
    serviceWorkerActive: state.serviceWorkerActive,
    beforeInstallPromptDetected: state.beforeInstallPromptDetected,
    appInstallable: state.appInstallable,
    installPromptAvailable: state.installPromptAvailable,
    manifestLoaded: state.manifestLoaded,
    installed: state.installed,
    platform: state.platform,
    isSecureContext: state.isSecureContext,
    isIframe: state.isIframe,
    isChromium: state.isChromium,
    manifestValid: state.manifestValid,
    serviceWorkerScope: state.serviceWorkerScope,
    registrationError: state.registrationError,
    reason: state.reason,
  };
}

export function subscribePwaDiagnostics(callback: (snapshot: PwaDiagnosticsSnapshot) => void) {
  if (!hasWindow()) return () => {};
  const state = ensureState();
  const onUpdate = () => callback(getPwaDiagnosticsSnapshot());
  state.subscribers.add(callback);
  window.addEventListener("tfc:pwa-update", onUpdate);
  callback(getPwaDiagnosticsSnapshot());
  return () => {
    state.subscribers.delete(callback);
    window.removeEventListener("tfc:pwa-update", onUpdate);
  };
}
