import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Gem, Loader2, Sparkles } from "lucide-react";
import { pantryTreasureHunt } from "@/lib/chef-ideas.functions";
import { ChefAvatar } from "@/components/ChefAvatar";
import { toast } from "sonner";

export function PantryTreasureHunt({ items }: { items: string[] }) {
  const fn = useServerFn(pantryTreasureHunt);
  const [finds, setFinds] = useState<Awaited<ReturnType<typeof pantryTreasureHunt>>["finds"]>([]);
  const m = useMutation({
    mutationFn: () => fn({ data: { items } }),
    onSuccess: (r) => setFinds(r.finds),
    onError: (e: Error) => toast.error(e.message || "No treasure right now."),
  });

  const canHunt = items && items.length >= 2;

  return (
    <section
      aria-label="Pantry Treasure Hunt"
      className="mt-4 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-background to-background p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
          <Gem className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">
            Pantry Treasure Hunt
          </div>
          <h3 className="font-display text-lg leading-tight">Hidden gems in your kitchen</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Chef Super J finds surprise combos and overlooked dishes from what you already have.
          </p>
          <button
            type="button"
            onClick={() => m.mutate()}
            disabled={!canHunt || m.isPending}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500/90 disabled:opacity-50"
          >
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {finds.length ? "Hunt again" : "Start the hunt"}
          </button>
          {!canHunt && (
            <p className="mt-2 text-xs text-muted-foreground">Scan your fridge or pantry first — Chef needs at least 2 items.</p>
          )}
        </div>
      </div>

      {finds.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {finds.map((f, i) => (
            <li key={i} className="rounded-xl border border-border/60 bg-card/60 p-3">
              <div className="flex items-center gap-2">
                <ChefAvatar className="h-7 w-7" />
                <h4 className="font-display text-base leading-tight">{f.dish}</h4>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {f.combo.map((c, j) => (
                  <span key={j} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {c}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground/80">{f.twist}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
