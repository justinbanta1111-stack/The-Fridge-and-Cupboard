import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { CUISINES, SITE_URL } from "@/lib/seo/content";
import { pageHead, breadcrumbLd } from "@/lib/seo/meta";

export const Route = createFileRoute("/cuisines/")({
  head: () =>
    pageHead({
      title: "Cuisine Guides — Italian, Mexican, Asian, Indian & More",
      description:
        "Cook any cuisine with pantry staples you already own. Signature dishes, core ingredients, and the techniques that make each style work.",
      path: "/cuisines",
      ogKind: "cuisine",
      type: "website",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Cuisines", path: "/cuisines" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Cuisine guides",
          itemListElement: CUISINES.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            url: `${SITE_URL}/cuisines/${c.slug}`,
          })),
        },
      ],
    }),
  component: CuisinesIndex,
});

function CuisinesIndex() {
  return (
    <GuidePage
      eyebrow="Cuisine guides"
      title="Cook Any Cuisine From Your Own Kitchen"
      intro="Each guide covers the pantry staples, signature dishes, and core techniques for a style of cooking — so you can make it with what you already have."
      breadcrumbs={[{ label: "Home", to: "/" }]}
    >
      <GuideSection heading="Browse cuisines">
        <LinkGrid
          items={CUISINES.map((c) => ({
            to: "/cuisines/$cuisine",
            params: { cuisine: c.slug },
            title: `${c.name} cooking`,
            description: c.summary,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
