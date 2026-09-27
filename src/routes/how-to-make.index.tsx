import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { DISHES, SITE_URL } from "@/lib/seo/content";
import { pageHead, breadcrumbLd } from "@/lib/seo/meta";

export const Route = createFileRoute("/how-to-make/")({
  head: () =>
    pageHead({
      title: "How to Make Any Dish — Recipes, Times & Temperatures",
      description:
        "Step-by-step recipes with cooking times, oven temperatures, and ingredient lists — chicken, salmon, pasta, vegetables, desserts, and holiday dishes you can cook tonight.",
      path: "/how-to-make",
      ogKind: "recipe",
      type: "website",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "How to Make", path: "/how-to-make" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "How to make popular dishes",
          itemListElement: DISHES.map((d, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `How to make ${d.name}`,
            url: `${SITE_URL}/how-to-make/${d.slug}`,
          })),
        },
      ],
    }),
  component: HowToMakeIndex,
});

const CATEGORIES = ["Dinner", "Meat", "Seafood", "Vegetable", "Dessert", "Holiday", "Breakfast"] as const;

function HowToMakeIndex() {
  return (
    <GuidePage
      eyebrow="Recipe library"
      title="How to Make Any Dish"
      intro="Clear recipes with real cooking times, oven temperatures, and ingredient lists. Every dish here is built to be cooked with what you already have in your fridge and cupboard."
      breadcrumbs={[{ label: "Home", to: "/" }]}
    >
      {CATEGORIES.map((cat) => {
        const items = DISHES.filter((d) => d.category === cat);
        if (items.length === 0) return null;
        return (
          <GuideSection key={cat} heading={`${cat} recipes`}>
            <LinkGrid
              items={items.map((d) => ({
                to: "/how-to-make/$dish",
                params: { dish: d.slug },
                title: `How to make ${d.name}`,
                description: `${d.prepMinutes + d.cookMinutes} min · serves ${d.servings}`,
              }))}
            />
          </GuideSection>
        );
      })}
    </GuidePage>
  );
}
