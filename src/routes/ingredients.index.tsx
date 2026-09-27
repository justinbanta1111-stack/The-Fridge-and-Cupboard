import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { INGREDIENTS, SITE_URL } from "@/lib/seo/content";
import { pageHead, breadcrumbLd } from "@/lib/seo/meta";

export const Route = createFileRoute("/ingredients/")({
  head: () =>
    pageHead({
      title: "Ingredient Guides — Storage, Shelf Life & Cooking Times",
      description:
        "How to store, judge, and cook the ingredients already in your fridge and cupboard — chicken, beef, eggs, rice, potatoes, cheese, and more.",
      path: "/ingredients",
      ogKind: "ingredient",
      type: "website",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Ingredients", path: "/ingredients" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Ingredient guides",
          itemListElement: INGREDIENTS.map((i, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: i.name,
            url: `${SITE_URL}/ingredients/${i.slug}`,
          })),
        },
      ],
    }),
  component: IngredientsIndex,
});

function IngredientsIndex() {
  return (
    <GuidePage
      eyebrow="Ingredient guides"
      title="What to Cook With the Ingredients You Have"
      intro="Storage, shelf life, spoilage signs, and cooking notes for the ingredients most likely to be sitting in your fridge or cupboard right now."
      breadcrumbs={[{ label: "Home", to: "/" }]}
    >
      <GuideSection heading="Browse ingredients">
        <LinkGrid
          items={INGREDIENTS.map((i) => ({
            to: "/ingredients/$ingredient",
            params: { ingredient: i.slug },
            title: i.name,
            description: i.summary,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
