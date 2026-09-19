import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import * as React from "react";
import { canSelfHeal, describeLaunchError, selfHealAndReload } from "./lib/launch-recovery";
import { isNativeApp } from "./lib/native-runtime";

function DefaultError({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const details = describeLaunchError(error);
  React.useEffect(() => {
    // Installed app only: clear this app's own saved data once and reload so a
    // full or damaged store cannot keep the first screen from opening.
    if (isNativeApp() && canSelfHeal()) selfHealAndReload();
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfaf4] px-4">
      <div className="max-w-md text-center">
        <p className="text-base font-medium text-stone-800">
          Something didn't load. Tap to try again.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              try { router.invalidate(); } catch {}
              try { reset(); } catch {}
            }}
            className="inline-flex items-center justify-center rounded-full bg-[#e36b3f] px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[#c95a32] active:scale-[0.98]"
          >
            Try Again
          </button>
          <button
            onClick={() => selfHealAndReload()}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 active:scale-[0.98]"
          >
            Reset and reopen
          </button>
        </div>
        <details className="mt-5 text-left">
          <summary className="cursor-pointer text-xs text-stone-500">Details</summary>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-md bg-stone-100 p-3 text-[11px] leading-snug text-stone-600">
            {details}
          </pre>
        </details>
      </div>
    </div>
  );
}


function DefaultNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfaf4] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-stone-800">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-stone-800">Page not found</h2>
        <p className="mt-2 text-sm text-stone-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-[#e36b3f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#c95a32]"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultError,
    defaultNotFoundComponent: DefaultNotFound,
  });

  return router;
};
