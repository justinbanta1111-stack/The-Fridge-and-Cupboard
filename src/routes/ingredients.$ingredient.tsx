import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { findIngredient, findDish } from "@/lib/seo/content";
import { pageHead, breadcrumbLd, noindexMeta } from "@/lib/seo/meta";

export const Route = createFileRoute("/ingredients/$ingredient")({
  loader: ({ params }) => {
    const ingredient = findIngredient(params.ingredient);
    if (!ingredient) throw notFound();
    return { ingredient };
  },
  head: ({ params, loaderData }) => {
    const ing = loaderData?.ingredient;
    if (!ing) return { meta: [{ title: "Ingredient not found" }, noindexMeta] };
    const title = `${ing.name} — How to Store, Cook & Use It Up`;
    return pageHead({
      title,
      description: `${ing.summary} Shelf life: ${ing.shelfLife}`,
      path: `/ingredients/${params.ingredient}`,
      ogKind: "ingredient",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Ingredients", path: "/ingredients" },
          { name: ing.name, path: `/ingredients/${ing.slug}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `How long does ${ing.name.toLowerCase()} last?`,
              acceptedAnswer: { "@type": "Answer", text: ing.shelfLife },
            },
            {
              "@type": "Question",
              name: `How should you store ${ing.name.toLowerCase()}?`,
              acceptedAnswer: { "@type": "Answer", text: ing.storage },
            },
            {
              "@type": "Question",
              name: `How can you tell if ${ing.name.toLowerCase()} has gone bad?`,
              acceptedAnswer: { "@type": "Answer", text: ing.signsGoneBad },
            },
          ],
        },
      ],
    });
  },
  component: IngredientPage,
  notFoundComponent: () => (
    <GuidePage title="Ingredient not found">
      <Link to="/ingredients" className="text-primary underline">
        All ingredient guides
      </Link>
    </GuidePage>
  ),
});

function IngredientPage() {
  const { ingredient: ing } = Route.useLoaderData();
  const related = ing.relatedDishes.map(findDish).filter(Boolean);

  return (
    <GuidePage
      eyebrow="Ingredient guide"
      title={`Cooking With ${ing.name}`}
      intro={ing.summary}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Ingredients", to: "/ingredients" },
      ]}
    >
      <GuideSection heading={`How to store ${ing.name.toLowerCase()}`}>
        <p>{ing.storage}</p>
      </GuideSection>
      <GuideSection heading={`How long does ${ing.name.toLowerCase()} last?`}>
        <p>{ing.shelfLife}</p>
      </GuideSection>
      <GuideSection heading="Signs it has gone bad">
        <p>{ing.signsGoneBad}</p>
      </GuideSection>
      <GuideSection heading="Cooking notes">
        <ul className="list-disc space-y-1 pl-5">
          {ing.cookingNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </GuideSection>
      <GuideSection heading={`Quick ways to use up ${ing.name.toLowerCase()}`}>
        <ul className="list-disc space-y-1 pl-5">
          {ing.quickUses.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </GuideSection>
      {related.length > 0 && (
        <GuideSection heading="Recipes using this ingredient">
          <LinkGrid
            items={related.map((d) => ({
              to: "/how-to-make/$dish",
              params: { dish: d!.slug },
              title: `How to make ${d!.name}`,
            }))}
          />
        </GuideSection>
      )}
    </GuidePage>
  );
}
