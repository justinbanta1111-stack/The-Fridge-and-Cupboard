import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { QUESTIONS, findQuestion } from "@/lib/seo/content";
import { pageHead, breadcrumbLd, noindexMeta } from "@/lib/seo/meta";

export const Route = createFileRoute("/cooking-questions/$question")({
  loader: ({ params }) => {
    const question = findQuestion(params.question);
    if (!question) throw notFound();
    return { question };
  },
  head: ({ params, loaderData }) => {
    const q = loaderData?.question;
    if (!q) return { meta: [{ title: "Question not found" }, noindexMeta] };
    const jsonLd: unknown[] = [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: q.question,
            acceptedAnswer: { "@type": "Answer", text: q.shortAnswer },
          },
        ],
      },
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Cooking Questions", path: "/cooking-questions" },
        { name: q.question, path: `/cooking-questions/${q.slug}` },
      ]),
    ];
    if (q.steps) {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: q.question,
        description: q.shortAnswer,
        step: q.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
      });
    }
    return pageHead({
      title: `${q.question} — The Fridge and Cupboard`,
      description: q.shortAnswer,
      path: `/cooking-questions/${params.question}`,
      ogKind: "question",
      jsonLd,
    });
  },
  component: QuestionPage,
  notFoundComponent: () => (
    <GuidePage title="Question not found">
      <Link to="/cooking-questions" className="text-primary underline">
        All cooking questions
      </Link>
    </GuidePage>
  ),
});

function QuestionPage() {
  const { question: q } = Route.useLoaderData();
  const others = QUESTIONS.filter((x) => x.slug !== q.slug).slice(0, 6);

  return (
    <GuidePage
      eyebrow="Kitchen answer"
      title={q.question}
      intro={q.shortAnswer}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Cooking Questions", to: "/cooking-questions" },
      ]}
    >
      {q.steps && (
        <GuideSection heading="Step by step">
          <ol className="list-decimal space-y-2 pl-5">
            {q.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </GuideSection>
      )}
      <GuideSection heading="What else to know">
        <ul className="list-disc space-y-1 pl-5">
          {q.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </GuideSection>
      <GuideSection heading="More kitchen answers">
        <LinkGrid
          items={others.map((o) => ({
            to: "/cooking-questions/$question",
            params: { question: o.slug },
            title: o.question,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
