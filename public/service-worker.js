// Emergency kill-switch for any legacy service-worker.js registration.
// It does not intercept fetches; it clears old app-shell caches and then
// unregisters so Safari/iPhone can load the app from the network normally.

const SW_VERSION = "v4-safari-kill-switch-20260617";

function isAppShellCache(name) {
  return (
    /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name) ||
    /workbox|vite|tanstack|app-shell|fridge|cupboard|tfc|sw-cache|pwa/i.test(name)
  );
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.filter(isAppShellCache).map((name) => caches.delete(name)));
      } catch {
        // Cache cleanup is best-effort only.
      }
      try {
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
      } catch {
        // Do not block unregistering if a client cannot be refreshed.
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.SW_VERSION = SW_VERSION;