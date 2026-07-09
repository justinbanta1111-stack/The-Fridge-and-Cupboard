import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { supabase } from "@/integrations/supabase/client";
import {
  closeInstallModal,
  consumePendingCheckout,
  storePendingCheckout,
  type CheckoutPriceId,
} from "@/lib/checkout-intent";
import {
  Sparkles,
  Check,
  Crown,
  GraduationCap,
  Flame,
  Slice,
  Thermometer,
  Snowflake,
  Soup,
  Wand2,
  ArrowRight,
  Carrot,
  Leaf,
  Fish,
  ShieldCheck,
  Refrigerator,
  Timer,
  ChefHat,
  PlayCircle,
  Lock,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Plans — Free, Standard $3.99, Premium $5.99 | The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Free scans and basic recipes. Standard ($3.99/mo) unlocks unlimited scans, meal planning, all cuisines, and the full guide library. Premium ($5.99/mo) adds custom AI recipes, Chef Super J requests, and Cooking School.",
      },
      { property: "og:title", content: "Free · Standard $3.99 · Premium $5.99" },
      {
        property: "og:description",
        content:
          "Three plans built around the food you already own — from quick scans to personalized menus from Chef Super J.",
      },
    ],
  }),
  component: ProPage,
});

const FREE = [
  "Limited fridge & pantry scans",
  "Basic recipe suggestions",
  "A few cuisine categories",
  "Basic cooking tips",
  "Save a handful of scans",
];

const STANDARD = [
  "Scan My Fridge",
  "Scan My Cupboard",
  "Use My Leftovers",
  "Basic recipe generation",
  "Basic money-saving suggestions",
  "Basic waste reduction",
  "Save favorite meals",
  "Before You Shop feature",
  "Mobile access",
];

const PREMIUM = [
  "Everything in Standard",
  "Chef Super J voice assistant",
  "Personalized meal memory",
  "Ingredient expiration reminders",
  "Savings dashboard",
  "Weekly money saved reports",
  "Surprise Me meals",
  "Make It Easy For Mom",
  "Kid-friendly meals",
  "Lent / Vegan / Healthy modes",
  "Food pH & Body Balance",
  "Acid reflux / low inflammation meal filters",
  "Priority premium updates",
];

const SCHOOL = [
  { icon: Slice, title: "Knife skills 101", text: "Grip, rocking cut, claw guard. The 10 minutes that make every recipe easier for the rest of your life.", duration: "6 min" },
  { icon: Slice, title: "Onion cutting (no tears)", text: "Root-on technique, dice vs. mince, julienne, and the chill-the-onion trick chefs actually use.", duration: "4 min" },
  { icon: Carrot, title: "Vegetable prep", text: "Julienne, brunoise, chiffonade, roll-cut. Knowing the shape changes the dish.", duration: "7 min" },
  { icon: Leaf, title: "Herb & spice pairings", text: "Why basil loves tomato, why cumin needs lime, and how to bloom dry spices for double the flavor.", duration: "5 min" },
  { icon: Flame, title: "Core cooking techniques", text: "Sauté, sear, braise, deglaze, wok-spin. One lesson per technique, all under 5 minutes.", duration: "8 min" },
  { icon: Thermometer, title: "Steak & meat temps", text: "Rare to well-done by feel and by thermometer, plus the rest times that actually matter.", duration: "5 min" },
  { icon: Fish, title: "Seafood cooking", text: "Pan-sear salmon with crispy skin, perfect shrimp, scallop crust, and how to never overcook fish again.", duration: "6 min" },
  { icon: ShieldCheck, title: "Food safety", text: "Safe temps, the 2-hour rule, cross-contamination, marinades, thawing without playing roulette.", duration: "4 min" },
  { icon: Refrigerator, title: "Leftover management", text: "What lasts how long, how to revive day-3 rice, and 5 leftover transformations that don't taste like leftovers.", duration: "5 min" },
  { icon: Timer, title: "Kitchen shortcuts", text: "Mise en place in 90 seconds, sheet-pan trick, the right pot for the job, cleanup-as-you-go.", duration: "4 min" },
  { icon: Soup, title: "Roasting like a pro", text: "Vegetables that caramelize instead of steam, chicken that stays juicy, sheet-pan timing.", duration: "6 min" },
  { icon: Wand2, title: "Building flavor", text: "Layering aromatics, salt timing, acid & fat balance — the stuff cookbooks skip.", duration: "5 min" },
  { icon: Snowflake, title: "Storage that saves money", text: "Where things actually belong in your fridge, freezer wins, herbs that last 2× longer.", duration: "4 min" },
  { icon: ChefHat, title: "Chef Super J's secrets", text: "Finishing butter, pan sauces, the 5-second plate-up, and the little moves that separate home cooks from chefs.", duration: "7 min" },
];

