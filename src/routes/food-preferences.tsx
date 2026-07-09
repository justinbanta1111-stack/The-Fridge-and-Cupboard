import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { storePendingCheckout } from "@/lib/checkout-intent";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { toast } from "sonner";

export const Route = createFileRoute("/food-preferences")({
  head: () => ({
    meta: [
      { title: "Food Preferences — Customize Your Meals | The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Customize your food preferences — diet, allergies, dislikes, favorite cuisines, spice level, and household size. Premium upgrade unlocks full personalization.",
      },
    ],
  }),
  component: FoodPreferencesPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="text-red-500 mb-4">{error.message}</p>
      <button onClick={reset} className="underline">Try again</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const DIET_OPTIONS = ["Vegetarian", "Vegan", "Pescatarian", "Keto", "Paleo", "Gluten-Free", "Dairy-Free", "Low-Carb", "Mediterranean", "Halal", "Kosher"];
const ALLERGY_OPTIONS = ["Peanuts", "Tree Nuts", "Dairy", "Eggs", "Soy", "Wheat", "Shellfish", "Fish", "Sesame"];
const CUISINE_OPTIONS = ["Italian", "Mexican", "Asian", "American", "Indian", "Mediterranean", "French", "Thai", "Japanese", "Middle Eastern", "BBQ", "Comfort Food"];

type Prefs = {
  diets: string[];
  allergies: string[];
  dislikes: string[];
  favorite_cuisines: string[];
  spice_level: number;
  household_size: number;
  notes: string;
};

const DEFAULTS: Prefs = {
  diets: [],
  allergies: [],
  dislikes: [],
  favorite_cuisines: [],
  spice_level: 2,
  household_size: 2,
  notes: "",
};

function FoodPreferencesPage() {
  const sub = useSubscription();
  const navigate = useNavigate();
  const { openCheckout, checkoutElement } = useStripeCheckout();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [dislikesText, setDislikesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canCustomize = sub.isActive; // Any paid plan can save preferences

  useEffect(() => {
    if (sub.loading) return;
    if (!sub.userId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("food_preferences")
        .select("*")
        .eq("user_id", sub.userId!)
        .maybeSingle();
      if (data) {
        const p: Prefs = {
          diets: data.diets ?? [],
          allergies: data.allergies ?? [],
          dislikes: data.dislikes ?? [],
          favorite_cuisines: data.favorite_cuisines ?? [],
          spice_level: data.spice_level ?? 2,
          household_size: data.household_size ?? 2,
          notes: data.notes ?? "",
        };
        setPrefs(p);
        setDislikesText(p.dislikes.join(", "));
      }
      setLoading(false);
    })();
  }, [sub.loading, sub.userId]);

  const toggle = (key: keyof Prefs, value: string) => {
    setPrefs((p) => {
      const arr = p[key] as string[];
      return { ...p, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const handleSave = async () => {
    if (!sub.userId) {
      toast.error("Please sign in to save preferences.");
      navigate({ to: "/auth" });
      return;
    }
    if (!canCustomize) {
      toast.error("Upgrade to save your preferences.");
      return;
    }
    setSaving(true);
    const dislikes = dislikesText.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = { ...prefs, dislikes, user_id: sub.userId };
    const { error } = await supabase.from("food_preferences").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      setPrefs((p) => ({ ...p, dislikes }));
      toast.success("Preferences saved!");
    }
  };

  const startUpgrade = () => {
    if (!sub.userId) {
      storePendingCheckout("standard_monthly");
      navigate({ to: "/auth" });
      return;
    }
    openCheckout({ priceId: "standard_monthly", returnUrl: `${window.location.origin}/food-preferences` });
  };

  const upgradeCard = !canCustomize && !sub.loading;

  return (
    <>
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/30 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back home</Link>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Your Food Preferences</h1>
        <p className="mt-2 text-muted-foreground">
          Personalize every recipe Chef Super J suggests. Set your diet, allergies, dislikes, and favorite flavors.
        </p>

        {upgradeCard && (
          <div className="mt-6 rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-red-500/10 p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wider text-accent font-bold">Upgrade required</div>
                <h2 className="text-2xl font-extrabold mt-1">Unlock Custom Food Preferences</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  Subscribe for just <span className="font-bold text-foreground">$3.99/month</span> to save your preferences and get fully personalized recipes from Chef Super J.
                </p>
              </div>
              <button
                onClick={startUpgrade}
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-white font-bold shadow-lg hover:scale-105 transition"
              >
                Upgrade — $3.99/mo
              </button>
            </div>
          </div>
        )}

        <fieldset disabled={!canCustomize || loading} className={`mt-8 space-y-8 ${!canCustomize ? "opacity-60" : ""}`}>
          <Section title="Diet" subtitle="Pick any that apply">
            <Chips options={DIET_OPTIONS} selected={prefs.diets} onToggle={(v) => toggle("diets", v)} />
          </Section>

          <Section title="Allergies" subtitle="We'll always exclude these">
            <Chips options={ALLERGY_OPTIONS} selected={prefs.allergies} onToggle={(v) => toggle("allergies", v)} />
          </Section>

          <Section title="Favorite Cuisines">
            <Chips options={CUISINE_OPTIONS} selected={prefs.favorite_cuisines} onToggle={(v) => toggle("favorite_cuisines", v)} />
          </Section>

          <Section title="Foods You Dislike" subtitle="Comma-separated (e.g. mushrooms, cilantro)">
            <input
              type="text"
              value={dislikesText}
              onChange={(e) => setDislikesText(e.target.value)}
              placeholder="mushrooms, olives, cilantro"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </Section>

          <div className="grid sm:grid-cols-2 gap-6">
            <Section title={`Spice Level: ${["None", "Mild", "Medium", "Hot", "Very Hot", "Inferno"][prefs.spice_level]}`}>
              <input
                type="range" min={0} max={5} value={prefs.spice_level}
                onChange={(e) => setPrefs((p) => ({ ...p, spice_level: Number(e.target.value) }))}
                className="w-full accent-orange-500"
              />
            </Section>
            <Section title="Household Size">
              <input
                type="number" min={1} max={20} value={prefs.household_size}
                onChange={(e) => setPrefs((p) => ({ ...p, household_size: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))}
                className="w-32 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </Section>
          </div>

          <Section title="Notes for Chef Super J" subtitle="Anything else we should know?">
            <textarea
              value={prefs.notes}
              onChange={(e) => setPrefs((p) => ({ ...p, notes: e.target.value.slice(0, 500) }))}
              rows={3}
              placeholder="e.g. I love one-pan meals and quick dinners under 30 minutes."
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </Section>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !canCustomize}
              className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-8 py-3 text-white font-bold shadow-lg hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        </fieldset>
      </div>
    </main>
    {checkoutElement}
    </>
  );
}


function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
              on
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent shadow"
                : "bg-background border-border hover:border-accent"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
