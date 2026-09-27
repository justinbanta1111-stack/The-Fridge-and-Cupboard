import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";

/**
 * Presentational shell for the public, indexable content pages.
 * Purely visual — no app state, no user data.
 */
export function GuidePage({
  eyebrow,
  title,
  intro,
  children,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  breadcrumbs?: { label: string; to: string }[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1">
              {breadcrumbs.map((b) => (
                <li key={b.to} className="flex items-center gap-1">
                  <Link to={b.to} className="hover:text-foreground">
                    {b.label}
                  </Link>
                  <span aria-hidden>/</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && (
          <p className="text-xs uppercase tracking-widest text-primary">{eyebrow}</p>
        )}
        <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-base text-muted-foreground">{intro}</p>}
        <div className="mt-8 space-y-10">{children}</div>
      </main>
    </div>
  );
}

export function GuideSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{heading}</h2>
      <div className="mt-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export function LinkGrid({
  items,
}: {
  items: { to: string; params?: Record<string, string>; title: string; description?: string }[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <li key={`${it.to}-${JSON.stringify(it.params ?? {})}`}>
          <Link
            to={it.to}
            params={it.params as never}
            className="block rounded-xl border border-border bg-card/40 p-4 transition hover:border-primary/50 hover:bg-card"
          >
            <span className="block text-sm font-semibold">{it.title}</span>
            {it.description && (
              <span className="mt-1 block text-xs text-muted-foreground">{it.description}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
