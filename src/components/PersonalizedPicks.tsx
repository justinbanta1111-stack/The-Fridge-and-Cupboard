import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  pickPersonalizedLessons,
  pickPersonalizedTip,
  extractIngredientKeywords,
  dietLabel,
  type DietId,
} from "@/lib/personalization";
import { GraduationCap, PlayCircle, Sparkles, Lightbulb } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PersonalizedPicks({
  itemNames,
  prefs,
}: {
  itemNames: string[];
  prefs: DietId[];
}) {
  const lessons = useMemo(() => pickPersonalizedLessons(itemNames, prefs, 6), [itemNames, prefs]);
  const tip = useMemo(() => pickPersonalizedTip(itemNames, prefs), [itemNames, prefs]);
  const keywords = useMemo(() => extractIngredientKeywords(itemNames), [itemNames]);

  if (lessons.length === 0) return null;

  return (
    <Card className="ring-paper border-accent/30 bg-gradient-to-br from-accent/8 via-card to-primary/5 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
        <GraduationCap className="h-3.5 w-3.5" /> Picked for you
      </div>
      <h3 className="mt-1 font-display text-xl">
        Lessons from Chef Super J{keywords.length > 0 ? ` — based on your ${keywords.slice(0, 3).join(", ")}` : ""}
      </h3>
      {(prefs.length > 0 || keywords.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {keywords.slice(0, 6).map((k) => (
            <Badge key={k} variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px] uppercase tracking-widest">
              {k}
            </Badge>
          ))}
          {prefs.map((p) => (
            <Badge key={p} variant="outline" className="border-accent/40 bg-accent/10 text-accent text-[10px] uppercase tracking-widest">
              {dietLabel(p)}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {lessons.map((l) => (
          <div key={l.id} className="rounded-lg border border-border/60 bg-background/70 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="font-display text-base leading-tight">{l.title}</div>
              <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">{l.duration}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{l.text}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
              <PlayCircle className="h-3.5 w-3.5" /> Watch lesson
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/8 p-3">
        <div className="flex items-start gap-2 text-sm">
          <Lightbulb className="mt-0.5 h-4 w-4 text-accent" />
          <span><span className="font-semibold text-accent">Tip:</span> {tip.text}</span>
        </div>
        <Link
          to="/pro"
          className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-background px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-accent hover:bg-accent/10"
        >
          <Sparkles className="h-3.5 w-3.5" /> Unlock Cooking School
        </Link>
      </div>
    </Card>
  );
}
