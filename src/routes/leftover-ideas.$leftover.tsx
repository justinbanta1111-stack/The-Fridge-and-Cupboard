import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { LEFTOVERS, findLeftover } from "@/lib/seo/content";
import { pageHead, breadcrumbLd, noindexMeta } from "@/lib/seo/meta";

export const Route = createFileRoute("/leftover-ideas/$leftover")({
  loader: ({ params }) => {
    const leftover = findLeftover(params.leftover);
    if (!leftover) throw notFound();
    return { leftover };
  },
  head: ({ params, loaderData }) => {
    const l = loaderData?.leftover;
    if (!l) return { meta: [{ title: "Leftover guide not found" }, noindexMeta] };
    return pageHead({
      title: `${l.name} — What to Make With It`,
      description: `${l.summary} ${l.storage}`,
      path: `/leftover-ideas/${params.leftover}`,
      ogKind: "leftover",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Leftover Ideas", path: "/leftover-ideas" },
          { name: l.name, path: `/leftover-ideas/${l.slug}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `What can I make with ${l.name.toLowerCase()}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: l.ideas.map((i) => `${i.title}: ${i.how}`).join(" "),
              },
            },
            {
              "@type": "Question",
              name: `How long does ${l.name.toLowerCase()} keep?`,
              acceptedAnswer: { "@type": "Answer", text: l.storage },
            },
          ],
        },
      ],
    });
  },
  component: LeftoverPage,
  notFoundComponent: () => (
    <GuidePage title="Leftover guide not found">
      <Link to="/leftover-ideas" className="text-primary underline">
        All leftover ideas
      </Link>
    </GuidePage>
  ),
});

function LeftoverPage() {
  const { leftover: l } = Route.useLoaderData();
  const others = LEFTOVERS.filter((x) => x.slug !== l.slug);

  return (
    <GuidePage
      eyebrow="Leftover rescue"
      title={`What to Make With ${l.name}`}
      intro={l.summary}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Leftover Ideas", to: "/leftover-ideas" },
      ]}
    >
      <GuideSection heading="Ideas that actually work">
        <ul className="space-y-3">
          {l.ideas.map((i) => (
            <li key={i.title} className="rounded-xl border border-border bg-card/40 p-4">
              <h3 className="text-sm font-semibold">{i.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{i.how}</p>
            </li>
          ))}
        </ul>
      </GuideSection>
      <GuideSection heading="How long it keeps">
        <p>{l.storage}</p>
      </GuideSection>
      <GuideSection heading="More leftover rescues">
        <LinkGrid
          items={others.map((o) => ({
            to: "/leftover-ideas/$leftover",
            params: { leftover: o.slug },
            title: o.name,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
