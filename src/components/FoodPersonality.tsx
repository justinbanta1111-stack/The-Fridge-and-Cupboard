import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, ChefHat } from "lucide-react";
import {
  FOOD_TAGS,
  loadPersonality,
  toggleTag,
  personalitySummary,
  smartSuggestionLine,
  type FoodPersonality,
} from "@/lib/food-personality";

export function FoodPersonalityCard() {
  const [profile, setProfile] = useState<FoodPersonality | null>(null);

  useEffect(() => {
    setProfile(loadPersonality());
    const refresh = () => setProfile(loadPersonality());
    window.addEventListener("food-personality:change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("food-personality:change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!profile) return null;

  const summary = personalitySummary(profile);
  const suggestion = smartSuggestionLine(profile);
  const active = new Set(profile.tags);

  return (
    <Card className="ring-paper mt-4 border-primary/25 bg-gradient-to-br from-primary/8 via-card to-accent/5 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
        <Heart className="h-3.5 w-3.5" /> My Food Personality
      </div>

      <h3 className="mt-1 font-display text-xl leading-tight">
        {summary ?? "Let's learn how you cook."}
      </h3>

      <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>{suggestion}</span>
      </p>

      <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        Tap what fits you — Chef Super J remembers
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {FOOD_TAGS.map((t) => {
          const on = active.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              aria-pressed={on}
              title={t.hint}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                "active:scale-[0.97]",
                on
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5",
              ].join(" ")}
            >
              <span aria-hidden="true">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {profile.sessions > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary text-[10px] uppercase tracking-widest">
            <ChefHat className="mr-1 h-3 w-3" /> {profile.sessions} session{profile.sessions === 1 ? "" : "s"} learned
          </Badge>
          <span>Your picks shape tonight's meal ideas.</span>
        </div>
      )}
    </Card>
  );
}
