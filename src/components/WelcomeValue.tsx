import { Link } from "@tanstack/react-router";
import { PiggyBank, Leaf, Timer, HandHeart } from "lucide-react";

const POINTS = [
  {
    Icon: HandHeart,
    title: "A friend in the kitchen",
    desc: "Just talk. Chef Super J answers like someone who's cooked for years.",
    to: "/chef-companion",
  },
  {
    Icon: PiggyBank,
    title: "Spend less at the store",
    desc: "Cook what you already own before you buy anything new.",
    to: "/budget-plan",
  },
  {
    Icon: Leaf,
    title: "Waste less food",
    desc: "We spot what needs using first and turn it into dinner.",
    to: "/use-it-soon",
  },
  {
    Icon: Timer,
    title: "No more 'what's for dinner?'",
    desc: "A real answer in seconds — no planning, no stress.",
    to: "/recipes",
  },
];

/**
 * Calm, value-first welcome shown before any signup or pricing.
 */
export function WelcomeValue() {
  return (
    <section className="mt-10 sm:mt-14">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <h2 className="font-display text-[1.5rem] font-bold leading-tight tracking-tight sm:text-3xl">
          You don't have to be a chef
        </h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          You just have to open the fridge. Take a look around — everything here is free to explore.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-4">
        {POINTS.map((p, idx) => (
          <Link
            key={p.title}
            to={p.to as any}
            data-reveal
            style={{ ["--reveal-delay" as any]: `${(idx % 2) * 70}ms` }}
            className="press-lift flex items-start gap-3.5 rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:border-primary/40 hover:shadow-md sm:p-5"
          >
            <div className="icon-rise grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <p.Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold tracking-tight sm:text-lg">{p.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">{p.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default WelcomeValue;
