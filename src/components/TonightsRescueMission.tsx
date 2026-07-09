import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Flame, Zap, Heart, Users, Loader2, Sparkles, ChefHat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefAvatar } from "@/components/ChefAvatar";
import { tonightsRescueMission, type RescueMission } from "@/lib/rescue-mission.functions";
import { logCookedMeal, getRecentInventory } from "@/lib/savings.functions";
import { ShareMenu } from "@/components/ShareMenu";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { dietLabel } from "@/lib/personalization";
import { getFunnyMode } from "@/lib/funny-chef";
import { celebrate } from "@/components/effects/Celebration";
import { playChaChing } from "@/lib/sound-effects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Variant = "fastest" | "healthiest" | "family";

const VARIANTS: { id: Variant; label: string; icon: typeof Zap; tone: string }[] = [
  { id: "fastest", label: "Fastest", icon: Zap, tone: "from-amber-400 to-orange-500" },
  { id: "healthiest", label: "Healthiest", icon: Heart, tone: "from-emerald-400 to-teal-500" },
  { id: "family", label: "Family-Friendly", icon: Users, tone: "from-rose-400 to-pink-500" },
];

export function TonightsRescueMission() {
  const { prefs } = useDietaryPrefs();
  const missionFn = useServerFn(tonightsRescueMission);
  const inventoryFn = useServerFn(getRecentInventory);
  const cookedFn = useServerFn(logCookedMeal);
  const [picked, setPicked] = useState<Variant | null>(null);

  const missionMut = useMutation({
    mutationFn: async () => {
      let items: string[] = [];
      let leftovers: string[] = [];
      let expiring: string[] = [];
      try {
        const inv = await inventoryFn();
        items = inv?.items ?? [];
        // Heuristic: server doesn't separate, so we just pass all as items.
        // Leftovers/expiring filled by AI from context.
      } catch {}
      return missionFn({
        data: {
          items,
          leftovers,
          expiringSoon: expiring,
          cuisines: [],
          restrictions: prefs.map((p) => dietLabel(p)),
          funnyChef: getFunnyMode(),
        },
      });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't generate mission"),
  });

  const cookedMut = useMutation({
    mutationFn: (vars: { title: string; cents: number; pounds: number }) =>
      cookedFn({
        data: {
          recipeTitle: vars.title,
          estimatedSavingsCents: vars.cents,
          poundsRescued: vars.pounds,
          source: "recipe",
        },
      }),
    onSuccess: () => {
      try { playChaChing(); } catch {}
      celebrate();
      toast.success("Mission accomplished! Saved to your kitchen wins.");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't log meal"),
  });

  const mission: RescueMission | undefined = missionMut.data;

  return (
    <section className="mt-8">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[oklch(0.25_0.05_25)] via-[oklch(0.2_0.06_15)] to-[oklch(0.18_0.08_350)] p-5 text-white shadow-[0_20px_60px_-20px_oklch(0.5_0.2_15/0.5)] sm:p-7">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-amber-400/30 to-rose-500/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-orange-500/20 to-pink-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 shadow-lg">
                <Flame className="h-4 w-4 text-white" />
              </span>
              <Badge className="border-amber-300/40 bg-amber-300/15 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
                Tonight's Mission
              </Badge>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Tonight's Rescue Mission
            </h2>
            <p className="mt-1 text-sm text-white/70">
              One food. One mission. Save dinner — and the planet (a little).
            </p>
          </div>
        </div>

        {!mission && (
          <div className="relative mt-5">
            <Button
              size="lg"
              onClick={() => { setPicked(null); missionMut.mutate(); }}
              disabled={missionMut.isPending}
              className="w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-base font-bold text-white shadow-xl hover:brightness-110 sm:w-auto"
            >
              {missionMut.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chef Super J is scouting your fridge…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Start Tonight's Mission</>
              )}
            </Button>
            <p className="mt-2 text-xs text-white/60">
              Uses your latest fridge + cupboard scans, leftovers, and what's about to go bad.
            </p>
          </div>
        )}

        {mission && (
          <div className="relative mt-5 space-y-4">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
                Hero ingredient
              </div>
              <div className="mt-1 font-display text-xl font-bold leading-tight sm:text-2xl">
                {mission.mission}
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-black/20 p-3 ring-1 ring-white/10">
                <ChefAvatar className="h-9 w-9 shrink-0" />
                <div className="text-sm leading-snug text-white/90">
                  <span className="font-bold text-amber-200">Chef Super J: </span>
                  {mission.chefMessage}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {VARIANTS.map((v) => {
                const meal = mission.meals[v.id];
                const Icon = v.icon;
                const isPicked = picked === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setPicked(v.id);
                      cookedMut.mutate({
                        title: meal.title,
                        cents: mission.estimatedSavingsCents,
                        pounds: mission.poundsRescued,
                      });
                    }}
                    disabled={cookedMut.isPending}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/15 backdrop-blur transition-all hover:bg-white/15 hover:ring-white/30 disabled:opacity-60",
                      isPicked && "ring-2 ring-amber-300",
                    )}
                  >
                    <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-md", v.tone)}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/60">{v.label}</div>
                    <div className="mt-0.5 font-display text-base font-bold leading-tight">{meal.title}</div>
                    <div className="mt-1 text-xs text-white/70 line-clamp-2">{meal.tagline}</div>
                    <div className="mt-2 text-[11px] text-amber-200/90">~{meal.timeMinutes ?? 25} min · I'll cook this</div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPicked(null); missionMut.mutate(); }}
                disabled={missionMut.isPending}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                {missionMut.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ChefHat className="mr-2 h-3.5 w-3.5" />}
                New mission
              </Button>
              <ShareMenu
                label="I saved dinner"
                title="I saved dinner with The Fridge & Cupboard."
                text={`🚨 Tonight's Rescue Mission: ${mission.mission}\nI'm making ${picked ? mission.meals[picked].title : mission.meals.fastest.title}.\nI saved dinner with The Fridge & Cupboard.`}
                url="https://thefridgeandcupboard.com"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              />

            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
