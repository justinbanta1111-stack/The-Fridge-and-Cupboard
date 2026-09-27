import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, X, Clock } from "lucide-react";
import { surpriseMeRecipe } from "@/lib/chef-ideas.functions";
import { ChefAvatar } from "@/components/ChefAvatar";
import { toast } from "sonner";

const TEASERS = [
  "Oh, I've got one…",
  "You're not going to expect this…",
  "Ha — this one's good…",
  "Okay, trust me on this one…",
  "Hang on, plating it up…",
];

export function SurpriseMeButton({ diet }: { diet?: string }) {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(TEASERS[0]);
  const [revealed, setRevealed] = useState(false);
  const fn = useServerFn(surpriseMeRecipe);
  const m = useMutation({
    mutationFn: () => {
      setTeaser(TEASERS[Math.floor(Math.random() * TEASERS.length)]);
      setRevealed(false);
      return fn({ data: { diet } });
    },
    onSuccess: () => {
      setOpen(true);
      window.setTimeout(() => setRevealed(true), 900);
    },
    onError: (e: Error) => toast.error(e.message || "Chef couldn't think of one. Try again."),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => m.mutate()}
        disabled={m.isPending}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-60"
      >
        {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Surprise Me, Chef
      </button>

      {open && m.data && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/80 ring-1 ring-border hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            {!revealed && (
              <div className="grid place-items-center gap-3 bg-gradient-to-br from-primary/20 via-accent/10 to-background p-10 text-center">
                <ChefAvatar className="h-14 w-14 animate-pulse ring-2 ring-primary/40" />
                <p className="font-display text-xl leading-tight text-foreground">{teaser}</p>
              </div>
            )}
            <div className={revealed ? "bg-gradient-to-br from-primary/15 via-accent/5 to-background p-5" : "hidden"}>
              <div className="flex items-center gap-3">
                <ChefAvatar className="h-12 w-12 ring-2 ring-primary/30" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Chef's Surprise</div>
                  <h3 className="font-display text-xl leading-tight">{m.data.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground/85">{m.data.why}</p>
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> About {m.data.time_minutes} min
              </div>
            </div>
            <ol className={revealed ? "space-y-2 p-5 pt-3 text-sm" : "hidden"}>
              {m.data.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
