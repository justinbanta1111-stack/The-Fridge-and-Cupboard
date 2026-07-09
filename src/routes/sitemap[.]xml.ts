import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://thefridgeandcupboard.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about-chef", changefreq: "monthly", priority: "0.7" },
  { path: "/features", changefreq: "monthly", priority: "0.7" },
  { path: "/scan", changefreq: "monthly", priority: "0.8" },
  { path: "/rescue", changefreq: "monthly", priority: "0.7" },
  { path: "/savings", changefreq: "monthly", priority: "0.7" },
  { path: "/meal-plan", changefreq: "monthly", priority: "0.7" },
  { path: "/health", changefreq: "monthly", priority: "0.6" },
  { path: "/kids", changefreq: "monthly", priority: "0.6" },
  { path: "/seniors", changefreq: "monthly", priority: "0.6" },
  { path: "/bodybuilder", changefreq: "monthly", priority: "0.6" },
  { path: "/fasting", changefreq: "monthly", priority: "0.6" },
  { path: "/drinks", changefreq: "monthly", priority: "0.6" },
  { path: "/around-the-world", changefreq: "monthly", priority: "0.6" },
  { path: "/kitchen-basics", changefreq: "monthly", priority: "0.6" },
  { path: "/kitchen-tools", changefreq: "monthly", priority: "0.6" },
  { path: "/learn", changefreq: "monthly", priority: "0.6" },
  { path: "/academy", changefreq: "monthly", priority: "0.6" },
  { path: "/pro", changefreq: "monthly", priority: "0.7" },
  { path: "/grocery-plus", changefreq: "monthly", priority: "0.6" },
  { path: "/community", changefreq: "monthly", priority: "0.5" },
  { path: "/support", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/subscription-terms", changefreq: "yearly", priority: "0.3" },
  { path: "/auth", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
