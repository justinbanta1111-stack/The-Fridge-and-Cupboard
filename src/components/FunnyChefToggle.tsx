import { useEffect, useState } from "react";
import { Laugh, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getFunnyMode, setFunnyMode, pickQuip } from "@/lib/funny-chef";

export function FunnyChefToggle() {
  const [on, setOn] = useState(false);
  const [quip, setQuip] = useState<string>("");

  useEffect(() => {
    setOn(getFunnyMode());
    setQuip(pickQuip());
    const refresh = () => setOn(getFunnyMode());
    window.addEventListener("tfc:funny-chef:update", refresh);
    return () => window.removeEventListener("tfc:funny-chef:update", refresh);
  }, []);

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow">
          <Laugh className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Funny Chef Mode</div>
          <div className="text-xs text-muted-foreground">Add a little wit to Chef Super J.</div>
        </div>
        <Switch
          checked={on}
          onCheckedChange={(v) => { setFunnyMode(v); setOn(v); if (v) setQuip(pickQuip()); }}
          aria-label="Toggle funny chef mode"
        />
      </div>
      {on && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-fuchsia-300/40 bg-fuchsia-500/5 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" />
          <div className="flex-1">
            <div className="italic">"{quip}"</div>
            <button
              onClick={() => setQuip(pickQuip(Math.floor(Math.random() * 10_000)))}
              className="mt-1 text-xs font-semibold text-fuchsia-600 hover:underline"
            >
              Give me another →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
