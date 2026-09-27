import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { LEFTOVERS, SITE_URL } from "@/lib/seo/content";
import { pageHead, breadcrumbLd } from "@/lib/seo/meta";

export const Route = createFileRoute("/leftover-ideas/")({
  head: () =>
    pageHead({
      title: "Leftover Ideas — What to Make With Leftovers Tonight",
      description:
        "Turn leftover chicken, rice, vegetables, turkey, mashed potatoes, and bread into a second meal that doesn't taste reheated. Storage times included.",
      path: "/leftover-ideas",
      ogKind: "leftover",
      type: "website",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Leftover Ideas", path: "/leftover-ideas" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Leftover ideas",
          itemListElement: LEFTOVERS.map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: l.name,
            url: `${SITE_URL}/leftover-ideas/${l.slug}`,
          })),
        },
      ],
    }),
  component: LeftoversIndex,
});

function LeftoversIndex() {
  return (
    <GuidePage
      eyebrow="Leftover rescue"
      title="What to Make With Leftovers"
      intro="Leftovers aren't scraps — they're a head start. Pick what's in the container and get a second meal plan, plus how long it's safe to keep."
      breadcrumbs={[{ label: "Home", to: "/" }]}
    >
      <GuideSection heading="Browse by leftover">
        <LinkGrid
          items={LEFTOVERS.map((l) => ({
            to: "/leftover-ideas/$leftover",
            params: { leftover: l.slug },
            title: l.name,
            description: l.summary,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
