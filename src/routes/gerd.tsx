import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { HeartPulse } from "lucide-react";
import {
  GERD_BETTER_TOLERATED,
  GERD_DISCLAIMER,
  GERD_INTRO,
  GERD_LIFESTYLE_TIPS,
  GERD_MEAL_TIPS,
  GERD_TRIGGERS,
} from "@/lib/gerd";

export const Route = createFileRoute("/gerd")({
  head: () => ({
    meta: [
      { title: "Understanding GERD — Reflux-Friendly Eating | Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Learn what GERD is, which foods commonly trigger acid reflux, which foods are usually better tolerated, plus practical meal and lifestyle tips.",
      },
      { property: "og:title", content: "Understanding GERD — Reflux-Friendly Eating" },
      {
        property: "og:description",
        content:
          "GERD trigger foods, better-tolerated foods, meal preparation tips, and lifestyle suggestions for reducing acid reflux symptoms.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GerdPage,
});

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="ring-paper border-border/60 bg-card p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </Card>
  );
}

function GerdPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/30 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← Back home
        </Link>

        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent">
            <HeartPulse className="h-4 w-4" /> GERD-Friendly eating
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Understanding GERD</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{GERD_INTRO}</p>
        </div>

        <List title="Common trigger foods and drinks" items={GERD_TRIGGERS} />
        <List title="Foods that are often better tolerated" items={GERD_BETTER_TOLERATED} />
        <List title="Practical meal tips" items={GERD_MEAL_TIPS} />
        <List title="Lifestyle suggestions" items={GERD_LIFESTYLE_TIPS} />

        <p className="border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
          {GERD_DISCLAIMER}
        </p>
      </div>
    </main>
  );
}
