import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import {
  Sparkles,
  Soup,
  Leaf,
  Fish,
  CalendarDays,
  ShoppingBasket,
  Refrigerator,
  Wand2,
  Flame,
  Check,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/fasting")({
  head: () => ({
    meta: [
      { title: "Lenten & Fasting Recipes — Flavorful, Affordable, Easy | The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "A full Lent and fasting kitchen: meal plans, weekday and holiday recipes, ingredient substitutions, shopping lists, leftover ideas, and cooking lessons for Lenten, Orthodox fasting, vegan, and dairy-free cooks.",
      },
      { property: "og:title", content: "Lenten & Fasting Recipes" },
      {
        property: "og:description",
        content:
          "Delicious, affordable fasting meals — meal plans, substitutions, shopping lists, leftover ideas, and holiday menus.",
      },
    ],
  }),
  component: FastingPage,
});

const MEAL_PLAN = [
  { day: "Mon", meal: "Lemon-garlic lentil soup", note: "Pantry-only, ready in 30 min" },
  { day: "Tue", meal: "Crispy chickpea & roasted veg bowls", note: "Sheet-pan, big batch" },
  { day: "Wed", meal: "Mushroom & spinach pasta (cashew cream)", note: "Dairy-free Alfredo" },
  { day: "Thu", meal: "Greek-style gigantes beans with tomato", note: "Orthodox-fast friendly" },
  { day: "Fri", meal: "Beer-battered cod & garlic potatoes", note: "Lenten classic with fish" },
  { day: "Sat", meal: "Stuffed cabbage rolls (vegan)", note: "Freezer-friendly, doubles easy" },
  { day: "Sun", meal: "Lentil 'shepherd's' pie with herb mash", note: "Use Mon's lentil leftovers" },
];

const SUBS = [
  { from: "Butter", to: "Olive oil, vegan butter, or tahini" },
  { from: "Milk", to: "Oat, almond, or cashew milk (1:1)" },
  { from: "Cream", to: "Soaked cashews blended with water + lemon" },
  { from: "Cheese (Parmesan)", to: "Toasted nutritional yeast + breadcrumbs" },
  { from: "Egg (binder)", to: "1 tbsp flax + 3 tbsp water, rest 5 min" },
  { from: "Egg (whip)", to: "Aquafaba (chickpea liquid), whipped" },
  { from: "Honey", to: "Maple syrup or agave (1:1)" },
  { from: "Meat broth", to: "Mushroom + miso + soy for deep umami" },
  { from: "Bacon", to: "Smoked paprika + crisped chickpeas" },
];

const SHOPPING = [
  "Dried lentils (red, brown, green)",
  "Chickpeas + cannellini beans",
  "Long-grain rice + quinoa",
  "Pasta (regular + gluten-free)",
  "Yellow onions, garlic, carrots, celery",
  "Mushrooms (cremini + dried porcini)",
  "Tomato paste + canned tomatoes",
  "Olive oil + good red wine vinegar",
  "Lemons, parsley, dill",
  "Tahini + raw cashews",
  "Smoked paprika, cumin, oregano, bay leaves",
  "Frozen spinach + frozen mixed veg",
];

const RECIPES = [
  { title: "Greek lemon potatoes", type: "Lenten · Orthodox", time: "55 min", desc: "Crispy edges, lemony center. The side that steals the show." },
  { title: "Spanakorizo (spinach rice)", type: "Orthodox fasting", time: "30 min", desc: "Comfort in a pot. Dill, lemon, olive oil — that's it." },
  { title: "Mushroom bourguignon", type: "Vegan · Lenten", time: "45 min", desc: "Deep red-wine umami, no meat needed." },
  { title: "Chickpea 'tuna' melts (open-face)", type: "Lenten · Dairy-free", time: "15 min", desc: "Smashed chickpeas + lemon + capers on toasted sourdough." },
  { title: "Fasolada (Greek bean soup)", type: "Orthodox · Heart-healthy", time: "1 hr", desc: "Greece's national dish. Beans, carrots, celery, tomato." },
  { title: "Crispy baked falafel bowls", type: "Vegan · Family-friendly", time: "40 min", desc: "Tahini drizzle, pickled onions, herby grains." },
];

const HOLIDAY = [
  { occasion: "Good Friday", idea: "Beer-battered cod, garlic-lemon potatoes, and a bright fennel slaw." },
  { occasion: "Clean Monday (Orthodox)", idea: "Lagana bread, taramasalata-free spreads, marinated octopus or grilled vegetables." },
  { occasion: "Christmas Eve (Vigil)", idea: "Mushroom pierogi, beet borscht, and stuffed cabbage." },
  { occasion: "Annunciation", idea: "Bakaliaros (salt cod) with skordalia and dandelion greens." },
];

const LEFTOVERS = [
  "Lentil soup → lentil tacos with avocado and pickled onion.",
  "Roasted veg → grain bowls or warm pita stuffers with tahini.",
  "Cooked rice → fried rice with mushrooms, peas, soy.",
  "Beans → smashed white bean toasts with rosemary and lemon zest.",
  "Pasta → frittata-style baked pasta (skip egg with chickpea flour batter).",
];

