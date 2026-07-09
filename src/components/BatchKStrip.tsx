import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { batchKIdea } from "@/lib/batch-k.functions";
import { Loader2, Sparkles, Globe2, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "meal-wheel" | "mom-easy" | "global-flavor";
type Idea = Awaited<ReturnType<typeof batchKIdea>>;

const COUNTRIES = ["Mexico", "Italy", "Thailand", "Greece", "Japan", "India", "France"];
const MOM_OPTS = [
  { id: "picky", label: "Picky-eater meal" },
  { id: "lunchbox", label: "Lunchbox idea" },
  { id: "snacks", label: "After-school snack" },
  { id: "breakfast", label: "Easy breakfast" },
  { id: "dinner20", label: "20-min dinner" },
  { id: "budget", label: "Budget family meal" },
];
const WHEEL_THEMES = ["Taco Night", "Pasta Rescue", "Breakfast for Dinner", "Soup Night", "Stir Fry", "Rice Bowls", "Sheet-Pan", "Sandwich Bar"];

export function BatchKStrip({ items = [] as string[] }: { items?: string[] }) {
  const fn = useServerFn(batchKIdea);
  const [open, setOpen] = useState<null | { mode: Mode; title: string }>(null);
  const [spinIdx, setSpinIdx] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [idea, setIdea] = useState<Idea | null>(null);

  const mut = useMutation({
    mutationFn: (input: { mode: Mode; variant?: string }) =>
      fn({ data: { mode: input.mode, variant: input.variant, items } }),
    onSuccess: (r) => setIdea(r),
  });

  const launch = (mode: Mode, title: string) => {
    setIdea(null);
    setCountry(null);
    setOpen({ mode, title });
    if (mode === "meal-wheel") spinWheel();
  };

  const spinWheel = () => {
    setSpinning(true);
    let i = 0;
    const total = 18 + Math.floor(Math.random() * 8);
    const tick = () => {
      i++;
      setSpinIdx((p) => (p + 1) % WHEEL_THEMES.length);
      if (i < total) setTimeout(tick, 60 + i * 8);
      else {
        setSpinning(false);
        mut.mutate({ mode: "meal-wheel" });
      }
    };
    tick();
  };

  const spinGlobe = () => {
    setSpinning(true);
    let i = 0;
    const total = 16 + Math.floor(Math.random() * 6);
    const tick = () => {
      i++;
      setCountry(COUNTRIES[i % COUNTRIES.length]);
      if (i < total) setTimeout(tick, 70 + i * 10);
      else {
        const finalC = COUNTRIES[i % COUNTRIES.length];
        setCountry(finalC);
        setSpinning(false);
        mut.mutate({ mode: "global-flavor", variant: finalC });
      }
    };
    tick();
  };

  return (
    <>
      <Card className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/30 border-amber-200/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold">Fun Kitchen Tools</h3>
          </div>
          <Badge variant="secondary" className="text-xs">New</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button variant="outline" className="h-auto py-3 justify-start" onClick={() => launch("meal-wheel", "Spin the Meal Wheel")}>
            <span className="text-2xl mr-2">🎡</span>
            <span className="text-left">
              <div className="font-semibold text-sm">Spin the Meal Wheel</div>
              <div className="text-xs text-muted-foreground">Random meal idea</div>
            </span>
          </Button>
          <Button variant="outline" className="h-auto py-3 justify-start" onClick={() => launch("mom-easy", "Make It Easy For Mom")}>
            <HeartHandshake className="h-6 w-6 mr-2 text-rose-500 shrink-0" />
            <span className="text-left">
              <div className="font-semibold text-sm">Make It Easy For Mom</div>
              <div className="text-xs text-muted-foreground">Quick family help</div>
            </span>
          </Button>
          <Button variant="outline" className="h-auto py-3 justify-start" onClick={() => launch("global-flavor", "Pick Tonight's Country")}>
            <Globe2 className="h-6 w-6 mr-2 text-sky-500 shrink-0" />
            <span className="text-left">
              <div className="font-semibold text-sm">Global Flavor Night</div>
              <div className="text-xs text-muted-foreground">Pick a country</div>
            </span>
          </Button>
        </div>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
          </DialogHeader>

          {open?.mode === "meal-wheel" && (
            <div className="text-center py-2">
              <div className={cn("text-4xl font-bold py-6 transition-all", spinning && "animate-pulse scale-110")}>
                {WHEEL_THEMES[spinIdx]}
              </div>
              {!spinning && !mut.isPending && (
                <Button size="sm" variant="ghost" onClick={spinWheel}>Spin again</Button>
              )}
            </div>
          )}

          {open?.mode === "global-flavor" && (
            <div className="text-center py-2">
              {!country ? (
                <Button onClick={spinGlobe} className="my-4">🌍 Spin the globe</Button>
              ) : (
                <div className={cn("text-3xl font-bold py-4 transition-all", spinning && "animate-pulse scale-110")}>
                  🌍 {country}
                </div>
              )}
              {country && !spinning && !mut.isPending && (
                <Button size="sm" variant="ghost" onClick={spinGlobe}>Spin again</Button>
              )}
            </div>
          )}

          {open?.mode === "mom-easy" && !idea && !mut.isPending && (
            <div className="grid grid-cols-2 gap-2 py-2">
              {MOM_OPTS.map((o) => (
                <Button key={o.id} variant="outline" size="sm" onClick={() => mut.mutate({ mode: "mom-easy", variant: o.id })}>
                  {o.label}
                </Button>
              ))}
            </div>
          )}

          {mut.isPending && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chef Super J is cooking up an idea…
            </div>
          )}

          {mut.error && <p className="text-sm text-destructive">{(mut.error as Error).message}</p>}

          {idea && (
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-lg">{idea.title}</h4>
              {idea.tagline && <p className="text-sm text-muted-foreground italic">{idea.tagline}</p>}
              <Badge variant="secondary">⏱ {idea.time_minutes} min</Badge>
              <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
                {idea.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <Button size="sm" variant="ghost" onClick={() => { setIdea(null); if (open?.mode === "meal-wheel") spinWheel(); else if (open?.mode === "global-flavor") spinGlobe(); }}>
                Try another
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
