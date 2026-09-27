import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIET_OPTIONS, type DietId } from "@/lib/personalization";
import { Sparkles, X } from "lucide-react";

const GROUP_LABELS: Record<string, string> = {
  fasting: "Fasting & Lent",
  lifestyle: "Lifestyle",
  health: "Health conditions & goals",
  restriction: "Avoid / allergies",
  audience: "Who's eating",
};

// Follow-up questions shown only when Hashimoto's is selected. Nothing here
// is assumed — the user taps only what applies to them.
const HASHIMOTOS_QUESTIONS: { id: DietId; label: string }[] = [
  { id: "gluten-free", label: "I avoid gluten" },
  { id: "dairy-free", label: "I avoid dairy" },
  { id: "soy-free", label: "I avoid soy" },
  { id: "low-iodine", label: "I limit iodine (doctor's advice)" },
];

export function DietaryPicker({
  prefs,
  onToggle,
  onClear,
  compact = false,
  notes,
  onNotesChange,
}: {
  prefs: DietId[];
  onToggle: (id: DietId) => void;
  onClear: () => void;
  compact?: boolean;
  notes?: string;
  onNotesChange?: (value: string) => void;
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

      {prefs.includes("hashimotos") && (
        <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            Personalize your Hashimoto's meals
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Everyone's Hashimoto's is different — tap only what applies to you. We won't
            remove any food unless you say so.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {HASHIMOTOS_QUESTIONS.map((q) => {
              const active = prefs.includes(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onToggle(q.id)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
                  )}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
          {onNotesChange && (
            <textarea
              value={notes ?? ""}
              onChange={(e) => onNotesChange(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Other restrictions or your doctor's guidance (e.g. limit raw cruciferous veggies, no kelp)…"
              className="mt-2 w-full resize-none rounded-lg border border-border/70 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            The Fridge &amp; Cupboard provides meal ideas, not medical advice. Always follow
            your doctor's guidance for your condition.
          </p>
        </div>
      )}

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