const LESSONS = [
  { icon: Flame, title: "Flavorful fasting cooking", text: "Umami from mushrooms, miso, tomato paste, and roasted garlic." },
  { icon: Wand2, title: "Smart substitutions", text: "Cashew cream, flax eggs, aquafaba — fasting swaps that taste right." },
  { icon: Soup, title: "Beans & grains masterclass", text: "Creamy beans, fluffy rice, perfect quinoa — the fasting foundation." },
  { icon: Leaf, title: "Vegetable prep", text: "Cuts that matter, plus the roast vs. sauté decision for any veg." },
];

function FastingPage() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        {/* Hero */}
        <section className="py-6 md:py-10">
          <Badge variant="outline" className="border-accent/40 bg-transparent text-accent uppercase tracking-widest text-[10px]">
            <Sparkles className="mr-1 inline h-3 w-3" /> Lenten & Fasting Kitchen
          </Badge>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
            Fasting that actually tastes
            <span className="italic text-accent"> like a feast</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            A full kitchen for Lent, Orthodox fasting, vegan, and dairy-free cooks: weekly meal plans, weekday and
            holiday recipes, smart substitutions, a printable shopping list, leftover transformations, and short
            lessons from Chef Super J. Flavorful, affordable, easy to cook tonight.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Lenten", "Orthodox fasting", "Vegan", "Vegetarian", "Dairy-free", "Heart-healthy"].map((t) => (
              <Badge key={t} variant="outline" className="border-border/70 bg-card text-muted-foreground">
                {t}
              </Badge>
            ))}
          </div>
        </section>

        {/* 7-day meal plan */}
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-display text-3xl tracking-tight">Your fasting week</h2>
          </div>
          <p className="mt-1 text-muted-foreground">A balanced 7-day plan that reuses ingredients and minimizes waste.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {MEAL_PLAN.map((m) => (
              <Card key={m.day} className="border-border/60 bg-card p-4">
                <div className="text-[10px] uppercase tracking-widest text-primary">{m.day}</div>
                <div className="mt-1 font-display text-lg leading-tight">{m.meal}</div>
                <div className="mt-1 text-xs text-muted-foreground">{m.note}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* Recipes */}
        <section className="mt-12">
          <h2 className="font-display text-3xl tracking-tight">Recipes that hit</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {RECIPES.map((r) => (
              <Card key={r.title} className="border-border/60 bg-card p-5">
                <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent text-[10px] uppercase tracking-widest">
                  {r.type}
                </Badge>
                <h3 className="mt-2 font-display text-xl">{r.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{r.time}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* Substitutions + Shopping list */}
        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="border-border/60 bg-card p-5">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl tracking-tight">Substitutions cheat sheet</h2>
            </div>
            <ul className="mt-4 divide-y divide-border/60">
              {SUBS.map((s) => (
                <li key={s.from} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                  <span className="font-medium">{s.from}</span>
                  <span className="text-right text-muted-foreground">{s.to}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-border/60 bg-card p-5">
            <div className="flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl tracking-tight">Fasting pantry list</h2>
            </div>
            <ul className="mt-4 grid gap-1.5 text-sm">
              {SHOPPING.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-success" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Holiday section */}
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Fish className="h-5 w-5 text-primary" />
            <h2 className="font-display text-3xl tracking-tight">Holiday fasting menus</h2>
          </div>
          <p className="mt-1 text-muted-foreground">Special-occasion meals that respect the fast and feed a table.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {HOLIDAY.map((h) => (
              <Card key={h.occasion} className="border-border/60 bg-card p-5">
                <div className="text-[10px] uppercase tracking-widest text-accent">{h.occasion}</div>
                <p className="mt-2 text-sm text-foreground/90">{h.idea}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Leftovers */}
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Refrigerator className="h-5 w-5 text-primary" />
            <h2 className="font-display text-3xl tracking-tight">Leftover transformations</h2>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {LEFTOVERS.map((l) => (
              <Card key={l} className="border-border/60 bg-card p-4 text-sm text-foreground/90">
                {l}
              </Card>
            ))}
          </ul>
        </section>

        {/* Lessons */}
        <section className="mt-12">
          <h2 className="font-display text-3xl tracking-tight">Fasting cooking lessons</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {LESSONS.map((l) => {
              const Icon = l.icon;
              return (
                <Card key={l.title} className="border-border/60 bg-card p-5">
                  <Icon className="h-5 w-5 text-accent" />
                  <h3 className="mt-2 font-display text-lg">{l.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{l.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12">
          <Card className="border-border/60 bg-card p-8 text-center">
            <h3 className="font-display text-3xl">Scan your fridge — get a personalized fasting plan.</h3>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Tell us your fasting style and we'll match recipes, lessons, and leftover ideas to what you already have.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-primary uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
                <Link to="/scan">Scan my fridge <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="border-accent/40 bg-transparent text-accent">
                <Link to="/pro">Unlock Cooking School</Link>
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
