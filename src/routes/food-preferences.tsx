import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_FOOD_RESTRICTION_PROFILE,
  foodRestrictionProfileSchema,
  useDietaryPrefs,
  type FoodRestrictionProfile,
} from "@/hooks/use-dietary-prefs";

export const Route = createFileRoute("/food-preferences")({
  head: () => ({ meta: [
    { title: "Food Restrictions & Preferences | The Fridge and Cupboard" },
    { name: "description", content: "Tell Chef about allergies, medical needs, fasting requirements, special diets, foods you cannot eat, and personal dislikes." },
    { property: "og:title", content: "Food Restrictions & Preferences — The Fridge and Cupboard" },
    { property: "og:description", content: "Personalize every scan, recipe, meal suggestion, and Store Mode recommendation." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: FoodPreferencesPage,
  errorComponent: ({ error, reset }) => <main className="p-8 text-center"><p className="mb-4 text-destructive">{error instanceof Error ? error.message : String(error)}</p><Button onClick={reset}>Try again</Button></main>,
  notFoundComponent: () => <main className="p-8">Not found</main>,
});

const DIETS = ["Vegetarian", "Vegan", "Pescatarian", "Keto", "Paleo", "Gluten-Free", "Dairy-Free", "Low-Carb", "Mediterranean", "Halal", "Kosher"];
const ALLERGIES = ["Peanuts", "Tree Nuts", "Dairy", "Eggs", "Soy", "Wheat", "Shellfish", "Fish", "Sesame"];
const CONDITIONS = ["Diabetes", "GERD / Acid Reflux", "Heart Health", "Hashimoto's", "Low-Iodine Need"];
const FASTING = ["Orthodox Fasting", "Lenten / Meatless Fridays", "Ramadan", "Other Religious Fast"];
const CUISINES = ["Italian", "Mexican", "Asian", "American", "Indian", "Mediterranean", "French", "Thai", "Japanese", "Middle Eastern", "BBQ", "Comfort Food"];

const splitList = (value: string) => Array.from(new Set(value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean))).slice(0, 50);

function FoodPreferencesPage() {
  const { profile, saveProfile } = useDietaryPrefs();
  const [draft, setDraft] = useState<FoodRestrictionProfile>(EMPTY_FOOD_RESTRICTION_PROFILE);
  const [cannotEat, setCannotEat] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(profile);
    setCannotEat(profile.cannot_eat.join(", "));
    setDislikes(profile.dislikes.join(", "));
  }, [profile]);

  const toggle = (key: "diets" | "allergies" | "medical_conditions" | "fasting_requirements" | "favorite_cuisines", value: string) => {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));
  };

  async function handleSave() {
    const checked = foodRestrictionProfileSchema.safeParse({
      ...draft,
      cannot_eat: splitList(cannotEat),
      dislikes: splitList(dislikes),
    });
    if (!checked.success) {
      toast.error(checked.error.issues[0]?.message ?? "Please check your entries.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveProfile(checked.data);
      toast.success(result.savedToProfile ? "Food restrictions saved to your profile." : "Food restrictions saved on this device.");
    } catch {
      toast.error("Saved on this device, but profile sync is unavailable right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back home</Link>
        <div className="mt-3 flex items-start gap-3">
          <ShieldCheck className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden />
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">My Food Restrictions</h1>
            <p className="mt-2 text-muted-foreground">Chef uses these choices for every recipe, scan, meal suggestion, follow-up, and Store Mode recommendation.</p>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <Section title="Allergies" subtitle="Chef will treat these as absolute exclusions."><Chips options={ALLERGIES} selected={draft.allergies} onToggle={(value) => toggle("allergies", value)} /></Section>
          <Section title="Foods I Cannot Eat" subtitle="Enter foods or ingredients, separated by commas."><Input value={cannotEat} maxLength={1000} onChange={(event) => setCannotEat(event.target.value)} placeholder="For example: avocado, red dye 40, onions" /></Section>
          <Section title="Medical or Health Conditions" subtitle="Chef will accommodate these without replacing medical advice."><Chips options={CONDITIONS} selected={draft.medical_conditions} onToggle={(value) => toggle("medical_conditions", value)} /></Section>
          <Section title="Religious Fasting Requirements"><Chips options={FASTING} selected={draft.fasting_requirements} onToggle={(value) => toggle("fasting_requirements", value)} /></Section>
          <Section title="Special Diets"><Chips options={DIETS} selected={draft.diets} onToggle={(value) => toggle("diets", value)} /></Section>
          <Section title="Foods I Dislike" subtitle="Chef will avoid these when possible."><Input value={dislikes} maxLength={1000} onChange={(event) => setDislikes(event.target.value)} placeholder="For example: mushrooms, olives, cilantro" /></Section>
          <Section title="Favorite Cuisines"><Chips options={CUISINES} selected={draft.favorite_cuisines} onToggle={(value) => toggle("favorite_cuisines", value)} /></Section>

          <div className="grid gap-6 sm:grid-cols-2">
            <Section title={`Spice Level: ${["None", "Mild", "Medium", "Hot", "Very Hot", "Inferno"][draft.spice_level]}`}>
              <input aria-label="Spice level" type="range" min={0} max={5} value={draft.spice_level} onChange={(event) => setDraft((current) => ({ ...current, spice_level: Number(event.target.value) }))} className="w-full accent-primary" />
            </Section>
            <Section title="Household Size"><Input aria-label="Household size" type="number" min={1} max={20} value={draft.household_size} onChange={(event) => setDraft((current) => ({ ...current, household_size: Math.max(1, Math.min(20, Number(event.target.value) || 1)) }))} className="w-32" /></Section>
          </div>

          <Section title="Anything Else Chef Should Know?" subtitle="Include personal requirements or guidance from your care team."><Textarea value={draft.notes} maxLength={1000} rows={4} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Add any details that help Chef keep recommendations right for you." /></Section>
          <div className="flex justify-end"><Button size="lg" onClick={handleSave} disabled={saving}><Save aria-hidden />{saving ? "Saving…" : "Save My Food Restrictions"}</Button></div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-bold">{title}</h2>{subtitle && <p className="mb-3 text-sm text-muted-foreground">{subtitle}</p>}<div className="mt-2">{children}</div></section>;
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map((option) => <Button key={option} type="button" variant={selected.includes(option) ? "default" : "outline"} size="sm" aria-pressed={selected.includes(option)} onClick={() => onToggle(option)}>{option}</Button>)}</div>;
}