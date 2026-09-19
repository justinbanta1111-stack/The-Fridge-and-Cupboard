import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { VoiceGreeting } from "@/components/VoiceGreeting";
import { VoiceMuteButton } from "@/components/VoiceMuteButton";
import { VoiceStateIndicator } from "@/components/VoiceStateIndicator";
import { NavControls } from "@/components/NavControls";
import { NativeDeviceSetup } from "@/components/NativeDeviceSetup";
import { OfflineBanner } from "@/components/OfflineBanner";
import { TalkToChefButton } from "@/components/TalkToChefButton";

import { ExpiryReminderWatcher } from "@/components/ExpiryReminderWatcher";
import { VoiceStatusMeter } from "@/components/VoiceStatusMeter";
// ChefVoiceChat removed — voice runs silently in background via VoiceGreeting.
import { Celebration } from "@/components/effects/Celebration";
import { ReferralCapture } from "@/components/ReferralCapture";
import { RevealObserver } from "@/components/RevealObserver";
import { setupPwaInstallDiagnostics } from "@/lib/pwa-install";
import { LanguageProvider } from "@/lib/i18n/context";
import bundledGreetingAudioUrl from "@/assets/chef-welcome.mp3?url";
import { canSelfHeal, describeLaunchError, selfHealAndReload } from "@/lib/launch-recovery";
import { isNativeApp } from "@/lib/native-runtime";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const details = describeLaunchError(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    // Installed app only: a full or damaged saved-state store can stop the
    // first screen from rendering. Clear this app's own saved data once and
    // reload, so the app opens instead of showing a dead end.
    if (isNativeApp() && canSelfHeal()) selfHealAndReload();
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-base font-medium text-foreground">
          Something didn't load. Tap to try again.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              try { router.invalidate(); } catch {}
              try { reset(); } catch {}
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            Try Again
          </button>
          <button
            onClick={() => selfHealAndReload()}
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors active:scale-[0.98]"
          >
            Reset and reopen
          </button>
        </div>
        <details className="mt-5 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">Details</summary>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-[11px] leading-snug text-muted-foreground">
            {details}
          </pre>
        </details>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#0b3d91" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "The Fridge & Cupboard" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      { title: "The Fridge and Cupboard — Use What You Already Have" },
      { name: "description", content: "Scan your fridge, cupboard, and leftovers. The Fridge and Cupboard helps you cook with what you already own, save money, and reduce food waste. Not a delivery or ordering app." },
      { name: "author", content: "Chef Justin 'Super J' Banta" },
      { property: "og:site_name", content: "The Fridge and Cupboard" },
      { property: "og:title", content: "The Fridge and Cupboard — Use What You Already Have" },
      { property: "og:description", content: "AI-powered Use-What-You-Have meal planning. Scan your fridge, cupboard, and leftovers to save money and waste less food." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "The Fridge and Cupboard — Use What You Already Have" },
      { name: "twitter:description", content: "Scan your fridge, cupboard, and leftovers. Save money. Waste less food. Cook smarter tonight." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/49101498-103a-4f5d-86d3-6bffba3b2687/id-preview-c7afb560--caae737c-6f5c-4516-bf16-adb295f200c9.lovable.app-1780970237392.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/49101498-103a-4f5d-86d3-6bffba3b2687/id-preview-c7afb560--caae737c-6f5c-4516-bf16-adb295f200c9.lovable.app-1780970237392.png" },
      { name: "google-site-verification", content: "TI78fwB61wsqlG_e9UbgbpjcG6PVHx6gLnsfCCqp8mo" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json?v=20260617-safari-sw-off" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/images/fridge-superj.png" },
      { rel: "shortcut icon", href: "/images/fridge-superj.png" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/images/fridge-superj.png" },
      { rel: "preload", href: bundledGreetingAudioUrl, as: "audio", type: "audio/mpeg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,600&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        children: `(function(){var v='20260617-safari-sw-off';function appCache(n){return /(^|-)precache-v\\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(n)||/workbox|vite|tanstack|app-shell|fridge|cupboard|tfc|sw-cache|pwa/i.test(n)}function clean(){try{if('caches'in window)caches.keys().then(function(names){return Promise.allSettled(names.filter(appCache).map(function(n){return caches.delete(n)}))}).catch(function(){})}catch(e){}try{if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(function(regs){return Promise.allSettled(regs.filter(function(r){return r.scope===location.origin+'/'||['/sw.js','/service-worker.js'].some(function(p){var u=location.origin+p;return (r.active&&r.active.scriptURL===u)||(r.waiting&&r.waiting.scriptURL===u)||(r.installing&&r.installing.scriptURL===u)})}).map(function(r){return r.unregister()}))}).catch(function(){})}catch(e){}}try{if(localStorage.getItem('tfc.pwaCleanupVersion')!==v){clean();localStorage.setItem('tfc.pwaCleanupVersion',v)}else if(/iPad|iPhone|iPod|Safari/i.test(navigator.userAgent)&&!/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Opera|SamsungBrowser/i.test(navigator.userAgent)){clean()}}catch(e){clean()}})();`,
      },
      {
        children: `(function(){if(window.__tfcPwaEarlyListener)return;window.__tfcPwaEarlyListener=true;window.__tfcDeferredInstallPrompt=null;window.addEventListener('beforeinstallprompt',function(event){event.preventDefault();window.__tfcDeferredInstallPrompt=event;window.dispatchEvent(new CustomEvent('tfc:pwa-update'));});window.addEventListener('appinstalled',function(){window.__tfcDeferredInstallPrompt=null;});})();`,
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "The Fridge and Cupboard",
          url: "https://thefridgeandcupboard.com",
          applicationCategory: "LifestyleApplication",
          description: "AI-powered Use-What-You-Already-Have meal planning. Scan your fridge, cupboard, and leftovers to save money and reduce food waste. Not a food ordering, delivery, or takeout service.",
          operatingSystem: "Web, iOS, Android",
          creator: {
            "@type": "Person",
            name: "Chef Justin 'Super J' Banta",
            jobTitle: "Professional Chef",
            description: "Career chef and brain-tumor survivor whose mission is to help families save money, waste less food, and cook confidently with what's already in the kitchen.",
          },
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    setupPwaInstallDiagnostics();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <RevealObserver />
        <Toaster richColors position="top-center" />
        <VoiceGreeting />
        <VoiceStatusMeter />
        <VoiceMuteButton />
        <VoiceStateIndicator />
        <NavControls />
        <div
          className="pointer-events-none fixed right-3 z-40"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <TalkToChefButton className="pointer-events-auto max-w-[11rem] shadow-lg" />
        </div>

        <ExpiryReminderWatcher />
        <NativeDeviceSetup />
        <OfflineBanner />
        {/* ChefVoiceChat removed — voice runs silently in background. */}
        <Celebration />
        <ReferralCapture />
        <footer className="py-6 text-center text-xs text-muted-foreground">
          <nav aria-label="Cooking guides" className="mx-auto mb-3 flex max-w-3xl flex-wrap justify-center gap-x-4 gap-y-2 px-4">
            <Link to="/search" search={{ q: "" }} className="hover:text-foreground">Search</Link>
            <Link to="/kitchen-guide" className="hover:text-foreground">Kitchen Guide</Link>
            <Link to="/how-to-make" className="hover:text-foreground">Recipes</Link>
            <Link to="/cooking-questions" className="hover:text-foreground">Cooking Questions</Link>
            <Link to="/ingredients" className="hover:text-foreground">Ingredients</Link>
            <Link to="/leftover-ideas" className="hover:text-foreground">Leftover Ideas</Link>
            <Link to="/cuisines" className="hover:text-foreground">Cuisines</Link>
            <Link to="/diets" className="hover:text-foreground">Dietary Meals</Link>
          </nav>
          &copy; 2026 The Fridge and Cupboard. All rights reserved.
        </footer>

      </LanguageProvider>
    </QueryClientProvider>
  );
}
