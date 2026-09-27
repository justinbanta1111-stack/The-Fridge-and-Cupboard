import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { DISHES, findCuisine } from "@/lib/seo/content";
import { pageHead, breadcrumbLd, noindexMeta } from "@/lib/seo/meta";

export const Route = createFileRoute("/cuisines/$cuisine")({
  loader: ({ params }) => {
    const cuisine = findCuisine(params.cuisine);
    if (!cuisine) throw notFound();
    return { cuisine };
  },
  head: ({ params, loaderData }) => {
    const c = loaderData?.cuisine;
    if (!c) return { meta: [{ title: "Cuisine not found" }, noindexMeta] };
    return pageHead({
      title: `${c.name} Cooking — Pantry Staples, Dishes & Techniques`,
      description: c.summary,
      path: `/cuisines/${params.cuisine}`,
      ogKind: "cuisine",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Cuisines", path: "/cuisines" },
          { name: c.name, path: `/cuisines/${c.slug}` },
        ]),
      ],
    });
  },
  component: CuisinePage,
  notFoundComponent: () => (
    <GuidePage title="Cuisine not found">
      <Link to="/cuisines" className="text-primary underline">
        All cuisine guides
      </Link>
    </GuidePage>
  ),
});

function CuisinePage() {
  const { cuisine: c } = Route.useLoaderData();
  const recipes = DISHES.filter(
    (d) => d.cuisine.toLowerCase() === c.name.toLowerCase().replace("-inspired", "").replace(" comfort", ""),
  ).slice(0, 6);

  return (
    <GuidePage
      eyebrow="Cuisine guide"
      title={`${c.name} Cooking at Home`}
      intro={c.summary}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Cuisines", to: "/cuisines" },
      ]}
    >
      <GuideSection heading="Pantry staples to keep">
        <ul className="list-disc space-y-1 pl-5">
          {c.pantry.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </GuideSection>
      <GuideSection heading="Signature dishes">
        <ul className="list-disc space-y-1 pl-5">
          {c.signatureDishes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </GuideSection>
      <GuideSection heading="Techniques that matter">
        <ul className="list-disc space-y-1 pl-5">
          {c.techniques.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </GuideSection>
      {recipes.length > 0 && (
        <GuideSection heading={`${c.name} recipes to cook tonight`}>
          <LinkGrid
            items={recipes.map((d) => ({
              to: "/how-to-make/$dish",
              params: { dish: d.slug },
              title: `How to make ${d.name}`,
            }))}
          />
        </GuideSection>
      )}
    </GuidePage>
  );
}
