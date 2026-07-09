import { Link } from "@tanstack/react-router";
import { Camera, Package, Soup, ClipboardList, Heart, Sparkles, Lock } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

const TILES = [
  {
    to: "/scan",
    title: "Scan My Fridge",
    sub: "Start here",
    Icon: Camera,
    grad: "from-rose-500 to-red-600",
    ring: "ring-rose-300/40",
    premium: true,
  },
  {
    to: "/cupboard",
    title: "Scan My Cupboard",
    sub: "Pantry too",
    Icon: Package,
    grad: "from-amber-400 to-orange-500",
    ring: "ring-amber-300/40",
    premium: true,
  },
  {
    to: "/rescue",
    title: "Use My Leftovers",
    sub: "Save dinner",
    Icon: Soup,
    grad: "from-emerald-500 to-green-600",
    ring: "ring-emerald-300/40",
    premium: true,
  },
  {
    to: "/type-ingredients",
    title: "I'll Type My Ingredients",
    sub: "No camera",
    Icon: ClipboardList,
    grad: "from-sky-500 to-blue-600",
    ring: "ring-sky-300/40",
    premium: false,
  },
  {
    to: "/health-companion",
    title: "Make It Easy For Mom",
    sub: "Cancer / brain support",
    Icon: Heart,
    grad: "from-violet-500 to-purple-600",
    ring: "ring-violet-300/40",
    premium: true,
  },
  {
    to: "/kitchen-magic",
    title: "Surprise Me",
    sub: "Chef picks",
    Icon: Sparkles,
    grad: "from-orange-500 to-red-600",
    ring: "ring-orange-300/40",
    premium: true,
  },
] as const;

const STEPS = [
  { n: 1, label: "Scan fridge" },
  { n: 2, label: "Scan cupboard" },
  { n: 3, label: "Get meals" },
];

export function ActionGrid() {
  const { isActive, loading } = useSubscription();
  return (
    <section className="mt-4">
      {/* 1-2-3 step pills */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium shadow-sm"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[11px] font-bold text-amber-950">
              {s.n}
            </span>
            <span className="text-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* 6 colorful action tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TILES.map((t) => {
          const locked = t.premium && !isActive && !loading;
          const target = locked ? "/pro" : t.to;
          return (
            <Link
              key={t.to}
              to={target as any}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.grad} p-3.5 text-left text-white shadow-md ring-1 ${t.ring} transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0`}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                  <t.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-base font-bold leading-tight drop-shadow-sm">
                    {t.title}
                  </div>
                  <div className="text-xs text-white/85">{t.sub}</div>
                </div>
              </div>
              {locked && (
                <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm">
                  <Lock className="h-3 w-3" /> Premium
                </div>
              )}
              {/* glossy highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default ActionGrid;
