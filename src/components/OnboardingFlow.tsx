import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { X, ArrowRight, Check } from "lucide-react";
import {
  GOALS, HOUSEHOLDS, STYLES, PREFS,
  type PrimaryGoal, type HouseholdSize, type CookingStyle, type FoodPreference,
  getProfile, saveProfile,
} from "@/lib/user-profile";

type Step = 0 | 1 | 2 | 3 | 4;

export function OnboardingFlow({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [goal, setGoal] = useState<PrimaryGoal | undefined>();
  const [household, setHousehold] = useState<HouseholdSize | undefined>();
  const [style, setStyle] = useState<CookingStyle | undefined>();
  const [prefs, setPrefs] = useState<FoodPreference[]>([]);

  useEffect(() => {
    if (!open) return;
    const p = getProfile();
    setGoal(p.goal);
    setHousehold(p.household);
    setStyle(p.style);
    setPrefs(p.prefs ?? []);
    setStep(0);
  }, [open]);

  if (!open) return null;

  function next() {
    if (step < 4) setStep((s) => (s + 1) as Step);
  }
  function back() {
    if (step > 0) setStep((s) => (s - 1) as Step);
  }
  function finish() {
    saveProfile({ completed: true, goal, household, style, prefs });
    onClose();
  }
  function togglePref(id: FoodPreference) {
    setPrefs((cur) => (cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id]));
  }

  const canNext =
    (step === 0 && !!goal) ||
    (step === 1 && !!household) ||
    (step === 2 && !!style) ||
    step === 3 ||
    step === 4;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <Card className="relative w-full max-w-xl rounded-t-3xl rounded-b-none border-border/60 bg-card p-5 shadow-2xl sm:rounded-3xl">
        <button
          aria-label="Skip onboarding"
          onClick={() => { saveProfile({ completed: true }); onClose(); }}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress dots */}
        <div className="mb-4 flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                i <= step ? "bg-primary" : "bg-secondary",
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <Section
            eyebrow="Welcome"
            title="What do you want help with most?"
            subtitle="Pick one. We'll personalize the app for you."
          >
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <PickButton
                  key={g.id}
                  active={goal === g.id}
                  onClick={() => setGoal(g.id)}
                  emoji={g.emoji}
                  label={g.label}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section eyebrow="Household" title="How many people are you feeding?">
            <div className="grid grid-cols-5 gap-2">
              {HOUSEHOLDS.map((h) => (
                <PickButton
                  key={h.id}
                  active={household === h.id}
                  onClick={() => setHousehold(h.id)}
                  label={h.label}
                  big
                />
              ))}
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section eyebrow="Cooking style" title="What sounds most like you?">
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <PickButton
                  key={s.id}
                  active={style === s.id}
                  onClick={() => setStyle(s.id)}
                  emoji={s.emoji}
                  label={s.label}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section eyebrow="Food preferences" title="Choose any that apply" subtitle="Optional — skip if none.">
            <div className="flex flex-wrap gap-2">
              {PREFS.map((p) => {
                const active = prefs.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePref(p.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background hover:border-primary/40",
                    )}
                  >
                    {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {step === 4 && (
          <Section
            eyebrow="All set"
            title="Your kitchen is ready."
            subtitle="We'll line up the right tools for you on the homepage. You can change this anytime."
          >
            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm">
              <Row label="Helping with" value={GOALS.find((g) => g.id === goal)?.label ?? "—"} />
              <Row label="Household" value={household ? String(household) + (household === 8 ? "+" : "") : "—"} />
              <Row label="Cooking style" value={STYLES.find((s) => s.id === style)?.label ?? "—"} />
              <Row label="Preferences" value={prefs.length ? prefs.map((p) => PREFS.find((x) => x.id === p)?.label).join(", ") : "None"} />
            </div>
          </Section>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant={step === 0 ? "secondary" : "ghost"} size={step === 0 ? "default" : "default"} onClick={step === 0 ? () => { saveProfile({ completed: true }); onClose(); } : back}>
            {step === 0 ? "Continue to App" : "Back"}
          </Button>
          {step < 4 ? (
            <Button onClick={next} disabled={!canNext}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish}>Finish</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Section({
  eyebrow, title, subtitle, children,
}: { eyebrow: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">{eyebrow}</div>
      <h2 className="mt-1 font-display text-2xl leading-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PickButton({
  active, onClick, emoji, label, big,
}: { active: boolean; onClick: () => void; emoji?: string; label: string; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left text-sm transition-all",
        big && "text-center text-base font-semibold",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/60 bg-background hover:border-primary/40 hover:bg-secondary",
      )}
    >
      {emoji && <div className="text-xl">{emoji}</div>}
      <div className={cn("font-medium", !big && "mt-0.5")}>{label}</div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
