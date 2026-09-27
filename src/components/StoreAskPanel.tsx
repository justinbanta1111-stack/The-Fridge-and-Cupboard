import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Loader2, Mic, MicOff, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { askStoreChef } from "@/lib/store-ask.functions";
import { ensureGuestSession } from "@/lib/guest";
import {
  speakNow,
  isVoiceSupported,
  stopAllAudio,
  duckVoiceOutput,
} from "@/lib/voice-assistant";
import { VoiceRecognizer, isRecognitionSupported } from "@/lib/voice-recognition";
import { armAudioGate, disarmAudioGate } from "@/lib/audio-gate";
import { noteInterruption } from "@/lib/interruption-politeness";
import {
  ensureMicPermission,
  queryMicPermission,
  MIC_BLOCKED_MESSAGE,
} from "@/lib/mic-permission";

export type StoreAskContext = {
  imageDataUrl?: string | null;
  itemName?: string;
  itemSummary?: string;
  products?: string[];
  haveAtHome?: string[];
  useUpSoon?: string[];
  dietary?: string[];
  storeName?: string;
};

type Turn = { role: "user" | "chef"; text: string };

const QUICK = [
  "What is this?",
  "Which one should I buy?",
  "How do I cook it?",
  "What goes well with it?",
  "Is this a good deal?",
  "What can I make tonight?",
] as const;

/**
 * Ask Any Question — the full Chef assistant, right on the store screen.
 * Types or speaks; Chef sees the scanned photo and remembers the thread,
 * answers on screen and out loud, and goes silent the moment you speak.
 */
