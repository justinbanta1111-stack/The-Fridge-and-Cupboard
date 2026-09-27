import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Mic, Send, Sparkles, Loader2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { askSubstitution, type SubstitutionAnswer } from "@/lib/substitutions.functions";
import { ScanAuthGate } from "@/components/ScanAuthGate";
import { ensureGuestSession } from "@/lib/guest";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/substitutions")({
  head: () => ({
    meta: [
      { title: "Ingredient Substitutions — The Fridge & Cupboard" },
      { name: "description", content: "Ask by voice or text what to use when you're missing an ingredient." },
      { property: "og:title", content: "Ingredient Substitutions — The Fridge & Cupboard" },
      { property: "og:description", content: "Practical replacements with exact amounts for anything you're missing." },
    ],
  }),
  component: SubstitutionsPage,
});

const EXAMPLES = [
  "I don't have eggs. What can I use instead?",
  "What can I substitute for buttermilk?",
  "No heavy cream — what works?",
  "Out of butter for baking",
];

function SubstitutionsPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [question, setQuestion] = useState("");
  const ask = useServerFn(askSubstitution);
  const mutation = useMutation({
    mutationFn: (q: string) => ask({ data: { question: q } }),
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) return setSignedIn(true);
      // Free to try: guests get an anonymous session automatically.
      try {
        await ensureGuestSession();
        setSignedIn(true);
      } catch {
        setSignedIn(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setSignedIn(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    mutation.mutate(trimmed);
  };

  const startVoice = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't available on this browser. Please type your question.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript ?? "";
      if (t) submit(t);
    };
    rec.onerror = () => {};
    try { rec.start(); } catch {}
  };

  const answer: SubstitutionAnswer | undefined = mutation.data;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {signedIn === false ? (
          <ScanAuthGate message="Sign in to ask Chef Super J for ingredient substitutions." />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold leading-tight">Ingredient Substitutions</h1>
                <p className="text-sm text-muted-foreground">
                  Ask by voice or text. Chef Super J will suggest what to use.
                </p>
              </div>
            </div>

            <Card className="mt-6 p-4">
              <form
                onSubmit={(e) => { e.preventDefault(); submit(question); }}
                className="flex gap-2"
              >
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. I don't have eggs. What can I use?"
                  className="flex-1"
                />
                <Button type="button" size="icon" variant="outline" onClick={startVoice} aria-label="Ask by voice">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button type="submit" size="icon" disabled={mutation.isPending} aria-label="Ask">
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => submit(ex)}
                    className="rounded-full border border-border/60 bg-secondary px-3 py-1 text-xs text-muted-foreground hover:bg-secondary/80"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </Card>

            {mutation.isError && (
              <Card className="mt-4 border-destructive/40 p-4 text-sm text-destructive">
                {(mutation.error as Error)?.message || "Something went wrong."}
              </Card>
            )}

            {answer && (
              <Card className="mt-4 p-4">
                {answer.missing && (
                  <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
                    Missing: {answer.missing}
                  </Badge>
                )}
                {answer.reply && <p className="text-sm">{answer.reply}</p>}
                {answer.substitutions.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {answer.substitutions.map((s, i) => (
                      <li key={i} className="rounded-lg border border-border/60 bg-card p-3">
                        <div className="font-semibold text-sm">{s.swap}</div>
                        <div className="text-xs text-muted-foreground">Use: {s.amount}</div>
                        {s.note && <div className="mt-1 text-xs">{s.note}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
