import { createFileRoute } from "@tanstack/react-router";

// NOTE: @cf-wasm/og is imported lazily inside the handler. A static import
// puts its WASM modules into the eager SSR module graph, which breaks every
// route on the deployed worker.

/**
 * Public Open Graph / Twitter card image generator.
 * 1200x630 PNG, unique per page via ?title=&subtitle=&kind=
 * No user data, no auth — safe for crawlers.
 */

const PALETTES: Record<string, { bg: string; accent: string; tint: string }> = {
  recipe: { bg: "#07312c", accent: "#f0c454", tint: "#37d6a5" },
  ingredient: { bg: "#0a2c33", accent: "#8fe36a", tint: "#57d0d6" },
  question: { bg: "#132a1f", accent: "#f0c454", tint: "#9fe07a" },
  cuisine: { bg: "#2a1a2e", accent: "#f7b267", tint: "#e6739f" },
  leftover: { bg: "#0e2a1d", accent: "#ffd166", tint: "#68d391" },
  diet: { bg: "#12283a", accent: "#7ee0c4", tint: "#f0c454" },
  default: { bg: "#07312c", accent: "#f0c454", tint: "#37d6a5" },
};

function clamp(value: string | null, max: number, fallback: string) {
  const v = (value ?? "").trim() || fallback;
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

export const Route = createFileRoute("/api/public/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        // If the on-the-fly card generator can't run in this environment,
        // serve the branded cover image so link previews are never broken.
        let ImageResponse: typeof import("@cf-wasm/og").ImageResponse;
        try {
          ({ ImageResponse } = await import("@cf-wasm/og"));
        } catch {
          return Response.redirect(new URL("/og-cover.jpg", url.origin).toString(), 302);
        }
        const title = clamp(url.searchParams.get("title"), 88, "The Fridge and Cupboard");
        const subtitle = clamp(url.searchParams.get("subtitle"), 130, "Cook what you already have.");
        const kind = (url.searchParams.get("kind") ?? "default").toLowerCase();
        const eyebrow = clamp(url.searchParams.get("eyebrow"), 40, "The Fridge and Cupboard");
        const p = PALETTES[kind] ?? PALETTES["default"]!;

        try {


        return new ImageResponse(
          (
            <div
              style={{
                width: "1200px",
                height: "630px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: `linear-gradient(135deg, ${p.bg} 0%, #041a18 100%)`,
                padding: "64px 72px",
                color: "#ffffff",
                fontFamily: "sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "18px",
                    height: "56px",
                    borderRadius: "9px",
                    background: p.accent,
                    display: "flex",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: "26px",
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                    color: p.tint,
                  }}
                >
                  {eyebrow}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: title.length > 52 ? "62px" : "74px", lineHeight: 1.1 }}>
                  {title}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: "24px",
                    fontSize: "30px",
                    lineHeight: 1.35,
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  {subtitle}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", fontSize: "26px", color: p.accent }}>thefridgeandcupboard.com</div>
                <div style={{ display: "flex", fontSize: "24px", color: "rgba(255,255,255,0.6)" }}>
                  Cook what you already have
                </div>
              </div>
            </div>
          ),
          {
            width: 1200,
            height: 630,
            headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
          },
        );
        } catch {
          return Response.redirect(new URL("/og-cover.jpg", url.origin).toString(), 302);
        }
      },

    },
  },
});
