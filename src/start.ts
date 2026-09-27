import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { toRemoteUrl } from "./lib/native-api-origin";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  // Email/webhook routes authenticate themselves and must pass straight through.
  try {
    if (request?.url && new URL(request.url).pathname.startsWith("/lovable/")) {
      return await next();
    }
  } catch {
    /* fall through to the normal path */
  }
  try {
    return await next();
  } catch (error) {
    // Always log the full error (h3 HTTPError included) so production 500s are diagnosable.
    try {
      const e = error as Record<string, unknown> | null;
      console.error(
        "[ssr-error]",
        request?.url,
        e && typeof e === "object"
          ? JSON.stringify({
              name: e.name,
              message: e.message,
              stack: typeof e.stack === "string" ? String(e.stack).slice(0, 2000) : undefined,
              statusCode: e.statusCode,
              data: e.data,
              cause: e.cause instanceof Error ? String(e.cause.stack ?? e.cause).slice(0, 1000) : String(e.cause),
            })
          : String(error),
      );
    } catch {
      console.error("[ssr-error] unloggable", String(error));
    }
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// In the packaged phone app the page is served from the device, so calls that
// need the internet are sent to the live site instead of the local bundle.
const bundledAppFetch: typeof fetch = (input, init) => {
  if (typeof input === "string") return fetch(toRemoteUrl(input), init);
  if (input instanceof URL) return fetch(toRemoteUrl(input.toString()), init);
  if (input instanceof Request) return fetch(new Request(toRemoteUrl(input.url), input), init);
  return fetch(input, init);
};

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
  serverFns: { fetch: bundledAppFetch },
}));