export function StoreAskPanel({ context }: { context: StoreAskContext }) {
  const ask = useServerFn(askStoreChef);
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [activeQuickQuestion, setActiveQuickQuestion] = useState<string | null>(null);
  const [canTalk, setCanTalk] = useState(false);
  const [micNote, setMicNote] = useState("");

  const recRef = useRef<VoiceRecognizer | null>(null);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const pardonRef = useRef(false);
  const turnsRef = useRef<Turn[]>([]);
  const contextRef = useRef(context);
  const voiceOnRef = useRef(true);
  // Live copy of "Chef is working on an answer". The spoken path reads this
  // from inside a recognizer callback, where React state would be stale and
  // would silently swallow the question.
  const thinkingRef = useRef(false);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);
  useEffect(() => {
    setCanTalk(isRecognitionSupported());
  }, []);

  // If the microphone is already allowed on this device, Chef starts
  // listening on his own — no tap needed.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isRecognitionSupported()) return;
      const state = await queryMicPermission();
      if (cancelled || state !== "granted") return;
      startListening();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      recRef.current?.stop();
      stopAllAudio();
      disarmAudioGate();
    };
  }, []);

  function startCapture() {
    if (!recRef.current || !listeningRef.current || speakingRef.current) return;
    recRef.current.start({
      onPartial: (t) => setHeard(t),
      onFinal: (t) => {
        setHeard("");
        const spoken = t.trim();
        if (spoken) void submit(spoken);
      },
      onError: (e) => {
        if (e) setMicNote(e);
      },
      onEnd: () => {
        if (listeningRef.current && !speakingRef.current) {
          setTimeout(() => startCapture(), 80);
        }
      },
    });
  }

  function startListening() {
    if (!isRecognitionSupported()) return;
    if (!recRef.current) recRef.current = new VoiceRecognizer();
    setMicNote("");
    listeningRef.current = true;
    setListening(true);
    startCapture();
  }

  /** Tapping Talk: ask for the microphone once, then listen. */
  async function startTalking() {
    if (!isRecognitionSupported()) {
      setMicNote("Voice isn't available in this browser — type your question instead.");
      return;
    }
    const state = await ensureMicPermission(true);
    if (state === "granted") {
      startListening();
      return;
    }
    setMicNote(
      state === "denied"
        ? MIC_BLOCKED_MESSAGE
        : "Voice isn't available on this device — type your question instead.",
    );
  }

  function stopListening() {
    listeningRef.current = false;
    setListening(false);
    setHeard("");
    recRef.current?.stop();
  }

  function pauseCapture() {
    recRef.current?.stop();
  }

  function resumeCapture() {
    if (listeningRef.current) setTimeout(() => startCapture(), 80);
  }

  /** Speak the answer; the instant the user talks, stop and listen. */
  function say(answer: string) {
    if (!voiceOnRef.current || !isVoiceSupported()) {
      resumeCapture();
      return;
    }
    const line = pardonRef.current ? `Pardon me. ${answer}` : answer;
    pardonRef.current = false;
    speakingRef.current = true;
    setSpeaking(true);
    pauseCapture();
    speakNow(line, {
      onStart: () => {
        void armAudioGate(() => {
          if (!speakingRef.current) return;
          // They started talking — go quiet immediately and listen.
          if (noteInterruption()) pardonRef.current = true;
          stopAllAudio();
          disarmAudioGate();
          speakingRef.current = false;
          setSpeaking(false);
          if (!listeningRef.current) startListening();
          else resumeCapture();
        }, duckVoiceOutput);
      },
      onEnd: () => {
        disarmAudioGate();
        speakingRef.current = false;
        setSpeaking(false);
        resumeCapture();
      },
      onError: () => {
        disarmAudioGate();
        speakingRef.current = false;
        setSpeaking(false);
        resumeCapture();
      },
    });
  }

  async function submit(question: string) {
    const q = question.trim();
    if (!q || thinkingRef.current) return;
    // Anything Chef is saying stops the moment a new question arrives.
    stopAllAudio();
    disarmAudioGate();
    speakingRef.current = false;
    setSpeaking(false);
    setText("");
    setMicNote("");
    thinkingRef.current = true;
    setThinking(true);
    setTurns((prev) => [...prev, { role: "user", text: q }]);
    pauseCapture();
    try {
      await ensureGuestSession();
      const c = contextRef.current;
      const res = await ask({
        data: {
          question: q,
          imageDataUrl: c.imageDataUrl ?? "",
          itemName: c.itemName ?? "",
          itemSummary: c.itemSummary ?? "",
          products: (c.products ?? []).slice(0, 25),
          haveAtHome: (c.haveAtHome ?? []).slice(0, 60),
          useUpSoon: (c.useUpSoon ?? []).slice(0, 20),
          dietary: (c.dietary ?? []).slice(0, 30),
          storeName: c.storeName ?? "",
          history: turnsRef.current.slice(-8),
        },
      });
      setTurns((prev) => [...prev, { role: "chef", text: res.answer }]);
      say(res.answer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "I didn't catch that one. Ask me again.";
      setTurns((prev) => [...prev, { role: "chef", text: msg }]);
      resumeCapture();
    } finally {
      thinkingRef.current = false;
      setThinking(false);
      setActiveQuickQuestion(null);
    }
  }

  function submitQuickQuestion(question: string) {
    if (thinkingRef.current) return;
    setActiveQuickQuestion(question);
    void submit(question);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Ask Any Question</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {context.itemName
              ? `Chef is looking at your ${context.itemName} — ask anything about it.`
              : "Type or talk. Chef answers out loud and remembers what you scanned."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 px-2"
          aria-label={voiceOn ? "Turn Chef's voice off" : "Turn Chef's voice on"}
          onClick={() => {
            const next = !voiceOn;
            setVoiceOn(next);
            if (!next) {
              stopAllAudio();
              disarmAudioGate();
              speakingRef.current = false;
              setSpeaking(false);
            }
          }}
        >
          {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Suggested questions">
        {QUICK.map((q) => (
          <Button
            key={q}
            type="button"
            variant="outline"
            className="h-12 w-full justify-between whitespace-normal px-3 text-left text-sm shadow-sm active:scale-[0.98]"
            disabled={thinking}
            aria-label={`Ask Chef: ${q}`}
            onClick={() => submitQuickQuestion(q)}
          >
            <span>{q}</span>
            {thinking && activeQuickQuestion === q ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            )}
          </Button>
        ))}
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(text);
        }}
      >
        <textarea
          id="store-ask"
          value={text}
          rows={2}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(text);
            }
          }}
          placeholder="Type your question and press Return…"
          aria-label="Ask Chef Super J a question"
          className="min-h-[52px] w-full resize-none rounded-md border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
        />
        <div className="flex shrink-0 flex-col gap-2">
          <Button type="submit" disabled={thinking || !text.trim()} className="h-11 px-4">
            {thinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Ask Chef
          </Button>
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            className="h-11 px-4"
            onClick={() => (listening ? stopListening() : void startTalking())}
            aria-label={listening ? "Stop listening" : "Talk to Chef"}
            disabled={!canTalk}
          >
            {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
            {listening ? "Stop" : "Talk"}
          </Button>
        </div>
      </form>

      {(listening || speaking || heard || micNote) && (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {micNote
            ? micNote
            : speaking
              ? "Chef is talking — just start speaking and he'll stop and listen."
              : heard
                ? `Heard: ${heard}`
                : "Listening…"}
        </p>
      )}


      {turns.length > 0 && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {turns.map((t, i) => (
            <div
              key={`${t.role}-${i}`}
              className={
                t.role === "user"
                  ? "rounded-md bg-muted/50 p-3 text-sm"
                  : "rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"
              }
            >
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t.role === "chef" && <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />}
                {t.role === "user" ? "You asked" : "Chef Super J"}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{t.text}</p>
            </div>
          ))}
          {thinking && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chef is thinking…
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
