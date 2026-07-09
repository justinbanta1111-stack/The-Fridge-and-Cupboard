import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Mic, Send, Sparkles } from "lucide-react";
import { askChefSuperJ } from "@/lib/chef-ideas.functions";
import { ChefAvatar } from "@/components/ChefAvatar";
import { toast } from "sonner";

export const Route = createFileRoute("/academy/ask")({
  head: () => ({
    meta: [
      { title: "Ask Chef Super J — Kitchen Q&A" },
      { name: "description", content: "Got a kitchen question? Ask Chef Super J — type it or use the voice button. Real, practical answers from a 30-year pro." },
      { property: "og:title", content: "Ask Chef Super J" },
      { property: "og:description", content: "Type or speak your kitchen question. Chef answers." },
    ],
  }),
  component: AskChefPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="text-destructive">{error.message}</p>
      <button onClick={reset} className="mt-4 underline">Try again</button>
    </div>
  ),
});

const STARTER_QUESTIONS = [
  "How do I keep chicken from drying out?",
  "What can I do with wilted spinach?",
  "How do I season a cast iron pan?",
  "How long does cooked rice last in the fridge?",
];

function AskChefPage() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [answeredQ, setAnsweredQ] = useState<string | null>(null);
  const ask = useServerFn(askChefSuperJ);

  const m = useMutation({
    mutationFn: (question: string) => ask({ data: { question } }),
    onSuccess: (r, question) => {
      setAnswer(r.answer);
      setAnsweredQ(question);
    },
    onError: (e: Error) => toast.error(e.message || "Chef didn't catch that. Try again."),
  });

  function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed || m.isPending) return;
    setQ(trimmed);
    m.mutate(trimmed);
  }

  return (
    <div className="space-y-6">
      <Link
        to="/academy"
        className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border transition hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" /> Academy
      </Link>

      <header className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-primary/5 to-background p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ChefAvatar className="h-14 w-14 ring-2 ring-primary/30" />
          <div>
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">Ask Chef Super J</h1>
            <p className="mt-1 text-sm text-foreground/85 sm:text-base">
              Type your kitchen question below — or tap the floating mic button to talk to Chef live.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
              <Mic className="h-3.5 w-3.5" /> Voice chat is always one tap away
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
      >
        <label htmlFor="ask-chef" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your question
        </label>
        <textarea
          id="ask-chef"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. How do I rescue overcooked pasta?"
          rows={3}
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:text-base"
          maxLength={400}
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{q.length}/400</span>
          <button
            type="submit"
            disabled={!q.trim() || m.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask Chef
          </button>
        </div>
      </form>

      {!answer && !m.isPending && (
        <section aria-label="Starter questions" className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted sm:text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      {answer && (
        <section
          aria-label="Chef's answer"
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-5 sm:p-6"
        >
          {answeredQ && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              You asked: <span className="text-foreground/90 normal-case tracking-normal">{answeredQ}</span>
            </p>
          )}
          <div className="flex items-start gap-3">
            <ChefAvatar className="h-10 w-10 shrink-0 ring-2 ring-primary/30" />
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Chef Super J says
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
                {answer}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
