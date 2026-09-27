import { SITE_URL, SITE_NAME } from "./content";

export type OgKind = "recipe" | "ingredient" | "question" | "cuisine" | "leftover" | "diet" | "default";

/** Absolute URL of the generated 1200x630 share image for a page. */
export function ogImageUrl({
  title,
  subtitle,
  kind = "default",
  eyebrow = SITE_NAME,
}: {
  title: string;
  subtitle?: string;
  kind?: OgKind;
  eyebrow?: string;
}) {
  const q = new URLSearchParams({ title, kind, eyebrow });
  if (subtitle) q.set("subtitle", subtitle);
  return `${SITE_URL}/api/public/og?${q.toString()}`;
}

export function pageHead({
  title,
  description,
  path,
  type = "article",
  jsonLd,
  ogKind = "default",
  ogEyebrow,
  ogTitle,
  image: imageOverride,
}: {
  title: string;
  description: string;
  path: string;
  type?: string;
  jsonLd?: unknown[];
  ogKind?: OgKind;
  ogEyebrow?: string;
  ogTitle?: string;
  /** Absolute https URL of a real photo to use instead of the generated card. */
  image?: string;
}) {
  const url = `${SITE_URL}${path}`;
  const image =
    imageOverride ??
    ogImageUrl({
      title: ogTitle ?? title.split(" — ")[0] ?? title,
      subtitle: description,
      kind: ogKind,
      ...(ogEyebrow ? { eyebrow: ogEyebrow } : {}),
    });

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: (jsonLd ?? []).map((data) => ({
      type: "application/ld+json",
      children: JSON.stringify(data),
    })),
  };
}


export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export const noindexMeta = { name: "robots", content: "noindex, nofollow" };
