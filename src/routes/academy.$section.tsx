import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Lightbulb, Shield } from "lucide-react";
import { getAcademySection, type AcademySection, type Lesson } from "@/lib/academy-content";

export const Route = createFileRoute("/academy/$section")({
  loader: ({ params }) => {
    const section = getAcademySection(params.section);
    if (!section) throw notFound();
    return { section };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.section.title} — Chef Super J Academy` },
          { name: "description", content: loaderData.section.tagline },
          { property: "og:title", content: `${loaderData.section.title} — Chef Super J Academy` },
          { property: "og:description", content: loaderData.section.tagline },
        ]
      : [],
  }),
  component: SectionPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="text-destructive">{error.message}</p>
      <button onClick={reset} className="mt-4 underline">Try again</button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center space-y-3">
      <p>Lesson section not found.</p>
      <Link to="/academy" className="underline">Back to Academy</Link>
    </div>
  ),
});

function SectionPage() {
  const { section } = Route.useLoaderData() as { section: AcademySection };
  const Icon = section.icon;

  return (
    <div className="space-y-6">
      <Link
        to="/academy"
        className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border transition hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" /> Academy
      </Link>

      <header className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">{section.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{section.tagline}</p>
          </div>
        </div>
      </header>

      <ol className="space-y-4">
        {section.lessons.map((lesson: Lesson, i: number) => (
          <li
            key={lesson.slug}
            id={lesson.slug}
            className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Lesson {i + 1}
              </span>
            </div>
            <h2 className="mt-1 font-display text-xl leading-tight sm:text-2xl">{lesson.title}</h2>
            <p className="mt-1.5 text-sm text-foreground/85 sm:text-base">{lesson.summary}</p>

            <ol className="mt-4 space-y-2.5">
              {lesson.steps.map((step: string, j: number) => (
                <li key={j} className="flex gap-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {j + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {lesson.pro_tip && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-foreground/90">
                  <span className="font-semibold text-primary">Chef's tip:</span> {lesson.pro_tip}
                </p>
              </div>
            )}

            {lesson.safety && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-foreground/90">
                  <span className="font-semibold text-amber-700">Safety:</span> {lesson.safety}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="text-center">
        <Link
          to="/academy"
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Academy
        </Link>
      </div>
    </div>
  );
}
