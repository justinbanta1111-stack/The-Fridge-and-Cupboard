import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GuidePage, GuideSection } from "@/components/seo/GuidePage";
import { DISHES, INGREDIENTS, QUESTIONS, CUISINES, LEFTOVERS, DIETS, SITE_URL } from "@/lib/seo/content";
import { pageHead, breadcrumbLd } from "@/lib/seo/meta";

type Result = {
  key: string;
  title: string;
  description: string;
  group: string;
  href: string;
  haystack: string;
};

const RESULTS: Result[] = [
  ...DISHES.map((d) => ({
    key: `dish-${d.slug}`,
    title: `How to make ${d.name}`,
    description: d.summary,
    group: "Dishes & recipes",
    href: `/how-to-make/${d.slug}`,
    haystack: [d.name, d.summary, d.category, d.cuisine, ...d.ingredients].join(" ").toLowerCase(),
  })),
  ...INGREDIENTS.map((i) => ({
    key: `ing-${i.slug}`,
    title: i.name,
    description: i.summary,
    group: "Ingredients",
    href: `/ingredients/${i.slug}`,
    haystack: [i.name, i.summary].join(" ").toLowerCase(),
  })),
  ...QUESTIONS.map((q) => ({
    key: `q-${q.slug}`,
    title: q.question,
    description: q.shortAnswer,
    group: "Cooking questions",
    href: `/cooking-questions/${q.slug}`,
    haystack: [q.question, q.shortAnswer].join(" ").toLowerCase(),
  })),
  ...CUISINES.map((c) => ({
    key: `cui-${c.slug}`,
    title: `${c.name} cooking`,
    description: c.summary,
    group: "Cuisines",
    href: `/cuisines/${c.slug}`,
    haystack: [c.name, c.summary, ...c.signatureDishes].join(" ").toLowerCase(),
  })),
  ...LEFTOVERS.map((l) => ({
    key: `left-${l.slug}`,
    title: l.name,
    description: l.summary,
    group: "Leftover ideas",
    href: `/leftover-ideas/${l.slug}`,
    haystack: [l.name, l.summary].join(" ").toLowerCase(),
  })),
  ...DIETS.map((d) => ({
    key: `diet-${d.slug}`,
    title: `${d.name} meals`,
    description: d.summary,
    group: "Dietary guides",
    href: `/diets/${d.slug}`,
    haystack: [d.name, d.summary, ...d.mealIdeas].join(" ").toLowerCase(),
  })),
];

const GROUPS = ["Dishes & recipes", "Ingredients", "Cooking questions", "Cuisines", "Leftover ideas", "Dietary guides"];

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () =>
    pageHead({
      title: "Search Recipes, Ingredients & Cooking Questions — The Fridge and Cupboard",
      description:
        "Search hundreds of dishes, ingredient storage guides, cooking times and temperatures, substitutions, leftovers, cuisines, and dietary meal ideas. Free, no sign-in needed.",
      path: "/search",
      type: "website",
      ogKind: "question",
      ogTitle: "Search the kitchen library",
      ogEyebrow: "Free cooking search",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Search", path: "/search" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "The Fridge and Cupboard",
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
      ],
    }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [term, setTerm] = useState(q);

  const query = term.trim().toLowerCase();
  const matches = useMemo(
    () => (query ? RESULTS.filter((r) => query.split(/\s+/).every((w) => r.haystack.includes(w))) : RESULTS),
    [query],
  );

  return (
    <GuidePage
      eyebrow="Kitchen search"
      title="Search Recipes, Ingredients and Cooking Questions"
      intro="Type an ingredient, a dish, or a question — cooking times, temperatures, substitutions, leftovers and dietary ideas, all free and open to everyone."
      breadcrumbs={[{ label: "Home", to: "/" }]}
    >
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ search: { q: term.trim() }, replace: true });
        }}
      >
        <label htmlFor="kitchen-search" className="sr-only">
          Search recipes, ingredients and cooking questions
        </label>
        <input
          id="kitchen-search"
          type="search"
          name="q"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="chicken, leftover rice, oven temperature…"
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Search
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {query
          ? `${matches.length} result${matches.length === 1 ? "" : "s"} for “${term.trim()}”`
          : `Browse all ${RESULTS.length} free guides below.`}
      </p>

      {matches.length === 0 && (
        <p className="text-sm">
          Nothing matched that. Try a single ingredient, or browse{" "}
          <Link to="/kitchen-guide" className="text-primary underline">
            the full kitchen guide
          </Link>
          .
        </p>
      )}

      {GROUPS.map((group) => {
        const items = matches.filter((m) => m.group === group);
        if (items.length === 0) return null;
        return (
          <GuideSection key={group} heading={group}>
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.key}>
                  <a href={item.href} className="font-medium text-primary underline">
                    {item.title}
                  </a>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </li>
              ))}
            </ul>
          </GuideSection>
        );
      })}
    </GuidePage>
  );
}
