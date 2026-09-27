import { createFileRoute } from "@tanstack/react-router";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { QUESTIONS, SITE_URL } from "@/lib/seo/content";
import { pageHead, breadcrumbLd } from "@/lib/seo/meta";

export const Route = createFileRoute("/cooking-questions/")({
  head: () =>
    pageHead({
      title: "Cooking Questions Answered — Times, Temperatures & Substitutions",
      description:
        "Straight answers to common kitchen questions: cooking times, safe internal temperatures, ingredient substitutions, leftovers, and what to cook with what you already have.",
      path: "/cooking-questions",
      ogKind: "question",
      type: "website",
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Cooking Questions", path: "/cooking-questions" },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: QUESTIONS.map((q) => ({
            "@type": "Question",
            name: q.question,
            acceptedAnswer: { "@type": "Answer", text: q.shortAnswer },
            url: `${SITE_URL}/cooking-questions/${q.slug}`,
          })),
        },
      ],
    }),
  component: QuestionsIndex,
});

function QuestionsIndex() {
  return (
    <GuidePage
      eyebrow="Kitchen answers"
      title="Cooking Questions, Answered"
      intro="Cooking times, oven temperatures, safe internal temperatures, substitutions, and leftover strategy — answered plainly, without a life story first."
      breadcrumbs={[{ label: "Home", to: "/" }]}
    >
      <GuideSection heading="Popular questions">
        <LinkGrid
          items={QUESTIONS.map((q) => ({
            to: "/cooking-questions/$question",
            params: { question: q.slug },
            title: q.question,
            description: q.shortAnswer,
          }))}
        />
      </GuideSection>
    </GuidePage>
  );
}
