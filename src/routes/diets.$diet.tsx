import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { DIETS, findDiet } from "@/lib/seo/content";
import { pageHead, breadcrumbLd, noindexMeta } from "@/lib/seo/meta";

export const Route = createFileRoute("/diets/$diet")({
  loader: ({ params }) => {
    const diet = findDiet(params.diet);
    if (!diet) throw notFound();
    return { diet };
  },
  head: ({ params, loaderData }) => {
    const d = loaderData?.diet;
    if (!d) return { meta: [{ title: "Diet guide not found" }, noindexMeta] };
    return pageHead({
      title: `${d.name} Meals — What to Eat and What to Cook`,
      description: d.summary,
      path: `/diets/${params.diet}`,
      ogKind: "diet",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Diets", path: "/diets" },
          { name: d.name, path: `/diets/${d.slug}` },
        ]),
      ],
    });
  },
  component: DietPage,
  notFoundComponent: () => (
    <GuidePage title="Diet guide not found">
      <Link to="/diets" className="text-primary underline">
        All dietary guides
      </Link>
    </GuidePage>
  ),
});

function DietPage() {
  const { diet: d } = Route.useLoaderData();
  const others = DIETS.filter((x) => x.slug !== d.slug);

  return (
    <GuidePage
      eyebrow="Dietary guide"
      title={`${d.name} Meals`}
      intro={d.summary}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Diets", to: "/diets" },
      ]}
    >
      <GuideSection heading="What to eat">
        <ul className="list-disc space-y-1 pl-5">
          {d.eat.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </GuideSection>
      <GuideSection heading="What to avoid">
        <ul className="list-disc space-y-1 pl-5">
          {d.avoid.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </GuideSection>
      <GuideSection heading="Meal ideas tonight">
        <ul className="list-disc space-y-1 pl-5">
          {d.mealIdeas.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </GuideSection>
      <GuideSection heading="Other dietary guides">
        <LinkGrid
          items={others.map((o) => ({
            to: "/diets/$diet",
            params: { diet: o.slug },
            title: `${o.name} meals`,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
