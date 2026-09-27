import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, RotateCcw, Smartphone, Type, LayoutGrid, Palette, Hand, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mobile-qa")({
  head: () => ({
    meta: [
      { title: "Mobile Visual QA Checklist — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Phone-by-phone visual QA checklist for the home screen: spacing, readability, premium styling, tap targets and motion across common iPhone and Android sizes.",
      },
      { property: "og:title", content: "Mobile Visual QA Checklist" },
      {
        property: "og:description",
        content:
          "Check home-screen spacing, readability and premium styling across common phone sizes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MobileQaPage,
});

type Item = { id: string; label: string; hint?: string };
type Section = { id: string; title: string; icon: typeof Type; intro: string; items: Item[] };

const DEVICES = [
  { name: "iPhone SE", size: "375 × 667" },
  { name: "iPhone 14 / 15", size: "390 × 844" },
  { name: "iPhone Pro Max", size: "430 × 932" },
  { name: "Pixel 7", size: "412 × 915" },
];

const SECTIONS: Section[] = [
  {
    id: "layout",
    title: "1. Spacing & layout",
    icon: LayoutGrid,
    intro: "Repeat on every device size listed above.",
    items: [
      { id: "no-h-scroll", label: "No horizontal scrolling anywhere on the home screen." },
      { id: "header-safe", label: "Header logo and title sit fully below the status bar / notch." },
      { id: "card-gaps", label: "Gaps between option cards look even — no card pair tighter than the rest." },
      { id: "cards-visible", label: "3–4 option cards fit on one screen without heavy scrolling." },
      { id: "bottom-clear", label: "The last section clears the bottom tab bar and home indicator." },
      { id: "music-toggle", label: "Music toggle in the bottom corner doesn't cover any text or button." },
      { id: "voice-toggle", label: "Floating speaker button doesn't sit on top of card titles while scrolling." },
    ],
  },
  {
    id: "readability",
    title: "2. Readability",
    icon: Type,
    intro: "Hold the phone at normal arm's length.",
    items: [
      { id: "titles", label: "Every card title reads clearly in one glance (no squinting)." },
      { id: "subtitles", label: "Card subtitles are legible against the dark background." },
      { id: "no-clip", label: "No heading, badge or button label is cut off or wrapped mid-word." },
      { id: "contrast", label: "Gold, jade and teal text all pass an easy readability check on dark cards." },
      { id: "black-buttons", label: "Secondary buttons (Grocery list, My recipes) read clearly against the page." },
      { id: "line-length", label: "Body paragraphs wrap to comfortable lines — never 1–2 words on the last line." },
    ],
  },
  {
    id: "premium",
    title: "3. Premium styling consistency",
    icon: Palette,
    intro: "Look for a single, coherent visual language.",
    items: [
      { id: "radius", label: "Corner rounding is consistent across all cards and buttons." },
      { id: "accents", label: "Accent colours stay within teal / jade / gold — no stray colours." },
      { id: "glow", label: "Card glows and borders look even, not blotchy on OLED black." },
      { id: "primary-stars", label: "Scan My Fridge and Use A Photo clearly read as the two primary actions." },
      { id: "icons", label: "Icon tiles are the same size and alignment on every card." },
      { id: "hero", label: "Hero panel shows enough of the food image and doesn't crowd the headline." },
    ],
  },
  {
    id: "motion",
    title: "4. Motion & intro",
    icon: Gauge,
    intro: "Reload the app for a clean run.",
    items: [
      { id: "door", label: "Fridge door opens smoothly (~3s) with no stutter." },
      { id: "voice-start", label: "Welcome voice begins about 1s in, while the door is still opening." },
      { id: "reveal", label: "Scroll-reveal sections fade in as you scroll — none stay invisible." },
      { id: "reveal-back", label: "Scrolling back up doesn't leave any section blank." },
      { id: "no-jank", label: "Scrolling stays smooth from top to bottom of the page." },
    ],
  },
  {
    id: "touch",
    title: "5. Tap targets",
    icon: Hand,
    intro: "Use a thumb, not a fingertip.",
    items: [
      { id: "size", label: "Every primary button is at least a comfortable thumb-height (~44px)." },
      { id: "chips", label: "Small chips and pills are still tappable without hitting a neighbour." },
      { id: "tabbar", label: "All six bottom tabs are reachable and don't feel cramped." },
      { id: "double", label: "No tap accidentally triggers two controls at once." },
    ],
  },
  {
    id: "sweep",
    title: "6. Device sweep sign-off",
    icon: Smartphone,
    intro: "Mark once the five sections above pass on that device.",
    items: DEVICES.map((d) => ({
      id: `sweep-${d.name}`,
      label: `${d.name} (${d.size}) — full pass`,
    })),
  },
];

const STORAGE_KEY = "tfc.mobile-qa.v1";

function loadState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") ?? {};
  } catch {
    return {};
  }
}

function MobileQaPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setChecked(loadState());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {}
  }, [checked, mounted]);

  const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6 sm:pt-10">
        <header className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">QA</div>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            Mobile visual QA checklist
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Walk the home screen on each phone size below. Tap items to mark them done — progress
            saves on this device.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {DEVICES.map((d) => (
              <span
                key={d.name}
                className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {d.name} · {d.size}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-foreground">
                {done} / {total} checks complete
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/">Open home screen</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/test-checklist">Scan test checklist</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (typeof window !== "undefined" && !window.confirm("Reset all checkmarks?")) return;
                  setChecked({});
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const sectionDone = section.items.filter((i) => checked[i.id]).length;
            return (
              <Card key={section.id} className="ring-paper border-border/60 bg-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg leading-tight tracking-tight sm:text-xl">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">{section.intro}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {sectionDone}/{section.items.length}
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  {section.items.map((item) => {
                    const isChecked = !!checked[item.id];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setChecked((p) => ({ ...p, [item.id]: !p[item.id] }))}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                            isChecked
                              ? "border-success/40 bg-success/[0.06]"
                              : "border-border/60 bg-secondary/30 hover:bg-secondary/60",
                          )}
                          aria-pressed={isChecked}
                        >
                          <span
                            className={cn(
                              "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                              isChecked
                                ? "border-success bg-success text-success-foreground"
                                : "border-border bg-card",
                            )}
                            aria-hidden
                          >
                            {isChecked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 flex-1 text-sm leading-snug",
                              isChecked ? "text-muted-foreground line-through" : "text-foreground",
                            )}
                          >
                            {item.label}
                            {item.hint && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {item.hint}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Note the section + item and attach a screenshot for anything that fails.
        </p>
      </div>
    </div>
  );
}
