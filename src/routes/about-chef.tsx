import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChefHat, Heart, Shield, Flame, Star, Utensils, Users, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import chefJustinAsset from "@/assets/chef-super-j.jpeg.asset.json";
const chefJustin = chefJustinAsset.url;

export const Route = createFileRoute("/about-chef")({
  head: () => ({
    meta: [
      { title: "Meet Chef Super J — The Story Behind The Fridge & Cupboard" },
      { name: "description", content: "Chef Justin 'Super J' Banta — 30+ years in professional kitchens, brain tumor survivor, Army Reserve veteran, firefighter, and the founder of The Fridge & Cupboard. Built to help families save money, waste less, and cook with what they already have." },
      { property: "og:title", content: "Meet Chef Super J" },
      { property: "og:description", content: "30 years in kitchens. Brain tumor survivor. Army Reserve. Firefighter. Chef Justin 'Super J' Banta built this app to help families waste less and feed more." },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: AboutChefPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="text-destructive">{error.message}</p>
      <button onClick={reset} className="mt-4 underline">Try again</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Page not found.</div>,
});

const MILESTONES = [
  {
    icon: Utensils,
    title: "Three High-End Kitchens",
    body: "Ran three high-end kitchens as Executive Chef. Built menus, trained teams, and served thousands of plates with precision and passion.",
  },
  {
    icon: Star,
    title: "The Plaza Hotel, New York City",
    body: "Worked at the legendary Plaza Hotel — one of the most iconic addresses in American hospitality — where standards are world-class and every detail matters.",
  },
  {
    icon: Users,
    title: "Catering & Events",
    body: "Spent years catering weddings, corporate events, and private dinners. Built menus from scratch, fed thousands, and learned how to make great food under pressure.",
  },
  {
    icon: Shield,
    title: "Army Reserve",
    body: "Served in the Army Reserve — discipline, teamwork, and showing up when it counts. Values that carried straight into the kitchen and into this app.",
  },
  {
    icon: Flame,
    title: "Firefighter",
    body: "Also served as a firefighter. Ran toward the hard stuff. Helped people on their worst days. That same drive to serve is what built The Fridge & Cupboard.",
  },
  {
    icon: Brain,
    title: "Brain Tumor Survivor",
    body: "Survived a major brain tumor and brain surgery. Faced seizures, setbacks, and life-changing challenges. Instead of stopping, he pushed forward and turned struggle into purpose.",
  },
];

const WHO_IT_IS_FOR = [
  "Real families trying to stretch their grocery budget",
  "Busy moms juggling meals, jobs, and kids",
  "Hard-working people who don't have time to waste",
  "Athletes trying to eat clean without overspending",
  "People recovering from illness who need simple, nourishing food",
  "Anyone who wants to eat healthier with what they already have",
];

function AboutChefPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="relative mx-auto max-w-3xl px-4 py-8 sm:py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border transition hover:bg-background"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <div className="mt-6 flex flex-col items-center text-center">
            {/* Founder portrait — centered above story, portrait aspect, face-centered */}
            <figure className="w-full">
              <div className="mx-auto aspect-[3/4] w-48 overflow-hidden rounded-2xl bg-muted ring-1 ring-primary/20 shadow-[0_20px_50px_-20px_oklch(0.45_0.15_45/0.45)] sm:w-56 md:w-64">
                <img
                  src={chefJustin}
                  alt="Chef Justin 'Super J' Banta — founder of The Fridge & Cupboard"
                  className="h-full w-full object-cover object-[50%_22%]"
                  width={1024}
                  height={1366}
                  loading="eager"
                  decoding="async"
                />
              </div>
              <figcaption className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Founder · Chef Super J
              </figcaption>
            </figure>
            <div className="mt-5">
              <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl md:text-5xl">
                Meet Chef Super J
              </h1>
              <p className="mt-2 text-base text-muted-foreground sm:text-lg">
                Chef Justin Banta — 30+ years in professional kitchens. Built this app from real experience, real struggle, and a real mission.
              </p>
            </div>
          </div>

        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-12">
        {/* Story intro */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
            This Is Not Just an App. It's Purpose.
          </h2>
          <p className="text-base leading-relaxed text-foreground/90 sm:text-lg">
            The Fridge & Cupboard was built by Chef Justin "Super J" Banta — a chef with over
            <span className="font-semibold text-primary"> 30 years of professional experience</span> in
            kitchens, food, and feeding people.
          </p>
          <p className="text-base leading-relaxed text-foreground/90 sm:text-lg">
            Justin has run <span className="font-semibold">three high-end kitchens as Executive Chef</span>,
            worked at the <span className="font-semibold">legendary Plaza Hotel in New York City</span>,
            and spent years catering events, building menus, and serving thousands of people.
          </p>
          <p className="text-base leading-relaxed text-foreground/90 sm:text-lg">
            Beyond the kitchen, Justin also served in the <span className="font-semibold">Army Reserve</span> and
            as a <span className="font-semibold">firefighter</span> — dedicating his life to service, discipline, and
            helping others.
          </p>
        </section>

        {/* The struggle */}
        <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/40 to-background p-5 sm:p-8">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-display text-xl sm:text-2xl">But His Story Goes Deeper</h3>
          </div>
          <p className="mt-4 text-base leading-relaxed text-foreground/90 sm:text-lg">
            After surviving a <span className="font-semibold text-primary">major brain tumor and brain surgery</span>,
            Justin faced seizures, setbacks, and life-changing challenges.
          </p>
          <p className="mt-3 text-base leading-relaxed text-foreground/90 sm:text-lg">
            Instead of letting that stop him, he pushed forward and turned his passion into purpose.
          </p>
          <p className="mt-3 text-base leading-relaxed text-foreground/90 sm:text-lg">
            The Fridge & Cupboard was born from <span className="font-semibold">real-life experience, struggle,</span>
            and the belief that <span className="font-semibold text-primary">food should never be wasted</span> when
            it can save money, feed families, and bring people together.
          </p>
        </section>

        {/* Who it's for */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
            Built For Real People
          </h2>
          <p className="text-base text-foreground/90 sm:text-lg">
            This app was built for:
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {WHO_IT_IS_FOR.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-3.5 text-sm sm:text-base"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success text-xs font-bold">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Career milestones */}
        <section className="space-y-5">
          <h2 className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
            The Journey So Far
          </h2>
          <div className="relative space-y-6 border-l-2 border-primary/20 pl-6">
            {MILESTONES.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="relative">
                  <span className="absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 ring-4 ring-background">
                    <Icon className="h-3 w-3 text-primary" />
                  </span>
                  <h3 className="font-display text-lg leading-tight">{m.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85 sm:text-base">{m.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Mission statement */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-accent/5 to-background p-6 text-center sm:p-10">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
          <div className="relative">
            <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-primary/40 shadow-lg">
              <img src={chefJustin} alt="Chef Super J" className="h-full w-full object-cover object-top" />
            </div>
            <h2 className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
              His Mission Is Simple
            </h2>
            <div className="mx-auto mt-5 max-w-lg space-y-3 text-base font-medium leading-relaxed text-foreground/95 sm:text-lg">
              <p>Use what you already have.</p>
              <p>Save money.</p>
              <p>Waste less.</p>
              <p>Feed more.</p>
              <p className="text-primary">Serve others.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4">
          <p className="text-muted-foreground">
            From leftovers to fresh meals, wellness drinks to food preservation — Chef Super J built this to help people stretch their food, waste less, preserve more, and eat smarter.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/scan">Start Scanning</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/kitchen-basics">Kitchen Basics</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </section>

        {/* Footer link */}
        <div className="border-t border-border/60 pt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
