import { Link } from "@tanstack/react-router";
import {
  Mic,
  Sparkles,
  Replace,
  Recycle,
  HeartPulse,
  ShoppingCart,
  CalendarDays,
  Boxes,
  Languages,
  Rocket,
} from "lucide-react";

const ITEMS = [
  { Icon: Mic, title: "AI voice conversations", desc: "Talk to Chef Super J hands-free while you cook.", to: "/chef-companion" },
  { Icon: Sparkles, title: "Personalized recipes", desc: "Meals built around your taste, time, and skill.", to: "/recipes" },
  { Icon: Replace, title: "Ingredient substitutions", desc: "Missing something? Get a swap that actually works.", to: "/substitutions" },
  { Icon: Recycle, title: "Leftover optimization", desc: "Rescue what's about to go bad into a real dinner.", to: "/leftovers" },
  { Icon: HeartPulse, title: "Dietary preferences", desc: "Allergies, GERD, diabetes, no citric acid, and more.", to: "/food-preferences" },
  { Icon: ShoppingCart, title: "Shopping lists", desc: "Only what you're actually missing — nothing extra.", to: "/shopping-list" },
  { Icon: CalendarDays, title: "Meal planning", desc: "A full week planned from what's already in your kitchen.", to: "/meal-plan" },
  { Icon: Boxes, title: "Pantry organization", desc: "Know what you own and what needs using first.", to: "/cupboard" },
  { Icon: Languages, title: "Multiple language support", desc: "85+ languages with metric or imperial units.", to: "/settings" },
  { Icon: Rocket, title: "Future AI features", desc: "New chef powers roll out to members first.", to: "/pro" },
];

export function EverythingSection() {
  return (
    <section className="mt-14 sm:mt-20">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <h2 className="font-display text-[1.6rem] font-bold leading-tight tracking-tight sm:text-4xl">
          Everything The Fridge &amp; Cupboard Can Do
        </h2>
        <p className="mt-2.5 text-[15px] text-muted-foreground sm:text-lg">
          Start simple. Discover the rest whenever you're ready.
        </p>
      </div>

      <div className="mt-6 grid gap-3.5 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {ITEMS.map((i, idx) => (
          <Link
            key={i.title}
            to={i.to as any}
            data-reveal
            style={{ ["--reveal-delay" as any]: `${(idx % 3) * 60}ms` }}
            className="press-lift block rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:border-primary/40 hover:shadow-md sm:p-5"
          >
            <div className="icon-rise grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary sm:h-11 sm:w-11">
              <i.Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold tracking-tight sm:mt-4 sm:text-lg">{i.title}</h3>
            <p className="mt-1 text-[13px] text-muted-foreground sm:mt-1.5 sm:text-sm">{i.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default EverythingSection;
