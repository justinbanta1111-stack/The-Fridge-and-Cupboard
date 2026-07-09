import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { Sparkles, Leaf, Heart, Flame, Lightbulb, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — Herb & Spice Pairings, Health Benefits | The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Master flavor: herb and spice pairings, health benefits, and tips that make every meal better. Free guide from The Fridge and Cupboard.",
      },
      { property: "og:title", content: "Learn — Herbs, Spices & Smarter Cooking" },
      {
        property: "og:description",
        content: "Pairings, health benefits, and pro tips for everyday cooks.",
      },
    ],
  }),
  component: LearnPage,
});

const PAIRINGS = [
  { hero: "Basil", with: ["Tomato", "Garlic", "Mozzarella", "Lemon"], use: "Pasta, caprese, pesto, summer salads", benefit: "Anti-inflammatory · rich in vitamin K" },
  { hero: "Rosemary", with: ["Lamb", "Potato", "Olive oil", "Garlic"], use: "Roasts, focaccia, sheet-pan dinners", benefit: "May boost memory & circulation" },
  { hero: "Cumin", with: ["Black beans", "Chicken", "Lime", "Coriander"], use: "Tacos, curries, chili, rice bowls", benefit: "Aids digestion · iron-rich" },
  { hero: "Cinnamon", with: ["Apple", "Oats", "Coffee", "Sweet potato"], use: "Oatmeal, baked goods, Moroccan stews", benefit: "Helps regulate blood sugar" },
  { hero: "Turmeric", with: ["Ginger", "Black pepper", "Coconut milk", "Lentils"], use: "Curry, golden milk, roasted veg", benefit: "Powerful anti-inflammatory (with pepper)" },
  { hero: "Oregano", with: ["Tomato", "Feta", "Olive", "Lemon"], use: "Greek salad, pizza, marinades", benefit: "Antioxidant-rich · supports immunity" },
  { hero: "Ginger", with: ["Soy", "Garlic", "Honey", "Carrot"], use: "Stir-fry, dressings, tea, broths", benefit: "Calms nausea · anti-inflammatory" },
  { hero: "Smoked paprika", with: ["Chickpea", "Chorizo", "Egg", "Potato"], use: "Spanish stews, deviled eggs, roasted veg", benefit: "Vitamin A & antioxidants" },
  { hero: "Thyme", with: ["Chicken", "Mushroom", "Butter", "Lemon"], use: "Roasts, soups, stuffing", benefit: "Antimicrobial · vitamin C" },
  { hero: "Lemongrass", with: ["Coconut milk", "Chili", "Lime", "Chicken"], use: "Thai curries, soups, marinades, tea", benefit: "Calms digestion · rich in antioxidants" },
  { hero: "Fish sauce", with: ["Lime", "Chili", "Garlic", "Palm sugar"], use: "Pad Thai, som tam, dipping sauces", benefit: "Deep umami · reduces need for extra salt" },
  { hero: "Garam masala", with: ["Tomato", "Yogurt", "Lamb", "Cauliflower"], use: "Indian curries, dals, roasted meats", benefit: "Warming spices aid digestion" },
  { hero: "Curry leaves", with: ["Mustard seeds", "Coconut", "Lentils", "Potato"], use: "South Indian tadka, sambar, chutneys", benefit: "Rich in iron & folate · aids digestion" },
  { hero: "Star anise", with: ["Cinnamon", "Soy sauce", "Beef", "Orange"], use: "Pho, braised meats, mulled wine", benefit: "Antiviral properties · aids respiratory health" },
];

const TIPS = [
  { icon: Flame, title: "Bloom your spices", text: "Toast dry spices in oil for 30 seconds before adding liquids — flavor doubles." },
  { icon: Leaf, title: "Fresh herbs go in last", text: "Stir basil, parsley, cilantro in off the heat to keep them vibrant." },
  { icon: Heart, title: "Pepper unlocks turmeric", text: "Add black pepper with turmeric — it boosts absorption by up to 2000%." },
  { icon: Lightbulb, title: "Salt early, taste late", text: "Salt at every layer; taste at the end. Acid (lemon, vinegar) wakes flat dishes up." },
  { icon: Flame, title: "Fire-roasted pico de gallo", text: "Char tomatoes on a dry skillet, then chop with onion, cilantro, lime, and salt. Smoky depth, zero extra tools." },
];

function LearnPage() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <section className="max-w-2xl">
          <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]">
            Learn · free guide
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            Cook with <span className="italic text-primary">confidence</span>.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            The little things home cooks rarely get told — pairings that always work, spices that double as medicine, and habits that quietly upgrade every meal.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Pro tips that change everything</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {TIPS.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.title} className="border-border/60 bg-card p-5">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-display text-lg">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Herb &amp; spice pairing library</h2>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{PAIRINGS.length} ingredients</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PAIRINGS.map((p) => (
              <Card key={p.hero} className="border-border/60 bg-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl">{p.hero}</h3>
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Pairs with</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.with.map((w) => (
                    <Badge key={w} variant="outline" className="border-primary/20 bg-secondary text-secondary-foreground">{w}</Badge>
                  ))}
                </div>
                <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Use it in</div>
                <p className="mt-1 text-sm text-foreground/90">{p.use}</p>
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 p-2.5 text-xs text-success">
                  <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{p.benefit}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <Card className="border-primary/20 bg-primary/5 p-6 text-center">
            <h3 className="font-display text-2xl">Want recipes built around these pairings?</h3>
            <p className="mt-2 text-muted-foreground">Snap your fridge. We'll match your ingredients to flavors that actually work together.</p>
            <Link to="/scan" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium uppercase tracking-widest text-primary-foreground hover:bg-primary/90">
              Start a scan <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </section>
      </main>
    </div>
  );
}
