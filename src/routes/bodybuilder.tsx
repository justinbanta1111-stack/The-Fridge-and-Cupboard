import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { Dumbbell, Flame, Zap, Salad, Clock, ArrowLeft, Beef, Egg, Fish } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";

export const Route = createFileRoute("/bodybuilder")({
  component: BodybuilderPage,
  head: () => ({
    meta: [
      { title: "Bodybuilder & High-Protein Meals | The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "High-protein meal ideas for bodybuilders — lean bulking, cutting, low-carb, meal prep, and post-workout recipes using chicken, turkey, beef, fish, eggs, beans, and more.",
      },
    ],
  }),
});

type Category = "high-protein" | "lean-bulk" | "cutting" | "low-carb" | "meal-prep" | "post-workout" | "macro";

type Meal = {
  name: string;
  protein: string;
  carbs?: string;
  veg?: string;
  notes: string;
  cats: Category[];
  time: string;
};

const PROTEINS = [
  { icon: Beef, label: "Lean chicken breast" },
  { icon: Beef, label: "Turkey breast" },
  { icon: Beef, label: "Lean ground turkey" },
  { icon: Beef, label: "Lean ground beef (93/7)" },
  { icon: Beef, label: "Sirloin / top round steak" },
  { icon: Fish, label: "Tuna" },
  { icon: Fish, label: "Salmon" },
  { icon: Fish, label: "Cod" },
  { icon: Fish, label: "Shrimp" },
  { icon: Egg, label: "Eggs & egg whites" },
  { icon: Egg, label: "Greek yogurt" },
  { icon: Egg, label: "Cottage cheese" },
  { icon: Salad, label: "Beans & lentils" },
];

const CARBS = ["Rice", "Potatoes", "Oats", "Sweet potatoes"];
const VEG = ["Broccoli", "Spinach", "Asparagus", "Peppers", "Mixed greens"];

const MEALS: Meal[] = [
  {
    name: "Grilled Chicken, Rice & Broccoli",
    protein: "Chicken breast (8 oz)",
    carbs: "Jasmine rice (1 cup cooked)",
    veg: "Steamed broccoli",
    notes: "The classic. Season chicken with garlic, paprika, salt. Drizzle olive oil + lemon to finish.",
    cats: ["high-protein", "lean-bulk", "meal-prep", "macro"],
    time: "25 min",
  },
  {
    name: "Turkey & Sweet Potato Power Bowl",
    protein: "Lean ground turkey",
    carbs: "Roasted sweet potato cubes",
    veg: "Spinach + peppers",
    notes: "Brown turkey with cumin and chili powder. Toss everything in a bowl with hot sauce.",
    cats: ["high-protein", "lean-bulk", "meal-prep", "post-workout"],
    time: "30 min",
  },
  {
    name: "Sirloin Steak & Baked Potato",
    protein: "Sirloin (6 oz)",
    carbs: "Baked potato",
    veg: "Asparagus",
    notes: "Salt steak 30 min ahead. Sear 3 min/side, rest 5 min. Top potato with Greek yogurt.",
    cats: ["high-protein", "lean-bulk", "macro"],
    time: "35 min",
  },
  {
    name: "Salmon, Quinoa & Greens",
    protein: "Salmon fillet (6 oz)",
    carbs: "Quinoa",
    veg: "Spinach + asparagus",
    notes: "Bake salmon at 400°F for 12 min with lemon and dill. Heart-healthy fats + complete protein.",
    cats: ["high-protein", "lean-bulk", "post-workout", "macro"],
    time: "25 min",
  },
  {
    name: "Egg White Veggie Scramble",
    protein: "6 egg whites + 2 whole eggs",
    veg: "Peppers, spinach, onions",
    notes: "Low-cal, high-protein breakfast. Add salsa for flavor without macros.",
    cats: ["high-protein", "cutting", "low-carb"],
    time: "10 min",
  },
  {
    name: "Tuna & Greek Yogurt Wrap",
    protein: "Canned tuna + Greek yogurt (instead of mayo)",
    carbs: "Whole-wheat tortilla",
    veg: "Lettuce, tomato, cucumber",
    notes: "Mix tuna with plain Greek yogurt, lemon, dill, pepper. Quick lunch, 40g+ protein.",
    cats: ["high-protein", "cutting", "meal-prep"],
    time: "8 min",
  },
  {
    name: "Shrimp Stir-Fry",
    protein: "Shrimp (8 oz)",
    carbs: "Optional jasmine rice",
    veg: "Broccoli, peppers, snap peas",
    notes: "High heat, 4 min total. Sauce: soy + garlic + ginger + splash of rice vinegar.",
    cats: ["high-protein", "cutting", "low-carb", "post-workout"],
    time: "15 min",
  },
  {
    name: "Cottage Cheese Bowl",
    protein: "Cottage cheese (1 cup)",
    veg: "Cucumber, cherry tomatoes",
    notes: "Add cracked pepper, everything-bagel seasoning. 25g protein, super filling.",
    cats: ["high-protein", "cutting", "low-carb"],
    time: "3 min",
  },
  {
    name: "Overnight Oats with Greek Yogurt",
    protein: "Greek yogurt + optional protein powder",
    carbs: "Rolled oats",
    notes: "Mix oats, yogurt, milk, berries. Refrigerate overnight. Easy macro-friendly breakfast.",
    cats: ["high-protein", "lean-bulk", "meal-prep", "post-workout"],
    time: "5 min",
  },
  {
    name: "Lean Beef Chili (Bean-Heavy)",
    protein: "93/7 ground beef + black beans + kidney beans",
    veg: "Onions, peppers, tomatoes",
    notes: "Big batch cook. Freezes well. Beans add fiber + plant protein.",
    cats: ["high-protein", "lean-bulk", "meal-prep"],
    time: "45 min",
  },
  {
    name: "Cod & Roasted Veg Sheet Pan",
    protein: "Cod fillets",
    veg: "Asparagus, peppers, broccoli",
    notes: "Lean white fish. 400°F for 12–15 min. Lemon + olive oil + garlic.",
    cats: ["high-protein", "cutting", "low-carb"],
    time: "20 min",
  },
  {
    name: "Lentil & Turkey Soup",
    protein: "Ground turkey + green lentils",
    veg: "Carrots, celery, spinach",
    notes: "Slow-cooker friendly. Huge protein + fiber combo. Great cutting meal.",
    cats: ["high-protein", "cutting", "meal-prep"],
    time: "40 min",
  },
  {
    name: "Post-Workout Recovery Plate",
    protein: "Chicken or salmon (6 oz)",
    carbs: "White rice or sweet potato",
    veg: "Greens",
    notes: "Eat within ~60 min of training. Fast carbs + complete protein to refuel.",
    cats: ["post-workout", "high-protein", "macro"],
    time: "20 min",
  },
];

