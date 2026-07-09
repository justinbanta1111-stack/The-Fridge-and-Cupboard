import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { FEATURES, FlagshipFeatures } from "@/components/FlagshipFeatures";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Leftover rescue, pantry challenges, potluck math, holiday command center, and Grandma's recipe box — the major features of The Fridge and Cupboard.",
      },
      { property: "og:title", content: "Features — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Eight flagship tools to cook smarter with what you already have.",
      },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <header className="py-10 md:py-14">
          <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]">
            Major features
          </Badge>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
            Built around <span className="italic text-primary">your leftovers.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Every feature in The Fridge and Cupboard exists to help you save money, waste less food,
            plan meals, and cook with real-world technique. Recipes are the byproduct — not the point.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
              <Link to="/scan">
                <Camera className="mr-2 h-5 w-5" /> Start with a fridge photo
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-foreground/20">
              <Link to="/pro">
                Compare Free, Standard &amp; Premium <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <FlagshipFeatures compact />

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.id} className="ring-paper border-border/60 bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className={"grid h-11 w-11 shrink-0 place-items-center rounded-md bg-secondary " + f.accent}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {f.tagline}
                    </div>
                    <h2 className="mt-1 font-display text-2xl tracking-tight">{f.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        <section className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">
            Ready when the fridge door opens.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Snap a photo. We'll find the leftovers, flag what to toss, and hand you a dinner plan
            that uses what's there first.
          </p>
          <div className="mt-6">
            <Button asChild size="lg" className="bg-primary uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
              <Link to="/rescue">
                <Camera className="mr-2 h-5 w-5" /> Start Leftover Rescue
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
