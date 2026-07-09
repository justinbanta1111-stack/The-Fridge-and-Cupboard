import { useEffect, useState } from "react";
import {
  Refrigerator,
  Package,
  Soup,
  ShoppingCart,
  Flame,
  DollarSign,
  Leaf,
  MessageCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChefAvatar } from "@/components/ChefAvatar";
import { cn } from "@/lib/utils";

const KEY = "tfc.wow-tour.seen.v1";

const DEMO_ITEMS = [
  "chicken", "tortillas", "rice", "spinach", "sour cream",
  "salsa", "eggs", "cheese", "pasta", "canned tomatoes",
];

type Step = {
  id: string;
  title: string;
  icon: typeof Refrigerator;
  tone: string;
  body: React.ReactNode;
};

const STEPS: Step[] = [
  {
    id: "scan-fridge",
    title: "Scan your fridge",
    icon: Refrigerator,
    tone: "from-sky-400 to-blue-600",
    body: (
      <>
        <p>Snap one photo. Chef Super J reads every shelf — fresh, expiring, and questionable items.</p>
        <DemoChips items={["chicken", "spinach", "sour cream", "eggs", "cheese"]} highlight="spinach" />
        <ResultLine>✓ 5 items detected · 1 needs attention</ResultLine>
      </>
    ),
  },
  {
    id: "scan-cupboard",
    title: "Scan your cupboard",
    icon: Package,
    tone: "from-amber-400 to-orange-600",
    body: (
      <>
        <p>Same magic for shelves and pantry. Now we know everything you actually have.</p>
        <DemoChips items={["rice", "pasta", "canned tomatoes", "tortillas", "salsa"]} />
        <ResultLine>✓ Inventory unlocked — 10 ingredients ready</ResultLine>
      </>
    ),
  },
  {
    id: "leftovers",
    title: "Use your leftovers",
    icon: Soup,
    tone: "from-violet-400 to-fuchsia-600",
    body: (
      <>
        <p>That half container of chicken? It becomes dinner — not waste.</p>
        <ResultLine>💡 Turn leftover chicken + tortillas into <b>chicken tacos</b> in 15 min.</ResultLine>
      </>
    ),
  },
  {
    id: "before-you-shop",
    title: "Before you shop",
    icon: ShoppingCart,
    tone: "from-emerald-400 to-teal-600",
    body: (
      <>
        <p>We tell you exactly what's missing — and what unlocks the most meals.</p>
        <ResultLine>🛒 Buy only <b>bell pepper + lime</b> → unlocks <b>4 more meals</b>.</ResultLine>
      </>
    ),
  },
  {
    id: "rescue-mission",
    title: "Tonight's Rescue Mission",
    icon: Flame,
    tone: "from-amber-400 to-rose-600",
    body: (
      <>
        <p>One food. One mission tonight. Save it before it spoils.</p>
        <ResultLine>🚨 <b>Rescue the spinach tonight.</b> 3 meal ideas ready in one tap.</ResultLine>
      </>
    ),
  },
  {
    id: "save-money",
    title: "Save money",
    icon: DollarSign,
    tone: "from-green-400 to-emerald-600",
    body: (
      <>
        <p>Every meal cooked from what you have = real dollars not spent on takeout or groceries.</p>
        <ResultLine>💵 Estimated savings tonight: <b>$18</b>.</ResultLine>
      </>
    ),
  },
  {
    id: "waste-less",
    title: "Waste less food",
    icon: Leaf,
    tone: "from-lime-400 to-green-600",
    body: (
      <>
        <p>The average household throws out $1,500/year in food. We help you stop the leak.</p>
        <ResultLine>🌱 You'd rescue <b>0.6 lb</b> tonight from this one meal.</ResultLine>
      </>
    ),
  },
  {
    id: "chef",
    title: "Talk to Chef Super J",
    icon: MessageCircle,
    tone: "from-rose-400 to-pink-600",
    body: (
      <>
        <p>Stuck? Ask anything — substitutions, timing, "what can I make with this?"</p>
        <div className="mt-3 rounded-xl bg-gradient-to-br from-rose-500/15 to-amber-500/10 p-3 ring-1 ring-rose-300/30">
          <div className="flex items-start gap-2">
            <ChefAvatar className="h-8 w-8 shrink-0" />
            <p className="text-sm italic">
              "Boom — this is how we save dinner, save money, and stop wasting food."
            </p>
          </div>
        </div>
      </>
    ),
  },
];

function DemoChips({ items, highlight }: { items: string[]; highlight?: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span
          key={i}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-medium",
            highlight === i
              ? "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
              : "border-border bg-muted text-foreground",
          )}
        >
          {highlight === i && "⚠ "}{i}
        </span>
      ))}
    </div>
  );
}

function ResultLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-foreground/5 px-3 py-2.5 text-sm ring-1 ring-border">
      {children}
    </div>
  );
}

export function WowTourButton() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    try { setSeen(localStorage.getItem(KEY) === "1"); } catch {}
  }, []);

  function start() {
    setOpen(true);
    try { localStorage.setItem(KEY, "1"); setSeen(true); } catch {}
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          onClick={start}
          size="lg"
          className={cn(
            "relative overflow-hidden bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-bold shadow-lg hover:brightness-110",
            !seen && "animate-pulse",
          )}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Show Me What This Can Do
          <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            60 sec
          </span>
        </Button>
        {!seen && (
          <span className="text-xs text-muted-foreground">
            New here? Take the 60-second tour →
          </span>
        )}
      </div>
      <WowTourDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function WowTourDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);

  useEffect(() => { if (open) setI(0); }, [open]);

  const step = STEPS[i];
  const Icon = step.icon;
  const isLast = i === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">60-Second Wow Tour</DialogTitle>
        <DialogDescription className="sr-only">
          A quick guided demo of The Fridge & Cupboard.
        </DialogDescription>

        {/* Progress bar */}
        <div className="flex h-1 w-full bg-muted">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-full flex-1 transition-all",
                idx <= i ? "bg-gradient-to-r from-amber-400 to-rose-500" : "bg-transparent",
                idx > 0 && "ml-0.5",
              )}
            />
          ))}
        </div>

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", step.tone)}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Step {i + 1} of {STEPS.length}
                </div>
                <h3 className="font-display text-lg font-bold leading-tight">{step.title}</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 min-h-[180px] text-sm leading-relaxed text-foreground/90">
            {step.body}
          </div>

          {isLast && (
            <div className="mt-4 rounded-2xl border border-emerald-300/40 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald-500/10 dark:to-teal-500/5">
              <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Free to start — no card required
              </div>
              <ul className="mt-2 space-y-1 text-xs text-emerald-900/80 dark:text-emerald-200/80">
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> 3-day free trial</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> No credit card to explore</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Upgrade only when you're ready</li>
              </ul>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setI((x) => Math.max(0, x - 1))}
              disabled={i === 0}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>

            <div className="flex gap-1.5">
              {STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setI(idx)}
                  aria-label={`Go to step ${idx + 1}`}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all",
                    idx === i ? "w-4 bg-foreground" : "bg-muted-foreground/30",
                  )}
                />
              ))}
            </div>

            {isLast ? (
              <Button asChild size="sm" className="bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:brightness-110">
                <Link to="/scan" onClick={onClose}>
                  Start scanning <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" onClick={() => setI((x) => Math.min(STEPS.length - 1, x + 1))}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="mt-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            Demo using: {DEMO_ITEMS.slice(0, 5).join(" · ")} …
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
