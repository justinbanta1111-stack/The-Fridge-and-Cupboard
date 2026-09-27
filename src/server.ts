import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

type CapturedNitroError = { error: unknown; context?: unknown };

// The nitro/h3 layer records the ORIGINAL error on the request context
// (req.context.nitro.errors) before swallowing it into a bare 500 JSON body.
// Read it back so the real stack reaches the server logs.
function drainCapturedRequestErrors(request: Request): unknown {
  const bag = request as unknown as {
    context?: { nitro?: { errors?: CapturedNitroError[] } };
  };
  const errors = bag.context?.nitro?.errors;
  if (!errors || errors.length === 0) return undefined;
  const first = errors[errors.length - 1];
  const original = first?.error ?? first;
  errors.length = 0;
  return original;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  request: Request,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const original =
    drainCapturedRequestErrors(request) ?? consumeLastCapturedError();
  console.error(original ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// The installed iOS / Android app runs from these device origins and calls the
// live site for AI, voice and scanning. WKWebView blocks those calls unless the
// server explicitly allows the app's origin (CORS), so allow exactly these.
const NATIVE_APP_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "https://localhost",
  "http://localhost",
]);

function nativeCorsHeaders(request: Request): Record<string, string> | null {
  const origin = request.headers.get("origin");
  if (!origin || !NATIVE_APP_ORIGINS.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      request.headers.get("access-control-request-headers") ??
      "authorization, content-type, x-tsr-serverfn, x-tsr-redirect, accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(response: Response, cors: Record<string, string> | null): Response {
  if (!cors) return response;
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const cors = nativeCorsHeaders(request);
    if (cors && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withCors(await normalizeCatastrophicSsrResponse(response, request), cors);
    } catch (error) {
      console.error(error);
      return withCors(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        cors,
      );
    }
  },
};
