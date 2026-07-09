import { Link } from "@tanstack/react-router";
import { Brain, HeartPulse, Armchair, Activity, Dumbbell, Cross, Baby, ArrowRight } from "lucide-react";

type Item = {
  label: string;
  sub: string;
  to: string;
  search?: Record<string, string>;
  Icon: React.ComponentType<{ className?: string }>;
};

const ITEMS: Item[] = [
  { label: "Brain Health", sub: "Omega-3 · memory", to: "/health", search: { cat: "brain" }, Icon: Brain },
  { label: "Cancer Support", sub: "Gentle · nutrient-dense", to: "/health", search: { cat: "cancer-support" }, Icon: HeartPulse },
  { label: "Senior Easy", sub: "Soft · low effort", to: "/health", search: { cat: "elderly" }, Icon: Armchair },
  { label: "Diabetic Friendly", sub: "Low sugar · balanced", to: "/health", search: { cat: "diabetic" }, Icon: Activity },
  { label: "High Protein", sub: "Muscle · recovery", to: "/health", search: { cat: "high-protein" }, Icon: Dumbbell },
  { label: "Orthodox Fasting", sub: "No meat · no dairy", to: "/fasting", Icon: Cross },
  { label: "Kids Quick Meals", sub: "Picky · lunchbox", to: "/kids", Icon: Baby },
];

export function HealthSpecialNeedsStrip() {
  return (
    <section className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Eat for how you feel
          </div>
          <h2 className="font-display text-lg sm:text-xl">Health &amp; Special Needs Kitchen</h2>
        </div>
        <Link
          to="/health-companion"
          className="hidden sm:inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/15"
        >
          Health Companion <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {ITEMS.map(({ label, sub, to, search, Icon }) => (
          <Link
            key={label}
            to={to}
            search={search as any}
            className="group flex flex-col items-start gap-1 rounded-xl border border-border/60 bg-background/60 p-3 transition hover:border-primary/50 hover:bg-primary/5"
          >
            <Icon className="h-5 w-5 text-primary" />
            <div className="text-sm font-semibold leading-tight">{label}</div>
            <div className="text-[11px] text-muted-foreground">{sub}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