const FEATURED_VIDEOS = [
  { title: "Onion cut, no tears", chef: "Chef Super J", length: "4:12", tag: "Knife skills" },
  { title: "Perfect medium-rare steak", chef: "Chef Super J", length: "5:48", tag: "Meat temps" },
  { title: "Crispy-skin salmon", chef: "Chef Super J", length: "6:20", tag: "Seafood" },
];

function ProPage() {
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email ?? undefined });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const stripeReady = Boolean(import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN);

  const startCheckout = (priceId: CheckoutPriceId) => {
    closeInstallModal();
    if (!stripeReady) {
      toast.message("Checkout isn't live yet — sign up to join the waitlist.");
      return;
    }
    if (!user) {
      storePendingCheckout(priceId);
      window.location.href = `/auth?redirect=${encodeURIComponent("/pro")}`;
      return;
    }
    openCheckout({
      priceId,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  useEffect(() => {
    if (!user) return;
    const stored = consumePendingCheckout();
    if (stored) startCheckout(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="min-h-screen bg-background bg-grain">
      <PaymentTestModeBanner />
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        {/* Hero */}
        <section className="py-6 text-center md:py-10">
          <Badge
            variant="outline"
            className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]"
          >
            <Sparkles className="mr-1 inline h-3 w-3" /> Choose Your Plan
          </Badge>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
            Choose <span className="italic text-primary">Your Plan</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Save money, waste less food, and cook smarter.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Cancel anytime. Works on Android and iPhone.
          </p>

          {/* Free trial CTA — credit card required, charges on day 4 unless cancelled */}
          <div className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-widest text-primary">
              3-day free trial · Credit card required
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Full access to every feature for 3 days. Cancel anytime before day 4 and you won't be charged.
            </p>
            <Button
              size="lg"
              className="mt-1"
              onClick={() => {
                if (!import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN) {
                  toast.message("Checkout isn't live yet — join the waitlist and we'll email you.");
                  return;
                }
                startCheckout(billing === "monthly" ? "standard_monthly" : "standard_annual");
              }}
            >
              Start Your Free 3-Day Trial
            </Button>
            {!import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN && (
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">Join the waitlist</Link>
              </Button>
            )}
          </div>

          {/* Billing toggle */}
          <div className="mx-auto mt-6 inline-flex items-center rounded-full border border-border/60 bg-card p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-widest transition ${
                billing === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`relative rounded-full px-4 py-1.5 text-xs uppercase tracking-widest transition ${
                billing === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Annual
              <span className="ml-2 rounded-full bg-success/20 px-1.5 py-0.5 text-[9px] font-bold text-success">
                Save ~20%
              </span>
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Switch to <button type="button" onClick={() => setBilling("annual")} className="font-semibold text-success underline underline-offset-2">Annual</button> and save about $10/year on every plan.
          </p>
        </section>

        {/* Pricing grid */}
        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {/* FREE */}
          <Card className="flex flex-col border-border/60 bg-card p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Free</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-4xl">$0</span>
              <span className="text-sm text-muted-foreground">/ forever</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Get a taste of what your fridge can do.</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {FREE.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" asChild className="mt-6 border-foreground/20 bg-transparent">
              <Link to="/scan">Start free</Link>
            </Button>
          </Card>

          {/* STANDARD — the main, recommended plan */}
          <Card className="ring-paper relative flex flex-col border-primary/50 bg-gradient-to-br from-primary/15 via-card to-accent/5 p-6 shadow-xl md:-translate-y-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary uppercase tracking-widest text-primary-foreground">
                Recommended
              </Badge>
            </div>
            <div className="text-xs uppercase tracking-widest text-primary">Standard</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-5xl text-primary">
                {billing === "monthly" ? "$3.99" : "$37.99"}
              </span>
              <span className="text-sm text-muted-foreground">
                / {billing === "monthly" ? "month" : "year"}
              </span>
            </div>
            {billing === "annual" && (
              <p className="mt-1 text-xs font-medium text-success">Save $10 vs monthly</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">Everything you need to cook with what you already have.</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {STANDARD.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => startCheckout(billing === "monthly" ? "standard_monthly" : "standard_annual")}
              className="mt-6 bg-primary uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
            >
              {billing === "monthly"
                ? "Start Standard — $3.99/month"
                : "Start Standard — $37.99/year"}{" "}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Cancel anytime · works on Android & iPhone</p>
            <Link to="/food-preferences" className="mt-2 block text-center text-[11px] font-semibold text-accent hover:underline">
              ✨ Customize your food preferences →
            </Link>
          </Card>

          {/* PREMIUM — optional upgrade, gentle framing */}
          <Card className="relative flex flex-col border-accent/40 bg-gradient-to-br from-accent/10 via-card to-primary/5 p-6">
            <div className="text-xs uppercase tracking-widest text-accent">Premium · Optional upgrade</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-4xl text-accent">
                {billing === "monthly" ? "$5.99" : "$61.99"}
              </span>
              <span className="text-sm text-muted-foreground">
                / {billing === "monthly" ? "month" : "year"}
              </span>
            </div>
            {billing === "annual" && (
              <p className="mt-1 text-xs font-medium text-success">Save $10 vs monthly</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Want even more? Premium unlocks advanced AI chef features whenever you're ready.
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              <li className="flex gap-2"><Crown className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>Advanced AI Chef</span></li>
              <li className="flex gap-2"><Crown className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>Voice Assistant (hands-free chef)</span></li>
              <li className="flex gap-2"><Crown className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>Unlimited saved recipes</span></li>
              <li className="flex gap-2"><Crown className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>Meal planning</span></li>
              <li className="flex gap-2"><Crown className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>Shopping tools</span></li>
              <li className="flex gap-2"><Crown className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>Everything in Standard, plus future premium features</span></li>
            </ul>
            <Button
              onClick={() => startCheckout(billing === "monthly" ? "premium_monthly" : "premium_annual")}
              variant="outline"
              className="mt-6 border-accent/50 bg-transparent uppercase tracking-widest text-accent hover:bg-accent/10"
            >
              {billing === "monthly"
                ? "Try Premium — $5.99/month"
                : "Try Premium — $61.99/year"}{" "}
              <Crown className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Cancel anytime · no pressure, upgrade later if you love it</p>
          </Card>
        </section>

        {/* Cooking School */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-accent" />
            <Badge variant="outline" className="border-accent/40 bg-transparent text-accent uppercase tracking-widest text-[10px]">
              Premium · Cooking School
            </Badge>
          </div>
          <h2 className="mt-3 font-display text-4xl tracking-tight">The lessons that change how you cook.</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Short, no-fluff lessons from Chef Super J. Watch one before dinner and you'll feel the difference tonight.
          </p>
          {/* Featured videos */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FEATURED_VIDEOS.map((v) => (
              <Card
                key={v.title}
                className="group relative flex aspect-video flex-col justify-between overflow-hidden border-accent/30 bg-gradient-to-br from-accent/15 via-card to-primary/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-accent/40 bg-background/60 text-[10px] uppercase tracking-widest text-accent">
                    {v.tag}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{v.length}</span>
                </div>
                <div className="absolute inset-0 grid place-items-center">
                  <PlayCircle className="h-14 w-14 text-accent/90 transition-transform group-hover:scale-110" />
                </div>
                <div className="relative">
                  <h4 className="font-display text-lg leading-tight">{v.title}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">{v.chef}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Lesson grid */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SCHOOL.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.title} className="group relative border-border/60 bg-card p-5">
                  <div className="flex items-start justify-between">
                    <Icon className="h-5 w-5 text-accent" />
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                      <Lock className="h-3 w-3" /> {s.duration}
                    </div>
                  </div>
                  <h3 className="mt-3 font-display text-lg">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                    <PlayCircle className="h-3.5 w-3.5" /> Watch lesson
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Cooking School unlocks with <span className="text-accent">Premium · $5.99/mo</span>. New lessons from Chef Super J every month.
          </p>
        </section>

        {/* Always improving */}
        <section className="mt-16">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-8">
            <Badge variant="outline" className="border-primary/40 bg-transparent text-primary uppercase tracking-widest text-[10px]">
              <Sparkles className="mr-1 inline h-3 w-3" /> Always improving
            </Badge>
            <h3 className="mt-3 font-display text-3xl tracking-tight">This app grows with you.</h3>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Every week we listen to real cooks — what they're scanning, what they're making, what they wish the app could do — and we ship improvements based on it.
              Expect new cuisines, new Cooking School lessons from Chef Super J, smarter meal plans, deeper holiday menus, and brand-new higher-tier features as the community grows.
              Your feedback directly shapes what we build next.
            </p>
            <p className="mt-3 text-sm text-primary">Have an idea? Tell us — we read every suggestion.</p>
          </Card>
        </section>


        {/* Closing CTA */}
        <section className="mt-16">
          <Card className="border-border/60 bg-card p-8 text-center">
            <h3 className="font-display text-3xl">"I wish I'd had this years ago."</h3>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Start free. Upgrade when you're hooked. Go Premium when you want Chef Super J cooking with you.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" className="border-foreground/20 bg-transparent">
                <Link to="/scan">Try a free scan</Link>
              </Button>
              <Button
                onClick={() => startCheckout("standard_monthly")}
                className="bg-primary uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                Subscribe — $3.99/mo
              </Button>
            </div>
          </Card>
        </section>
      </main>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-lg border border-border/60 bg-card p-4 shadow-2xl">
            <button
              onClick={closeCheckout}
              aria-label="Close checkout"
              className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {checkoutElement}
          </div>
        </div>
      )}
    </div>
  );
}
