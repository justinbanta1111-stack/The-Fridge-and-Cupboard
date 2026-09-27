import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { DISHES, QUESTIONS, LEFTOVERS, INGREDIENTS, CUISINES, DIETS } from "@/lib/seo/content";
import { pageHead, breadcrumbLd } from "@/lib/seo/meta";

export const Route = createFileRoute("/kitchen-guide")({
  head: () =>
    pageHead({
      title: "Kitchen Guide — Recipes, Cooking Times, Substitutions & Leftovers",
      description:
        "A free cooking library: how to make any dish, cooking times and temperatures, ingredient substitutions, leftover ideas, cuisine guides, and dietary meal plans.",
      path: "/kitchen-guide",
      type: "website",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Kitchen Guide", path: "/kitchen-guide" },
        ]),
      ],
    }),
  component: KitchenGuide,
});

function KitchenGuide() {
  return (
    <GuidePage
      eyebrow="Free cooking library"
      title="The Kitchen Guide"
      intro="Everything you need to cook dinner with what you already have: recipes with real times and temperatures, ingredient guides, substitutions, leftover rescues, cuisines, and dietary meals."
      breadcrumbs={[{ label: "Home", to: "/" }]}
    >
      <GuideSection heading="Start here">
        <LinkGrid
          items={[
            { to: "/how-to-make", title: `How to make any dish (${DISHES.length} recipes)`, description: "Times, temperatures, ingredients, and steps." },
            { to: "/cooking-questions", title: `Cooking questions answered (${QUESTIONS.length})`, description: "Cook times, safe temperatures, substitutions." },
            { to: "/ingredients", title: `Ingredient guides (${INGREDIENTS.length})`, description: "Storage, shelf life, and how to use things up." },
            { to: "/leftover-ideas", title: `Leftover ideas (${LEFTOVERS.length})`, description: "Second meals that don't taste reheated." },
            { to: "/cuisines", title: `Cuisine guides (${CUISINES.length})`, description: "Italian, Mexican, Asian, Indian, and more." },
            { to: "/diets", title: `Dietary meal guides (${DIETS.length})`, description: "Vegetarian, gluten-free, low-carb, and more." },
          ]}
        />
      </GuideSection>

      <GuideSection heading="Popular recipes">
        <LinkGrid
          items={DISHES.slice(0, 8).map((d) => ({
            to: "/how-to-make/$dish",
            params: { dish: d.slug },
            title: `How to make ${d.name}`,
          }))}
        />
      </GuideSection>

      <GuideSection heading="Most asked kitchen questions">
        <LinkGrid
          items={QUESTIONS.slice(0, 6).map((q) => ({
            to: "/cooking-questions/$question",
            params: { question: q.slug },
            title: q.question,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
