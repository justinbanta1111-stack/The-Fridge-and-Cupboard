import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, X, Clock } from "lucide-react";
import { surpriseMeRecipe } from "@/lib/chef-ideas.functions";
import { ChefAvatar } from "@/components/ChefAvatar";
import { toast } from "sonner";

export function SurpriseMeButton({ diet }: { diet?: string }) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(surpriseMeRecipe);
  const m = useMutation({
    mutationFn: () => fn({ data: { diet } }),
    onSuccess: () => setOpen(true),
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
            <div className="bg-gradient-to-br from-primary/15 via-accent/5 to-background p-5">
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
            <ol className="space-y-2 p-5 pt-3 text-sm">
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
