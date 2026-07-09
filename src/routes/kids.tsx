import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { Baby, Smile, Apple, Cookie, ArrowRight, Heart } from "lucide-react";

export const Route = createFileRoute("/kids")({
  head: () => ({
    meta: [
      { title: "Kid-Friendly Recipes & Picky-Eater Tips | The Fridge and Cupboard" },
      { name: "description", content: "Sneaky-healthy meals, picky-eater hacks, and fun recipes kids actually finish. Built from what's already in your fridge." },
      { property: "og:title", content: "Kid-Friendly Cooking — The Fridge and Cupboard" },
      { property: "og:description", content: "Real meals for real kids. Less waste, more clean plates." },
    ],
  }),
  component: KidsPage,
});

const RECIPES = [
  {
    name: "Hidden-Veggie Mac & Cheese",
    why: "Blended cauliflower disappears into the cheese sauce — they won't know.",
    needs: ["Pasta", "Cheddar", "Milk", "Cauliflower (or carrots)", "Butter"],
    time: "20 min",
    age: "2+",
  },
  {
    name: "Build-Your-Own Mini Pizzas",
    why: "Kids decorate their own — way more likely to eat what they made.",
    needs: ["Tortillas or English muffins", "Tomato sauce", "Cheese", "Any leftover veg"],
    time: "15 min",
    age: "3+",
  },
  {
    name: "Banana Oat Pancakes",
    why: "Three ingredients, no added sugar, freezer-friendly for busy mornings.",
    needs: ["Banana", "Oats", "Egg"],
    time: "10 min",
    age: "1+",
  },
  {
    name: "Chicken Nugget Bowls",
    why: "Familiar nuggets + rice + a 'dipping cup' of veggies they choose.",
    needs: ["Chicken (or store nuggets)", "Rice", "Cucumber/carrot sticks", "Ketchup or ranch"],
    time: "25 min",
    age: "2+",
  },
  {
    name: "Smoothie Popsicles",
    why: "Yesterday's smoothie → frozen treat. Sneaks in spinach without protest.",
    needs: ["Banana", "Berries", "Yogurt", "Spinach (optional)", "Honey"],
    time: "5 min + freeze",
    age: "1+",
  },
  {
    name: "Cheesy Quesadilla Triangles",
    why: "Crispy, dippable, hides leftover beans or shredded chicken.",
    needs: ["Tortillas", "Cheese", "Leftover protein", "Salsa for dipping"],
    time: "10 min",
    age: "2+",
  },
  {
    name: "Mild Thai Peanut Noodles",
    why: "Creamy, nutty noodles with hidden veg — kids love the peanut flavor.",
    needs: ["Noodles", "Peanut butter", "Soy sauce", "Carrot", "Cucumber"],
    time: "15 min",
    age: "2+",
  },
  {
    name: "Butter Chicken Bowls (mild)",
    why: "Tomato-cream sauce with tender chicken — mild spices, big flavor.",
    needs: ["Chicken", "Tomato sauce", "Cream or yogurt", "Rice", "Butter"],
    time: "25 min",
    age: "3+",
  },
  {
    name: "Coconut Rice Balls",
    why: "Sticky, lightly sweet rice balls — a fun hands-on snack or dessert.",
    needs: ["Rice", "Coconut milk", "Mango or banana", "A pinch of sugar"],
    time: "20 min",
    age: "1+",
  },
];

const TIPS = [
  { icon: Smile, title: "Serve it on the side", text: "Sauces, dressings, and toppings on the side. Kids hate surprises." },
  { icon: Apple, title: "Two bites, no pressure", text: "Ask for two polite bites of something new. No bribes, no battles." },
  { icon: Cookie, title: "Let them cook", text: "Tearing lettuce, stirring, sprinkling cheese — involvement = appetite." },
  { icon: Heart, title: "Veggies first, hungry kid", text: "Put veggies on the plate when they're hungriest — before the main." },
];

function KidsPage() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <section className="max-w-2xl">
          <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]">
            <Baby className="mr-1 inline h-3 w-3" /> Kids · picky-eater approved
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            Meals kids <span className="italic text-primary">actually finish</span>.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Real-life recipes for real-life dinners. Sneaky-healthy, freezer-friendly, and made from what's already in your kitchen.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Picky-eater playbook</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TIPS.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.title} className="border-border/60 bg-card p-5">
                  <Icon className="h-5 w-5 text-accent" />
                  <h3 className="mt-3 font-display text-lg">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Recipes that win the dinner table</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {RECIPES.map((r) => (
              <Card key={r.name} className="border-border/60 bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl">{r.name}</h3>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge variant="outline" className="border-primary/20 bg-secondary text-secondary-foreground">{r.time}</Badge>
                    <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent">Age {r.age}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.why}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.needs.map((n) => (
                    <Badge key={n} variant="outline" className="border-success/20 bg-success/5 text-success">{n}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <Card className="border-primary/20 bg-primary/5 p-6 text-center">
            <h3 className="font-display text-2xl">Got picky eaters tonight?</h3>
            <p className="mt-2 text-muted-foreground">Scan your fridge and we'll suggest kid-tested meals using what you already have.</p>
            <Link to="/scan" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
              Scan my fridge <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </section>
      </main>
    </div>
  );
}
