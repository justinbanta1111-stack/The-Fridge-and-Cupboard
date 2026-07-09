import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIET_OPTIONS, type DietId } from "@/lib/personalization";
import { Sparkles, X } from "lucide-react";

const GROUP_LABELS: Record<string, string> = {
  fasting: "Fasting & Lent",
  lifestyle: "Lifestyle",
  health: "Health goals",
  restriction: "Avoid / allergies",
  audience: "Who's eating",
};

export function DietaryPicker({
  prefs,
  onToggle,
  onClear,
  compact = false,
}: {
  prefs: DietId[];
  onToggle: (id: DietId) => void;
  onClear: () => void;
  compact?: boolean;
}) {
  const groups = Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>;

  return (
    <Card className={cn("ring-paper border-border/60 bg-card", compact ? "p-4" : "p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Personalize your picks
          </div>
          <h3 className="mt-1 font-display text-xl">Tell us how you eat</h3>
          <p className="text-sm text-muted-foreground">
            We'll tailor recipes, cooking lessons, herb pairings, and tips to what you scan.
          </p>
        </div>
        {prefs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {groups.map((g) => {
          const options = DIET_OPTIONS.filter((o) => o.group === g);
          return (
            <div key={g}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {GROUP_LABELS[g]}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {options.map((o) => {
                  const active = prefs.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onToggle(o.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
                      )}
                      title={o.hint}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {prefs.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>Active:</span>
          {prefs.map((id) => {
            const o = DIET_OPTIONS.find((x) => x.id === id);
            return (
              <Badge key={id} variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                {o?.label ?? id}
              </Badge>
            );
          })}
        </div>
      )}
    </Card>
  );
}