const CATEGORIES: { id: Category; label: string; icon: typeof Dumbbell }[] = [
  { id: "high-protein", label: "High-Protein", icon: Dumbbell },
  { id: "lean-bulk", label: "Lean Bulk", icon: Flame },
  { id: "cutting", label: "Cutting", icon: Zap },
  { id: "low-carb", label: "Low-Carb", icon: Salad },
  { id: "meal-prep", label: "Meal Prep", icon: Clock },
  { id: "post-workout", label: "Post-Workout", icon: Dumbbell },
  { id: "macro", label: "Macro-Friendly", icon: Dumbbell },
];

function BodybuilderPage() {
  const [filter, setFilter] = useState<Category | "all">("all");
  const { prefs, toggle } = useDietaryPrefs();
  const enabled = prefs.includes("bodybuilder");

  const meals = filter === "all" ? MEALS : MEALS.filter((m) => m.cats.includes(filter));

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <header className="mt-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Dumbbell className="h-4 w-4" /> New preference
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Bodybuilder & High-Protein Meals</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Build high-protein meals from what you already have. Lean bulking, cutting, low-carb,
            meal prep, and post-workout ideas — all food-focused, no supplement or medical advice.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant={enabled ? "default" : "outline"}
              size="sm"
              onClick={() => toggle("bodybuilder")}
            >
              {enabled ? "✓ Bodybuilder mode on" : "Turn on Bodybuilder mode"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Adds high-protein picks to your personalized recipes.
            </span>
          </div>
        </header>

        {/* Filter chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All ideas</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>

        {/* Protein pantry */}
        <Card className="mt-6 border-border/60 bg-card p-5">
          <h2 className="font-display text-xl">Your protein pantry</h2>
          <p className="text-sm text-muted-foreground">Pick any of these and Chef Super J will build around it.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PROTEINS.map((p) => (
              <Badge key={p.label} variant="outline" className="border-primary/30 bg-primary/5 text-foreground">
                {p.label}
              </Badge>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Smart carbs</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CARBS.map((c) => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Veg & greens</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {VEG.map((v) => (
                  <Badge key={v} variant="outline">{v}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Meals */}
        <h2 className="mt-8 font-display text-2xl">Meal ideas</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {meals.map((m) => (
            <Card key={m.name} className="border-border/60 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg leading-tight">{m.name}</h3>
                <Badge variant="outline" className="shrink-0 text-xs">
                  <Clock className="mr-1 h-3 w-3" />{m.time}
                </Badge>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <Row label="Protein" value={m.protein} />
                {m.carbs && <Row label="Carbs" value={m.carbs} />}
                {m.veg && <Row label="Veg" value={m.veg} />}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{m.notes}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {m.cats.map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px]">
                    {CATEGORIES.find((x) => x.id === c)?.label ?? c}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Food ideas only. We don't give medical, nutrition, or supplement advice — talk to a qualified
          professional for personal guidance.
        </p>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-background hover:border-primary/50 hover:bg-primary/5",
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
