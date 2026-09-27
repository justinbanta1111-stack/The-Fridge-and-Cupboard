import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, X, LifeBuoy, Wand2 } from "lucide-react";
import {
  fixMyMeal,
  makeItFancy,
  type FixMyMealResult,
  type MakeItFancyResult,
} from "@/lib/chef-experience.functions";
import { toast } from "sonner";

type Tab = "fix" | "fancy";

const FIX_EXAMPLES = ["Too salty", "Sauce too thin", "Chicken came out dry", "Too spicy", "Lumpy gravy"];

/**
 * A single low-key text link that opens "Something not going right?" —
 * Fix My Meal and Make It Fancy in one small sheet. No new home-screen buttons.
 */
export function ChefFixIt({ items = [] }: { items?: string[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("fix");
  const [text, setText] = useState("");
  const [fix, setFix] = useState<FixMyMealResult | null>(null);
  const [fancy, setFancy] = useState<MakeItFancyResult | null>(null);

  const fixFn = useServerFn(fixMyMeal);
  const fancyFn = useServerFn(makeItFancy);

  const fixMut = useMutation({
    mutationFn: (problem: string) => fixFn({ data: { problem, items } }),
    onSuccess: (r) => setFix(r),
    onError: (e: Error) => toast.error(e.message || "Couldn't get a fix. Try again."),
  });
  const fancyMut = useMutation({
    mutationFn: (dish: string) => fancyFn({ data: { dish, items } }),
    onSuccess: (r) => setFancy(r),
    onError: (e: Error) => toast.error(e.message || "Couldn't fancy that up. Try again."),
  });

  const pending = fixMut.isPending || fancyMut.isPending;

  function submit() {
    const v = text.trim();
    if (v.length < 3) return;
    if (tab === "fix") {
      setFix(null);
      fixMut.mutate(v);
    } else {
      setFancy(null);
      fancyMut.mutate(v);
    }
  }

  function switchTab(next: Tab) {
    setTab(next);
    setText("");
    setFix(null);
    setFancy(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        Something not going right in the kitchen? Ask Chef
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center bg-black/50 p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full ring-1 ring-border hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-2 pr-10">
              <button
                type="button"
                onClick={() => switchTab("fix")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${tab === "fix" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                <LifeBuoy className="h-3.5 w-3.5" /> Fix my meal
              </button>
              <button
                type="button"
                onClick={() => switchTab("fancy")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${tab === "fancy" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                <Wand2 className="h-3.5 w-3.5" /> Make it fancy
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder={tab === "fix" ? "My soup is too salty…" : "Baked chicken and rice"}
              className="mt-3 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary/60"
            />

            {tab === "fix" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FIX_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setText(ex)}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={pending || text.trim().length < 3}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tab === "fix" ? "Rescue it" : "Upgrade it"}
            </button>

            {tab === "fix" && fix && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-foreground">{fix.reassurance}</p>
                <ol className="space-y-2">
                  {fix.fixes.map((f, i) => (
                    <li key={i} className="rounded-xl border border-border/60 bg-card p-3">
                      <div className="text-sm font-semibold text-foreground">
                        {i + 1}. {f.step}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{f.why}</div>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">Next time: {fix.prevention}</p>
              </div>
            )}

            {tab === "fancy" && fancy && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-foreground">{fancy.intro}</p>
                <ul className="space-y-2">
                  {fancy.upgrades.map((u, i) => (
                    <li key={i} className="rounded-xl border border-border/60 bg-card p-3">
                      <div className="text-sm font-semibold text-foreground">{u.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{u.how}</div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-primary/90">Plating: {fancy.plating}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
