import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { DIETS, SITE_URL } from "@/lib/seo/content";
import { pageHead, breadcrumbLd } from "@/lib/seo/meta";

export const Route = createFileRoute("/diets/")({
  head: () =>
    pageHead({
      title: "Dietary Meal Guides — Vegetarian, Gluten-Free, Low-Carb & More",
      description:
        "Meal ideas and cooking guidance for vegetarian, gluten-free, dairy-free, low-carb, diabetic-friendly, and heart-healthy eating, using ingredients you already own.",
      path: "/diets",
      ogKind: "diet",
      type: "website",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Diets", path: "/diets" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Dietary guides",
          itemListElement: DIETS.map((d, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: d.name,
            url: `${SITE_URL}/diets/${d.slug}`,
          })),
        },
      ],
    }),
  component: DietsIndex,
});

function DietsIndex() {
  return (
    <GuidePage
      eyebrow="Dietary guides"
      title="Meals for Your Dietary Needs"
      intro="What to eat, what to skip, and what to cook tonight — for the most common dietary needs, using what's already in your kitchen."
      breadcrumbs={[{ label: "Home", to: "/" }]}
    >
      <GuideSection heading="Browse dietary guides">
        <LinkGrid
          items={DIETS.map((d) => ({
            to: "/diets/$diet",
            params: { diet: d.slug },
            title: `${d.name} meals`,
            description: d.summary,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
