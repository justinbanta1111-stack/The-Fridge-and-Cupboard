import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Package, Soup, Sparkles, Bookmark, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { isEasyMode, setEasyMode, subscribeEasyMode } from "@/lib/easy-mode";

type Tile = {
  to: string;
  title: string;
  sub: string;
  Icon: typeof Clock;
  grad: string;
};

const TILES: Tile[] = [
  {
    to: "/going-bad",
    title: "Use It Before It Goes Bad",
    sub: "Meals from what's about to expire",
    Icon: Clock,
    grad: "from-rose-500 to-red-600",
  },
  {
    to: "/type-ingredients",
    title: "Make It With What I Have",
    sub: "No extra shopping needed",
    Icon: Package,
    grad: "from-emerald-500 to-green-600",
  },
  {
    to: "/rescue",
    title: "Leftover Makeover",
    sub: "Turn leftovers into a new meal",
    Icon: Soup,
    grad: "from-amber-500 to-orange-600",
  },
  {
    to: "/substitutions",
    title: "Ingredient Substitutions",
    sub: "Ask what to use instead",
    Icon: Sparkles,
    grad: "from-sky-500 to-blue-600",
  },
  {
    to: "/saved",
    title: "Save Favorite Meals",
    sub: "Your saved recipes",
    Icon: Bookmark,
    grad: "from-violet-500 to-purple-600",
  },
];

export function SmartCookingHub() {
  const [easy, setEasy] = useState(false);

  useEffect(() => {
    setEasy(isEasyMode());
    return subscribeEasyMode(setEasy);
  }, []);

  const toggle = (v: boolean) => {
    setEasy(v);
    setEasyMode(v);
  };

  return (
    <section className="mt-6">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold leading-tight">Smart Cooking</h2>
            <p className="text-xs text-muted-foreground">Fast ways to cook with what you already have.</p>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary px-3 py-1.5">
            <Zap className={`h-4 w-4 ${easy ? "text-amber-500" : "text-muted-foreground"}`} />
            <Label htmlFor="easy-mode" className="text-xs font-semibold cursor-pointer">
              Easy Mode
            </Label>
            <Switch id="easy-mode" checked={easy} onCheckedChange={toggle} />
          </label>
        </div>

        {easy && (
          <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50/70 p-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
            <Badge variant="secondary" className="mr-2 bg-amber-500 text-white">On</Badge>
            Fewer ingredients, shorter steps, less cleanup.
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {TILES.map((t) => (
            <Link
              key={t.to}
              to={t.to as any}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.grad} p-3.5 text-left text-white shadow-md ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                  <t.Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold leading-tight drop-shadow-sm">
                    {t.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/85">{t.sub}</div>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
            </Link>
          ))}
        </div>
      </Card>
    </section>
  );
}

export default SmartCookingHub;
