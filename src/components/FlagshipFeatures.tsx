import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ChefHat,
  Recycle,
  Sprout,
  Boxes,
  Users,
  CalendarHeart,
  BookHeart,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export type Feature = {
  id: string;
  title: string;
  tagline: string;
  desc: string;
  icon: typeof ChefHat;
  accent: string;
  flagship?: boolean;
  badge?: string;
};

export const FEATURES: Feature[] = [
  {
    id: "going-bad",
    title: "What's Going Bad First",
    tagline: "Triage your fridge",
    desc: "Scan once and we sort every item by urgency — toss, use today, use this week. No more mystery containers.",
    icon: AlertTriangle,
    accent: "text-destructive",
    badge: "Daily",
  },
  {
    id: "rescue-dinner",
    title: "Chef Super J Rescue Dinner",
    tagline: "Tonight's dinner, solved",
    desc: "One tap. Chef Super J builds a real dinner around what's about to expire — flavor-first, no shopping trip.",
    icon: ChefHat,
    accent: "text-primary",
    badge: "Signature",
    flagship: true,
  },
  {
    id: "leftover-transformer",
    title: "Leftover Transformer",
    tagline: "Last night → tonight",
    desc: "Turn yesterday's roast, rice, or pasta into something nobody recognizes as a leftover. Tacos, frittatas, fried rice, savory pies.",
    icon: Recycle,
    accent: "text-success",
    flagship: true,
  },
  {
    id: "garden-to-table",
    title: "Garden to Table",
    tagline: "Pick it, cook it",
    desc: "Snap your harvest or farmer's-market haul. We pair herbs, suggest peak-season recipes, and tell you how to preserve the rest.",
    icon: Sprout,
    accent: "text-success",
  },
  {
    id: "pantry-challenge",
    title: "My Pantry Challenge",
    tagline: "Cook the pantry down",
    desc: "Set a no-shop window. We plan meals from what's already on the shelf and track how much you save.",
    icon: Boxes,
    accent: "text-accent",
  },
  {
    id: "potluck-calculator",
    title: "Church & Potluck Calculator",
    tagline: "Feed the whole hall",
    desc: "Tell us the headcount. Get scaled recipes, shopping lists, and a make-ahead timeline for Sunday dinner or fellowship night.",
    icon: Users,
    accent: "text-primary",
  },
  {
    id: "holiday-command",
    title: "Holiday Command Center",
    tagline: "Thanksgiving, Easter, Christmas",
    desc: "Menu builder, oven schedule, leftover plan. From turkey to ham to the brunch the next morning — all in one place.",
    icon: CalendarHeart,
    accent: "text-accent",
  },
  {
    id: "grandmas-recipe-box",
    title: "Grandma's Recipe Box",
    tagline: "Keep the originals",
    desc: "Snap handwritten cards, scanned pages, or type them in. Chef Super J modernizes substitutions without losing the soul.",
    icon: BookHeart,
    accent: "text-primary",
  },
];

export function FlagshipFeatures({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "py-8" : "py-14"}>
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]">
          <Sparkles className="mr-1.5 h-3 w-3" /> What this app actually does
        </Badge>
        <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight md:text-5xl">
          Save money. Waste nothing.
          <br />
          <span className="italic text-primary">Cook like you've done it for years.</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          The Fridge and Cupboard isn't a recipe site. It's a kitchen co-pilot built around the
          food you already own — leftovers first, always.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const isRescue = f.id === "rescue-dinner" || f.id === "leftover-transformer";
          const isGoingBad = f.id === "going-bad";
          const linkTo = isGoingBad ? "/going-bad" : isRescue ? "/rescue" : null;
          const card = (
            <Card
              key={f.id}
              className={
                "ring-paper relative h-full overflow-hidden border-border/60 bg-card p-5 transition-shadow hover:shadow-lg " +
                (f.flagship ? "ring-1 ring-primary/30" : "")
              }
            >
              {f.flagship && (
                <div className="absolute right-3 top-3">
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Flagship</Badge>
                </div>
              )}
              <div className={"grid h-10 w-10 place-items-center rounded-md bg-secondary " + f.accent}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {f.tagline}
              </div>
              <h3 className="mt-1 font-display text-xl tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              {linkTo && (
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  {isGoingBad ? "Open What's Going Bad First" : "Open Leftover Rescue"} <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </Card>
          );
          return linkTo ? (
            <Link key={f.id} to={linkTo} className="block">
              {card}
            </Link>
          ) : (
            card
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/features"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          See how every feature works <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
