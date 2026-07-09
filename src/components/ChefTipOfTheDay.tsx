import { useMemo, useState } from "react";
import { Lightbulb, RefreshCcw } from "lucide-react";
import { CHEF_TIPS, getTipOfTheDay } from "@/lib/chef-tips";
import { ChefAvatar } from "@/components/ChefAvatar";

export function ChefTipOfTheDay() {
  const todays = useMemo(() => getTipOfTheDay(), []);
  const [tip, setTip] = useState(todays);

  function shuffle() {
    let next = tip;
    let guard = 0;
    while (next === tip && guard++ < 5) {
      next = CHEF_TIPS[Math.floor(Math.random() * CHEF_TIPS.length)];
    }
    setTip(next);
  }

  return (
    <section
      aria-label="Chef Super J tip of the day"
      className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <ChefAvatar className="h-10 w-10 shrink-0 ring-2 ring-primary/30" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <Lightbulb className="h-3.5 w-3.5" />
            Chef Tip of the Day
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90 sm:text-base">
            "{tip}"
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">— Chef Super J</span>
            <button
              type="button"
              onClick={shuffle}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:bg-background"
            >
              <RefreshCcw className="h-3 w-3" /> New tip
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
