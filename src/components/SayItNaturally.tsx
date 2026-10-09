import { useRef, useState } from "react";
import { Loader2, MessageCircleHeart, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { chatWithChef, chatWithChefGuest } from "@/lib/voice-chat.functions";
import { speak, stopAllAudio } from "@/lib/voice-assistant";
import { resolveUserName } from "@/lib/user-name";

const PHRASES = [
  "I don't like onions.",
  "I need something cheap.",
  "I want Mexican food.",
  "I only have 20 minutes.",
  "I need something my kids will eat.",
  "I'm trying to use these leftovers.",
  "I'm on a tight grocery budget.",
  "I need something healthy.",
  "What can I make with this?",
];

type Turn = { role: "user" | "assistant"; text: string };

/**
 * Teaches users they can talk naturally. Each example is answered right here:
 * the exact phrase goes to Chef, the reply is shown on screen and spoken.
 * This does not depend on the hands-free listening loop being active.
 */
export function SayItNaturally() {
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const history = useRef<Turn[]>([]);
  const seq = useRef(0);

  function sharedHistory(): Turn[] {
    try {
      const raw = sessionStorage.getItem("tfc.voice.history.v1");
      const h = raw ? (JSON.parse(raw) as Turn[]) : [];
      return Array.isArray(h) && h.length ? h : history.current;
    } catch {
      return history.current;
    }
  }

  async function signedInNow(): Promise<boolean> {
    try {
      const r = await Promise.race([
        supabase.auth.getSession(),
        new Promise<null>((res) => setTimeout(() => res(null), 3000)),
      ]);
      const u = r && "data" in r ? r.data.session?.user : null;
      return Boolean(u && !u.is_anonymous);
    } catch {
      return false;
    }
  }

  function resumeListening() {
    try {
      window.dispatchEvent(new CustomEvent("tfc:open-chef-voice", { detail: { autoListen: true } }));
    } catch {}
  }

  async function ask(message: string) {
    if (busy) return; // ignore repeated taps while Chef is answering
    const my = ++seq.current;
    setAsked(message);
    setAnswer(null);
    setError(null);
    setBusy(true);
    stopAllAudio();
    try {
      const signedIn = await signedInNow();
      const userName = await resolveUserName();
      const input = {
        message,
        history: sharedHistory().slice(-12),
        voicePersonality: "chef" as const,
        ...(userName ? { userName } : {}),
      };
      const call = signedIn
        ? chatWithChef({ data: input as any })
        : chatWithChefGuest({ data: input as any });
      const res = await Promise.race([
        call,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 25000)),
      ]);
      if (my !== seq.current) return;
      const reply = typeof res?.reply === "string" ? res.reply.trim() : "";
      if (!reply) throw new Error("empty reply");
      history.current.push({ role: "user", text: message }, { role: "assistant", text: reply });
      setAnswer(reply);
      // Share the question and answer with the voice loop so follow-ups keep context.
      window.dispatchEvent(new CustomEvent("tfc:chef-said", { detail: { text: reply, userText: message } }));
      let done = false;
      const after = () => { if (!done) { done = true; resumeListening(); } };
      const ok = speak(reply, { onEnd: after, onError: () => after() });
      if (!ok) after();
    } catch (e) {
      console.warn("[say-it] chef request failed", e);
      if (my === seq.current) setError("Chef couldn't answer just now. Tap to try again.");
    } finally {
      if (my === seq.current) setBusy(false);
    }
  }

  return (
    <section
      data-reveal
      className="mx-auto mt-3 w-full max-w-2xl rounded-2xl border border-white/12 bg-ink-soft/60 px-4 py-3 backdrop-blur-md sm:mt-4"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-ivory">
        <MessageCircleHeart className="h-4 w-4 text-teal" /> Just say it — Chef understands
      </div>
      <p className="mt-1 text-[13px] leading-snug text-ivory/75">
        No commands to learn. Talk or type like you would to a friend:
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PHRASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => void ask(p)}
            disabled={busy}
            aria-pressed={asked === p}
            className="press-lift touch-manipulation rounded-full border border-teal/35 bg-teal/12 px-2.5 py-1.5 text-[12px] font-medium text-ivory/90 transition hover:bg-teal/22"
          >
            “{p}”
          </button>
        ))}
      </div>
      {asked && (
        <div aria-live="polite" className="mt-3 rounded-xl border border-teal/30 bg-ink-soft/80 p-3 text-[14px] leading-snug text-ivory">
          <div className="text-[12px] font-semibold text-ivory/70">You: “{asked}”</div>
          {busy && (
            <div className="mt-2 flex items-center gap-2 text-ivory/80">
              <Loader2 className="h-4 w-4 animate-spin" /> Chef is thinking…
            </div>
          )}
          {answer && <p className="mt-2">{answer}</p>}
          {error && (
            <button type="button" onClick={() => void ask(asked)} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-teal underline">
              <RotateCcw className="h-4 w-4" /> {error}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default SayItNaturally;
