import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, MessageCircle } from "lucide-react";
import { ACADEMY_SECTIONS, ACADEMY_ASK_META } from "@/lib/academy-content";
import { ChefAvatar } from "@/components/ChefAvatar";

export const Route = createFileRoute("/academy/")({
  head: () => ({
    meta: [
      { title: "Chef Super J Academy — Learn to Cook Smart" },
      { name: "description", content: "Knife skills, kitchen basics, chef secrets, leftover transformations, and an Ask Chef Super J Q&A. Free cooking education from a 30-year pro." },
      { property: "og:title", content: "Chef Super J Academy" },
      { property: "og:description", content: "A full education wing — knife skills, kitchen basics, chef secrets, leftover hacks, and Ask Chef Super J." },
    ],
  }),
  component: AcademyHub,
});

function AcademyHub() {
  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <ChefAvatar className="h-16 w-16 ring-2 ring-primary/30" />
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
              <GraduationCap className="h-3.5 w-3.5" /> Academy
            </div>
            <h1 className="mt-1 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
              Chef Super J Academy
            </h1>
            <p className="mt-2 max-w-xl text-sm text-foreground/85 sm:text-base">
              30 years in pro kitchens, distilled for home cooks. Free lessons in knife skills, kitchen basics, chef secrets, and leftover transformations — plus a direct line to Chef.
            </p>
          </div>
        </div>
      </header>

      <section aria-label="Academy sections" className="grid gap-4 sm:grid-cols-2">
        {ACADEMY_SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.slug}
              to="/academy/$section"
              params={{ section: s.slug }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg leading-tight">{s.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{s.tagline}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    {s.lessons.length} lessons
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Ask Chef Super J — featured card */}
        <Link
          to="/academy/ask"
          className="group relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-primary/5 to-background p-5 transition hover:border-accent/50 hover:shadow-md sm:col-span-2"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg leading-tight">{ACADEMY_ASK_META.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{ACADEMY_ASK_META.tagline}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Open Q&A <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
