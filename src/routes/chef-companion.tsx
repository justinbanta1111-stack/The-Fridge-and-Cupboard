import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic,
  ChefHat,
  Sparkles,
  Soup,
  Clock,
  HeartPulse,
  AlertTriangle,
  Salad,
  ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/chef-companion")({
  head: () => ({
    meta: [
      { title: "Talk to Chef Super J — Voice Companion | The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Speak instead of typing. Chef Super J helps you cook with what you have, suggest substitutes, and read recipes hands-free.",
      },
    ],
  }),
  component: ChefCompanionPage,
});

type QuickAction = {
  label: string;
  icon: typeof Mic;
  prefill: string;
  hint: string;
};

const ACTIONS: QuickAction[] = [
  {
    label: "What can I make?",
    icon: Soup,
    prefill: "What can I make right now with what I already have?",
    hint: "Use your scanned fridge & cupboard",
  },
  {
    label: "Use my leftovers",
    icon: Sparkles,
    prefill: "Help me turn my leftovers into a new meal.",
    hint: "Turn one meal into two or three",
  },
  {
    label: "Help me make dinner",
    icon: ChefHat,
    prefill: "Help me figure out dinner tonight. Walk me through it.",
    hint: "Walk you through, step by step",
  },
  {
    label: "I need food fast",
    icon: Clock,
    prefill: "I need food in 5 minutes. What can I make right now?",
    hint: "Ultra-fast meals from what's on hand",
  },
  {
    label: "Help someone who feels sick",
    icon: HeartPulse,
    prefill:
      "Someone here isn't feeling well. Help me pick a gentle, easy-to-eat meal that's soothing.",
    hint: "Gentle, soothing, easy to eat",
  },
  {
    label: "What should I use before it goes bad?",
    icon: AlertTriangle,
    prefill: "What in my kitchen should I use before it goes bad?",
    hint: "Rescue what's about to spoil",
  },
];

const PHRASES = [
  "Let's make this easy.",
  "We can work with that.",
  "You've got enough to make something good.",
  "Let's use what we have.",
  "Small steps. Good food.",
  "Don't worry — we'll figure it out.",
];

function openChef(prefill?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("tfc:open-chef-voice", {
      detail: prefill ? { prefill } : { autoListen: true },
    }),
  );
}

function ChefCompanionPage() {
  return (
    <div className="min-h-dvh bg-background pb-24">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-4 sm:pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        {/* Hero */}
        <Card className="mt-3 overflow-hidden border-0 bg-gradient-to-br from-primary/15 via-accent/10 to-background p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/40 shadow-md">
              <img
                src="/__l5e/assets-v1/6777100d-858a-4317-9496-734f32083459/chef-super-j.jpeg"
                alt="Chef Super J"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                Companion Mode
              </div>
              <h1 className="mt-0.5 text-2xl font-bold leading-tight sm:text-3xl">
                Talk to Chef Super J
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Speak instead of typing. Chef listens, suggests, and can read recipes out loud so
                your hands stay free.
              </p>
            </div>
          </div>

          <Button
            onClick={() => openChef()}
            className="mt-5 h-14 w-full gap-2 rounded-full bg-gradient-to-r from-[oklch(0.6_0.2_30)] to-[oklch(0.5_0.2_290)] text-base font-semibold text-white shadow-lg hover:opacity-95"
          >
            <Mic className="h-5 w-5" /> Tap to talk
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Optional. Voice can be turned off anytime in Settings.
          </p>
        </Card>

        {/* Quick voice buttons */}
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Quick voice buttons
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => openChef(a.prefill)}
                  className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{a.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{a.hint}</div>
                  </div>
                  <Mic className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </button>
              );
            })}
          </div>
        </section>

        {/* What Chef can do */}
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Salad className="h-4 w-4 text-primary" /> What Chef can do
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>• Guide cooking step-by-step</li>
              <li>• Suggest substitutes instantly</li>
              <li>• Explain why a meal fits your ingredients, time, or budget</li>
              <li>• Help caregivers decide what to cook</li>
              <li>• Read recipes out loud while you cook</li>
            </ul>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ChefHat className="h-4 w-4 text-primary" /> Chef's voice
            </div>
            <ul className="mt-2 space-y-1.5 text-sm italic text-muted-foreground">
              {PHRASES.map((p) => (
                <li key={p}>“{p}”</li>
              ))}
            </ul>
          </Card>
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Companion Mode is optional and never replaces the scan flow. Existing buttons stay right
          where they are.
        </p>
      </main>
    </div>
  );
}
