import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { CalendarDays, ShoppingCart, Sparkles, ArrowRight, Check, Lock } from "lucide-react";

export const Route = createFileRoute("/meal-plan")({
  head: () => ({
    meta: [
      { title: "Weekly Meal Planning Built From Your Fridge | The Fridge and Cupboard" },
      { name: "description", content: "AI-built weekly meal plans using what you already have. Less waste, fewer grocery runs, real dinners." },
      { property: "og:title", content: "Meal Plans That Use What You've Got" },
      { property: "og:description", content: "Plan a whole week of dinners from your fridge in seconds." },
    ],
  }),
  component: MealPlanPage,
});

const SAMPLE_WEEK = [
  { day: "Mon", title: "Sheet-pan chicken & veg", uses: "Leftover roast chicken, half onion, peppers", time: "25 min" },
  { day: "Tue", title: "Quick pasta pomodoro", uses: "Tomatoes, garlic, basil, parmesan", time: "20 min" },
  { day: "Wed", title: "Black bean tacos", uses: "Black beans, leftover rice, lime, avocado", time: "15 min" },
  { day: "Thu", title: "Coconut red curry bowl", uses: "Coconut milk, red curry paste, leftover veg, rice", time: "20 min" },
  { day: "Fri", title: "Build-your-own pizza night", uses: "Tortillas, sauce, cheese, leftover toppings", time: "20 min" },
  { day: "Sat", title: "Chana masala with naan", uses: "Chickpeas, tomato, cumin, ginger, garlic", time: "30 min" },
  { day: "Sun", title: "Slow-cook turn-it-into-soup", uses: "Bones, sad veg, beans, herbs", time: "2 hr (hands-off)" },
];

function MealPlanPage() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <section className="max-w-2xl">
          <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]">
            <CalendarDays className="mr-1 inline h-3 w-3" /> Meal Plan
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            One week. One scan. <span className="italic text-primary">No more "what's for dinner."</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Scan your fridge once. We plan 7 dinners that use what you already have, plus a tight grocery list for what's missing.
          </p>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card className="border-border/60 bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">This week's plan (sample)</h2>
              <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent">Free preview</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Connect a fridge scan to personalize this for you.</p>

            <div className="mt-4 space-y-2">
              {SAMPLE_WEEK.map((d, i) => {
                const locked = i >= 3;
                return (
                  <div
                    key={d.day}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground">
                      {d.day}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-foreground">{d.title}</span>
                        {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{locked ? "Pro · unlock the full 7-day plan" : d.uses}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 border-primary/20 bg-secondary text-secondary-foreground">{d.time}</Badge>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/scan" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
                Scan my fridge <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/pro" className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-transparent px-4 py-2 text-sm font-medium uppercase tracking-widest text-primary hover:bg-primary/5">
                <Sparkles className="h-4 w-4" /> Unlock full week
              </Link>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/60 bg-card p-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg">Smart grocery list</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">We subtract what's already in your fridge.</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {["Tortillas", "Avocado", "Parmesan", "Lime", "Feta"].map((g) => (
                  <li key={g} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" /> {g}</li>
                ))}
              </ul>
            </Card>

            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5">
              <Badge variant="outline" className="border-primary/40 bg-card text-primary uppercase tracking-widest text-[10px]">
                Pro · $5.99/mo
              </Badge>
              <h3 className="mt-3 font-display text-xl">Personal meal planner</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-foreground/90">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Full 7-day plans, every week</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Custom diets &amp; allergies</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Auto grocery list, deduped</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Ask for custom recipes anytime</li>
              </ul>
              <Button asChild className="mt-4 w-full bg-primary uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
                <Link to="/pro">See what Pro unlocks</Link>
              </Button>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
