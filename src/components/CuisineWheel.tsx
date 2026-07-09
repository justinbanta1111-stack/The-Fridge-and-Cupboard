import { useState } from "react";
import { Loader2, Sparkles, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CUISINES } from "@/lib/cuisines";
import { surpriseMeRecipe } from "@/lib/chef-ideas.functions";
import { toast } from "sonner";

export function CuisineWheel() {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [meal, setMeal] = useState<{ title: string; why: string; steps: string[]; time_minutes: number } | null>(
    null,
  );

  const slice = 360 / CUISINES.length;

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setMeal(null);
    setSelected(null);

    const targetIndex = Math.floor(Math.random() * CUISINES.length);
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + fullSpins * 360 + (360 - targetIndex * slice - slice / 2);
    setRotation(finalRotation);

    setTimeout(async () => {
      const chosen = CUISINES[targetIndex];
      setSelected(chosen.name);
      setSpinning(false);
      setLoadingMeal(true);
      try {
        const res = await surpriseMeRecipe({
          data: { mood: `${chosen.name} cuisine — authentic flavors, doable for a home cook` },
        });
        setMeal(res);
      } catch (e: any) {
        toast.error(e?.message ?? "Chef is busy. Try again.");
      } finally {
        setLoadingMeal(false);
      }
    }, 4200);
  }

  // SVG wheel geometry
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  function polar(angleDeg: number, radius: number) {
    const a = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  }

  function slicePath(i: number) {
    const start = i * slice;
    const end = (i + 1) * slice;
    const s = polar(start, r);
    const e = polar(end, r);
    const large = slice > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  }

  return (
    <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-card p-6">
      <div className="flex items-center gap-2 text-primary">
        <Globe2 className="h-4 w-4" />
        <span className="text-xs uppercase tracking-widest">Around the World Night</span>
      </div>
      <h3 className="mt-1 font-display text-2xl">Spin the wheel. Cook the world.</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap the wheel — land on a cuisine, get a Chef-built meal you can make tonight.
      </p>

      <div className="mt-6 flex flex-col items-center gap-5">
        <div className="relative" style={{ width: size, maxWidth: "100%" }}>
          {/* Pointer */}
          <div className="absolute left-1/2 -top-1 z-20 -translate-x-1/2">
            <div className="h-0 w-0 border-x-[12px] border-t-[20px] border-x-transparent border-t-primary drop-shadow-lg" />
          </div>

          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            aria-label="Spin the cuisine wheel"
            className="block w-full rounded-full focus:outline-none focus:ring-4 focus:ring-primary/40 disabled:cursor-not-allowed"
            style={{ aspectRatio: "1 / 1" }}
          >
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="h-full w-full drop-shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 4000ms cubic-bezier(0.17, 0.67, 0.21, 0.99)" : "none",
              }}
            >
              <circle cx={cx} cy={cy} r={r + 4} fill="hsl(var(--primary))" opacity="0.25" />
              {CUISINES.map((c, i) => {
                const mid = i * slice + slice / 2;
                const labelPos = polar(mid, r * 0.62);
                const emojiPos = polar(mid, r * 0.86);
                return (
                  <g key={c.name}>
                    <path d={slicePath(i)} fill={c.color} stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      fill="white"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${mid} ${labelPos.x} ${labelPos.y})`}
                      style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 2 }}
                    >
                      {c.name}
                    </text>
                    <text
                      x={emojiPos.x}
                      y={emojiPos.y}
                      fontSize="18"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {c.emoji}
                    </text>
                  </g>
                );
              })}
              <circle cx={cx} cy={cy} r={28} fill="white" stroke="hsl(var(--primary))" strokeWidth="3" />
            </svg>
            {/* Hub icon (not rotated) */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {spinning ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-6 w-6 text-primary" />
              )}
            </div>
          </button>
        </div>

        <Button onClick={spin} disabled={spinning} size="lg" className="w-full sm:w-auto">
          {spinning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe2 className="mr-2 h-4 w-4" />}
          {spinning ? "Spinning…" : selected ? "Spin again" : "Spin the wheel"}
        </Button>

        <div className="w-full">
          {selected && (
            <div className="rounded-lg bg-secondary/60 px-3 py-2 text-center text-sm">
              Tonight's cuisine: <span className="font-semibold">{selected}</span>
            </div>
          )}
          {loadingMeal && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chef is plating it…
            </div>
          )}
          {meal && (
            <div className="mt-3 rounded-xl border border-border bg-background/60 p-4">
              <div className="font-display text-lg">{meal.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">~{meal.time_minutes} min</div>
              {meal.why && <p className="mt-2 text-sm">{meal.why}</p>}
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                {meal.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
