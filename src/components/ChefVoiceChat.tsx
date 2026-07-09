import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  Mic,
  X,
  ChefHat,
  Loader2,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Play,
  Square,
  Refrigerator,
  Package,
  Soup,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  speakNow,
  stopAllAudio,
  getVoiceEnabled,
  hasGreetedThisSession,
  isVoiceAudioUnlocked,
  unlockVoiceAudio,
  getVoiceChatEnabled,
  getVoiceGender,
  setVoiceGender,
  getVoicePersonality,
  setVoicePersonality,
  VOICE_CHAT_PREF_EVENT,
  whenVoicesReady,
  type VoiceGender,
  type VoicePersonality,
} from "@/lib/voice-assistant";
import { VoiceRecognizer, isRecognitionSupported } from "@/lib/voice-recognition";
import { chatWithChef, type ChefChatReply } from "@/lib/voice-chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { dietLabel } from "@/lib/personalization";

type Turn = { role: "user" | "assistant"; text: string };

type HandsFreeState = {
  title: string;
  steps: string[];
  index: number;
} | null;

export function ChefVoiceChat() {
  const [chatPrefOn, setChatPrefOn] = useState(true);
  const [open, setOpen] = useState(false);
  const [autoListen, setAutoListen] = useState(false);
  const [prefill, setPrefill] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setChatPrefOn(getVoiceChatEnabled());
    const onChange = (e: Event) => setChatPrefOn((e as CustomEvent).detail);
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { autoListen?: boolean; prefill?: string }
        | undefined;
      setAutoListen(!!detail?.autoListen);
      setPrefill(detail?.prefill ?? null);
      setOpen(true);
    };
    window.addEventListener(VOICE_CHAT_PREF_EVENT, onChange as EventListener);
    window.addEventListener("tfc:open-chef-voice", onOpen as EventListener);
    return () => {
      window.removeEventListener(VOICE_CHAT_PREF_EVENT, onChange as EventListener);
      window.removeEventListener("tfc:open-chef-voice", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session?.user);
      setAuthReady(true);
    });
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s?.user);
      setAuthReady(true);
    });
    return () => l.subscription.unsubscribe();
  }, []);

  const supported = useMemo(() => isRecognitionSupported(), []);

  if (!chatPrefOn) return null;

  return (
    <>
      {open && (
        <ChefVoiceModal
          onClose={() => {
            setOpen(false);
            setPrefill(null);
          }}
          signedIn={signedIn}
          authReady={authReady}
          supported={supported}
          autoListen={autoListen}
          prefill={prefill}
        />
      )}
    </>
  );
}

function ChefVoiceModal({
  onClose,
  signedIn,
  authReady,
  supported,
  autoListen = false,
  prefill = null,
}: {
  onClose: () => void;
  signedIn: boolean;
  authReady: boolean;
  supported: boolean;
  autoListen?: boolean;
  prefill?: string | null;
}) {
  const navigate = useNavigate();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundFallback, setSoundFallback] = useState<string | null>(null);
  const [readyPrompt, setReadyPrompt] = useState(false);
  const [handsFree, setHandsFree] = useState<HandsFreeState>(null);
  const [muted, setMuted] = useState(!getVoiceEnabled());
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>(() => getVoiceGender());
  const [personality, setPersonalityState] = useState<VoicePersonality>(() =>
    getVoicePersonality(),
  );
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied" | "prompt">(
    "unknown",
  );
  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const voiceLoopRef = useRef(false);
  const turnsRef = useRef<Turn[]>([]);
  const speakingRef = useRef(false);
  const pendingRef = useRef(false);
  const tapToTalkInFlightRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [longPressPct, setLongPressPct] = useState(0);
  const { prefs } = useDietaryPrefs();
  const chatFn = useServerFn(chatWithChef);

  async function unlockAudioFromTap(): Promise<boolean> {
    setSoundFallback(null);
    if (isVoiceAudioUnlocked()) return true;
    const ok = await unlockVoiceAudio();
    if (!ok) {
      const msg = "Tap for Voice again to allow Chef Super J audio.";
      console.error("[voice] audio playback blocked: mobile audio unlock failed");
      setSoundFallback(msg);
      setError("Audio playback blocked. Tap for Voice again to allow Chef Super J voice.");
    }
    return ok;
  }

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const chatMut = useMutation({
    onMutate: () => {
      pendingRef.current = true;
    },
    mutationFn: (input: { message: string; history: Turn[] }) =>
      chatFn({
        data: {
          message: input.message,
          history: input.history.slice(-10).map((t) => ({ role: t.role, text: t.text })),
          restrictions: prefs.map((p) => dietLabel(p)),
          voicePersonality: personality,
        },
      }),
    onSuccess: (reply: ChefChatReply) => {
      setTurns((t) => [...t, { role: "assistant", text: reply.reply }]);
      speakReply(reply.reply);
      if (
        (reply.intent === "read_recipe" || reply.intent === "recipes") &&
        reply.recipeSteps &&
        reply.recipeSteps.length > 0
      ) {
        setHandsFree({
          title: reply.recipeTitle || "Tonight's dish",
          steps: reply.recipeSteps,
          index: -1,
        });
      }
    },
    onSettled: () => {
      pendingRef.current = false;
    },
    onError: (e: Error) => {
      const msg = e.message || "I couldn't reach the kitchen right now.";
      console.error("[voice] AI response failed:", msg);
      setError(msg);
      setTurns((t) => [...t, { role: "assistant", text: msg }]);
      speakReply(msg);
    },
  });

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => {
    pendingRef.current = chatMut.isPending;
  }, [chatMut.isPending]);

  useEffect(() => {
    if (!authReady) return;
    if (turns.length > 0) return;
    if (prefill && prefill.trim()) {
      // Quick-button prefill: skip greeting, fire the question immediately.
      if (supported) voiceLoopRef.current = true;
      setTimeout(() => handleVoiceCommand(prefill), 80);
      return;
    }
    if (autoListen && supported) {
      voiceLoopRef.current = true;
      // Greeting already played; continue into hands-free listening.
      setTurns([{ role: "assistant", text: "What can I do for you today?" }]);
      setTimeout(() => startListening(), 80);
      return;
    }
    const greet = signedIn
      ? "Hey, welcome back. Want to scan your fridge or talk through what you've got?"
      : "Hey, I'm Chef Super J. Want to scan your fridge or talk through what you've got? Sign in anytime for personalized kitchen help.";
    setTurns([{ role: "assistant", text: greet }]);
    if (supported) {
      voiceLoopRef.current = true;
    }
    whenVoicesReady().then(() => speakReply(greet));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  useEffect(() => {
    // Stop on unmount.
    return () => {
      voiceLoopRef.current = false;
      recognizerRef.current?.stop();
      stopAllAudio();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [turns, partial]);

  function speakReply(text: string) {
    if (!isVoiceAudioUnlocked()) {
      console.error("[voice] audio playback blocked: user tap required before speaking");
      setSoundFallback("Tap for Voice again to allow Chef Super J audio.");
      setReadyPrompt(true);
      return;
    }
    setReadyPrompt(false);
    setSoundFallback(null);
    if (muted) {
      setReadyPrompt(true);
      setSoundFallback("Tap for Voice again to allow Chef Super J audio.");
      if (voiceLoopRef.current) setTimeout(() => startListening(), 200);
      return;
    }
    recognizerRef.current?.stop();
    setListening(false);
    setSpeaking(true);
    speakingRef.current = true;
    const ok = speakNow(text, {
      onStart: () => {
        speakingRef.current = true;
        setSpeaking(true);
      },
      onEnd: () => {
        speakingRef.current = false;
        setSpeaking(false);
        setReadyPrompt(true);
        if (voiceLoopRef.current) setTimeout(() => startListening(), 200);
      },
      onError: (reason) => {
        speakingRef.current = false;
        setSpeaking(false);
        const msg = reason || "Chef Super J voice failed to play.";
        console.error("[voice] text-to-speech failed:", msg);
        setError(msg);
        setSoundFallback("Tap for Voice again to allow Chef Super J audio.");
        setReadyPrompt(true);
        if (voiceLoopRef.current) setTimeout(() => startListening(), 200);
      },
    });
    if (!ok) {
      speakingRef.current = false;
      setSpeaking(false);
      console.error("[voice] text-to-speech failed: speakNow returned false");
      setError("Chef Super J voice failed to play.");
      setSoundFallback("Tap for Voice again to allow Chef Super J audio.");
      setReadyPrompt(true);
      if (voiceLoopRef.current) setTimeout(() => startListening(), 200);
    }
  }

  function goScan(to: "/scan" | "/cupboard" | "/rescue") {
    stopListening();
    try {
      localStorage.setItem("tfc.onboarding.completed.v1", "1");
    } catch {}
    onClose();
    navigate({ to });
  }

  function handleVoiceCommand(rawText: string) {
    // Strip wake phrase: "Chef Super J, ..." / "Hey Chef Super J ..."
    const text =
      rawText
        .replace(/^\s*(hey|hi|hello|yo|okay|ok)\s+/i, "")
        .replace(/^\s*chef\s+super\s+j[,.!?:\s]+/i, "")
        .trim() || rawText.trim();
    const lower = text.toLowerCase().trim();

    if (/\b(stop listening|end conversation|stop voice chat|turn off mic)\b/.test(lower)) {
      stopListening();
      const msg = "No problem — I stopped listening. Tap to speak when you need me.";
      setTurns((t) => [...t, { role: "user", text: rawText }, { role: "assistant", text: msg }]);
      speakReply(msg);
      return;
    }

    // Hands-free recipe controls intercept first.
    if (handsFree) {
      if (/\b(next|continue|go on|got it|done|what('?s| is) next|what do i do now)\b/.test(lower))
        return advanceStep(1);
      if (/\b(back|previous|go back)\b/.test(lower)) return advanceStep(-1);
      if (/\b(repeat|again|say that again|one more time)\b/.test(lower)) return repeatStep();
      if (/\b(pause|hold on|wait|give me a (sec|second|minute)|hang on)\b/.test(lower)) {
        stopAllAudio();
        setSpeaking(false);
        const msg = 'Paused. Just say "resume" or "next" when you\'re ready.';
        setTurns((t) => [...t, { role: "user", text: rawText }, { role: "assistant", text: msg }]);
        speakReply(msg);
        return;
      }
      if (/\b(resume|continue cooking|keep going|i'?m back)\b/.test(lower)) return repeatStep();
      if (/\b(start|begin|let'?s cook)\b/.test(lower) && handsFree.index < 0) return advanceStep(1);
      if (/\b(stop|cancel|exit|quit|never mind)\b/.test(lower)) {
        setHandsFree(null);
        const msg = "Stopped hands-free cooking. Ask me anything else!";
        setTurns((t) => [...t, { role: "user", text: rawText }, { role: "assistant", text: msg }]);
        speakReply(msg);
        return;
      }
    }
    // Normal chat — let Chef answer "how much?", "what does that mean?", etc.
    if (!signedIn) {
      const msg =
        "I can hear you. Sign in when you're ready, and I'll connect your fridge, cupboard, recipes, and savings.";
      setTurns((t) => [...t, { role: "user", text }, { role: "assistant", text: msg }]);
      setPartial("");
      speakReply(msg);
      return;
    }
    const currentTurns = turnsRef.current;
    const next = [...currentTurns, { role: "user" as const, text }];
    setTurns(next);
    setPartial("");
    chatMut.mutate({ message: text, history: currentTurns });
  }

  async function ensureMicPermission(): Promise<boolean> {
    if (micPermission === "granted") return true;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't access the microphone. Try Chrome on Android.");
      setMicPermission("denied");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release — SpeechRecognition will open its own stream.
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      return true;
    } catch (e: unknown) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        console.error("[voice] microphone permission denied:", name);
        setError(
          "Please allow camera or microphone access in your browser settings, or upload a photo instead.",
        );
        setMicPermission("denied");
      } else if (name === "NotFoundError") {
        console.error("[voice] microphone permission denied: no microphone found");
        setError("No microphone found on this device.");
        setMicPermission("denied");
      } else {
        console.error("[voice] microphone permission denied or unavailable:", name || e);
        setError(
          "Please allow camera or microphone access in your browser settings, or upload a photo instead.",
        );
        setMicPermission("denied");
      }
      return false;
    }

  }

  async function startListening(): Promise<boolean> {
    if (!supported) {
      console.error("[voice] transcription failed: voice recognition unsupported");
      setError("Voice input isn't supported in this browser. Try Chrome on Android or desktop.");
      return false;
    }
    if (recognizerRef.current?.isActive()) return true;
    if (pendingRef.current) return false;
    if (speakingRef.current) {
      stopAllAudio();
      speakingRef.current = false;
      setSpeaking(false);
    }
    voiceLoopRef.current = true;
    setReadyPrompt(false);
    const ok = await ensureMicPermission();
    if (!ok) {
      console.error("[voice] microphone permission denied or unavailable");
      voiceLoopRef.current = false;
      return false;
    }
    setSpeaking(false);
    setError(null);
    setPartial("");
    const rec = recognizerRef.current ?? new VoiceRecognizer();
    recognizerRef.current = rec;
    let heardFinal = false;
    const started = rec.start({
      onPartial: (t) => {
        setPartial(t);
        try {
          window.dispatchEvent(
            new CustomEvent("tfc:chef-voice-partial", { detail: { text: t, final: false } }),
          );
        } catch {}
      },
      onFinal: (t) => {
        if (heardFinal) return; // ignore extra finals in continuous mode
        heardFinal = true;
        rec.stop();
        setLastTranscript(t);
        setListening(false);
        setPartial("");
        try {
          window.dispatchEvent(
            new CustomEvent("tfc:chef-voice-partial", { detail: { text: t, final: true } }),
          );
        } catch {}
        handleVoiceCommand(t);
      },
      onError: (msg) => {
        setListening(false);
        if (msg) {
          console.error("[voice] transcription failed:", msg);
          setError(msg);
        }
      },
      onEnd: () => {
        setListening(false);
        // Unexpected end (no speech captured) — restart so the user isn't stranded.
        if (voiceLoopRef.current && !heardFinal && !speakingRef.current && !pendingRef.current) {
          setTimeout(() => startListening(), 200);
        }
      },
    });
    if (started) {
      setListening(true);
      try {
        window.dispatchEvent(new CustomEvent("tfc:chef-voice-active"));
      } catch {}
    } else {
      console.error("[voice] transcription failed: microphone did not start");
      setError("Microphone did not start. Tap Try Voice Again.");
    }
    return started;
  }

  function stopListening() {
    voiceLoopRef.current = false;
    recognizerRef.current?.stop();
    stopAllAudio();
    speakingRef.current = false;
    setSpeaking(false);
    setListening(false);
    setPartial("");
    setReadyPrompt(false);
    try {
      window.dispatchEvent(new CustomEvent("tfc:chef-voice-idle"));
    } catch {}
  }

  const LONG_PRESS_MS = 600;

  function startLongPress() {
    if (longPressTimerRef.current) return;
    longPressTriggeredRef.current = false;
    setLongPressPct(0);
    const start = Date.now();
    longPressProgressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / LONG_PRESS_MS) * 100);
      setLongPressPct(pct);
      if (pct >= 100 && longPressProgressRef.current) {
        clearInterval(longPressProgressRef.current);
        longPressProgressRef.current = null;
      }
    }, 30);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      cancelLongPress(false);
      // Cancel voice cycle and return to idle
      voiceLoopRef.current = false;
      stopListening();
      setHandsFree(null);
      setReadyPrompt(true);
      setError(null);
      setPartial("");
      setLastTranscript("");
      if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
        (navigator as any).vibrate(40);
      }
    }, LONG_PRESS_MS);
  }

  function cancelLongPress(resetPct = true) {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressProgressRef.current) {
      clearInterval(longPressProgressRef.current);
      longPressProgressRef.current = null;
    }
    if (resetPct) {
      setLongPressPct(0);
      longPressTriggeredRef.current = false;
    }
  }

  async function handleTapToTalk() {
    // Strict lockout: ignore taps while a cycle is in flight or Chef is
    // mid-response. Only an idle or actively-listening button accepts taps.
    if (tapToTalkInFlightRef.current) return;
    if (speakingRef.current || pendingRef.current) return;
    if (listening) {
      tapToTalkInFlightRef.current = true;
      stopListening();
      setReadyPrompt(true);
      setTimeout(() => {
        tapToTalkInFlightRef.current = false;
      }, 600);
      return;
    }
    tapToTalkInFlightRef.current = true;
    try {
      const unlocked = await unlockAudioFromTap();
      if (!unlocked) return;
      await startListening();
    } finally {
      // Hold the lock long enough to swallow ghost touches (iOS double-fires
      // pointerup/click and rapid finger jitter) before allowing a stop tap.
      setTimeout(() => {
        tapToTalkInFlightRef.current = false;
      }, 600);
    }
  }

  const lastTriggerRef = useRef(0);
  function triggerTap() {
    const now = Date.now();
    // Single-tap lockout window. Swallows the synthetic click that follows
    // pointerup, plus any iOS ghost taps within ~600ms.
    if (now - lastTriggerRef.current < 600) return;
    lastTriggerRef.current = now;
    void handleTapToTalk();
  }

  function handleTapToTalkPointerDown(e: PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    startLongPress();
  }
  function handleTapToTalkPointerUp(e: PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const wasTriggered = longPressTriggeredRef.current;
    cancelLongPress(true);
    if (wasTriggered) {
      lastTriggerRef.current = Date.now();
      return;
    }
    triggerTap();
  }
  function handleTapToTalkPointerLeave(e: PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    cancelLongPress(true);
  }
  function handleTapToTalkClick(e: MouseEvent<HTMLButtonElement>) {
    // Pointer events handle the tap; the click is just a fallback for
    // keyboards / non-pointer environments.
    e.preventDefault();
    e.stopPropagation();
    triggerTap();
  }

  function advanceStep(delta: number) {
    setHandsFree((hf) => {
      if (!hf) return hf;
      const idx = Math.max(0, Math.min(hf.steps.length - 1, hf.index + delta));
      const step = hf.steps[idx];
      const prefix =
        idx === hf.steps.length - 1
          ? `Last step. ${step} You did it!`
          : `Step ${idx + 1} of ${hf.steps.length}. ${step}`;
      setTurns((t) => [...t, { role: "assistant", text: prefix }]);
      speakReply(prefix);
      return { ...hf, index: idx };
    });
  }
  function repeatStep() {
    setHandsFree((hf) => {
      if (!hf || hf.index < 0) return hf;
      const step = hf.steps[hf.index];
      const msg = `Step ${hf.index + 1}. ${step}`;
      speakReply(msg);
      return hf;
    });
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (next) {
        stopAllAudio();
        setSpeaking(false);
      }
      return next;
    });
  }

  function chooseGender(next: VoiceGender) {
    setVoiceGenderState(next);
    setVoiceGender(next);
    speakReply("Voice updated. I'm ready when you are.");
  }

  function choosePersonality(next: VoicePersonality) {
    setPersonalityState(next);
    setVoicePersonality(next);
    speakReply("Style updated. Let's keep it moving.");
  }

  const latestAssistant = [...turns].reverse().find((t) => t.role === "assistant")?.text;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-label="Chef Super J voice chat"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:h-[80vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-[oklch(0.95_0.08_30)] via-[oklch(0.95_0.07_15)] to-[oklch(0.95_0.08_290)] px-4 py-3">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-[oklch(0.6_0.2_30)] to-[oklch(0.5_0.2_290)] ring-2 ring-white/60 shadow-md">
            <img
              src="/__l5e/assets-v1/6777100d-858a-4317-9496-734f32083459/chef-super-j.jpeg"
              alt="Chef Super J"
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[oklch(0.4_0.15_30)]">
              Voice Assistant
            </p>
            <p className="text-sm font-bold text-foreground">Chef Super J</p>
          </div>
          <div className="hidden min-w-[8.5rem] gap-1 sm:grid">
            <Select
              value={voiceGender}
              onValueChange={(value) => chooseGender(value as VoiceGender)}
            >
              <SelectTrigger className="h-8 bg-white/50 text-xs" aria-label="Choose voice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={personality}
              onValueChange={(value) => choosePersonality(value as VoicePersonality)}
            >
              <SelectTrigger className="h-8 bg-white/50 text-xs" aria-label="Choose personality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chef">Chef-style</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="energetic">Energetic</SelectItem>
                <SelectItem value="calm">Calm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute Chef" : "Mute Chef"}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground hover:bg-secondary"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-foreground shadow-sm hover:bg-secondary/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hands-free banner */}
        {handsFree && (
          <div className="border-b border-[oklch(0.88_0.05_140)] bg-gradient-to-r from-[oklch(0.96_0.08_140)] to-[oklch(0.95_0.09_100)] px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[oklch(0.35_0.12_140)]">
                  Hands-Free Cooking
                </p>
                <p className="truncate text-sm font-semibold text-[oklch(0.22_0.05_140)]">
                  {handsFree.title} ·{" "}
                  {handsFree.index < 0
                    ? "ready"
                    : `Step ${handsFree.index + 1} / ${handsFree.steps.length}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => advanceStep(-1)}
                  disabled={handsFree.index <= 0}
                  aria-label="Previous step"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-[oklch(0.35_0.12_140)] shadow-sm disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={repeatStep}
                  disabled={handsFree.index < 0}
                  aria-label="Repeat step"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-[oklch(0.35_0.12_140)] shadow-sm disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                {handsFree.index < 0 ? (
                  <button
                    onClick={() => advanceStep(1)}
                    aria-label="Start cooking"
                    className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.55_0.18_140)] px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                  >
                    <Play className="h-3 w-3" /> Start
                  </button>
                ) : (
                  <button
                    onClick={() => advanceStep(1)}
                    disabled={handsFree.index >= handsFree.steps.length - 1}
                    aria-label="Next step"
                    className="grid h-8 w-8 place-items-center rounded-full bg-[oklch(0.55_0.18_140)] text-white shadow-sm disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setHandsFree(null);
                    stopAllAudio();
                  }}
                  aria-label="Stop hands-free"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-[oklch(0.4_0.15_30)] shadow-sm"
                >
                  <Square className="h-3 w-3" />
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-[oklch(0.4_0.05_140)]">
              Say "Chef Super J, next", "repeat", "pause", or "what do I do now?".
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-b border-border bg-card px-4 py-2 sm:hidden">
          <Select value={voiceGender} onValueChange={(value) => chooseGender(value as VoiceGender)}>
            <SelectTrigger className="h-9 text-xs" aria-label="Choose voice">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={personality}
            onValueChange={(value) => choosePersonality(value as VoicePersonality)}
          >
            <SelectTrigger className="h-9 text-xs" aria-label="Choose personality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chef">Chef-style</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
              <SelectItem value="calm">Calm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-b border-border bg-gradient-to-b from-[oklch(0.98_0.05_35)] via-card to-card px-4 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(0.45_0.15_30)]">
            First step
          </p>
          <div className="mx-auto mt-2 max-w-sm rounded-3xl bg-white/85 px-4 py-3 text-base font-extrabold leading-snug text-foreground shadow-lg shadow-black/10 ring-1 ring-border/60">
            {latestAssistant ?? "Tap the microphone, or scan your fridge when you're ready."}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleTapToTalkClick}
              onPointerDown={handleTapToTalkPointerDown}
              onPointerUp={handleTapToTalkPointerUp}
              onPointerLeave={handleTapToTalkPointerLeave}
              onContextMenu={(e) => e.preventDefault()}
              aria-disabled={chatMut.isPending}
              aria-label={listening ? "Stop listening" : "Microphone"}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", pointerEvents: "auto" }}
              className={cn(
                "relative grid h-10 w-10 cursor-pointer select-none place-items-center rounded-full text-white ring-2 ring-white/70 transition active:scale-95",
                listening
                  ? "bg-[oklch(0.55_0.22_25)]"
                  : "bg-[oklch(0.5_0.2_255)]",
                (chatMut.isPending || speaking) && "opacity-60",
              )}
            >
              {listening && (
                <span className="pointer-events-none absolute inset-0 rounded-full bg-[oklch(0.55_0.22_25/0.35)] animate-ping" />
              )}
              {longPressPct > 0 && (
                <span
                  className="pointer-events-none absolute inset-0 rounded-full bg-[oklch(0.55_0.25_25/0.55)] transition-none"
                  style={{ transform: `scale(${0.25 + (longPressPct / 100) * 0.75})` }}
                />
              )}
              <Mic className="pointer-events-none relative h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-muted-foreground">
              {listening ? "Listening…" : speaking ? "Speaking…" : chatMut.isPending ? "Thinking…" : "Just talk"}
            </span>
          </div>


          {soundFallback && (
            <p className="mt-2 text-xs font-semibold text-muted-foreground" aria-live="polite">
              {soundFallback}
            </p>
          )}

          <p className="mt-2 text-sm font-semibold text-foreground">
            {listening
              ? turns.length > 1
                ? "Listening again…"
                : "Listening…"
              : speaking
                ? "Chef Super J is speaking…"
                : chatMut.isPending
                  ? "Thinking…"
                  : readyPrompt
                    ? "Ready when you are."
                    : "Tap to talk"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {listening
              ? "Speak naturally — I'll wait for you to finish."
              : "Tell me what you have, or skip straight to scanning."}
          </p>


          <div className="mt-4 grid grid-cols-2 gap-2">
            <VoiceActionButton icon={<Refrigerator className="h-4 w-4" />} label="Scan my fridge" onClick={() => goScan("/scan")} />
            <VoiceActionButton icon={<Package className="h-4 w-4" />} label="Scan my cupboard" onClick={() => goScan("/cupboard")} />
            <VoiceActionButton icon={<Soup className="h-4 w-4" />} label="Use my leftovers" onClick={() => goScan("/rescue")} />
            <button
              type="button"
              onClick={() => {
                stopListening();
                onClose();
              }}
              className="col-span-2 min-h-[56px] rounded-2xl border-2 border-foreground/30 bg-foreground px-4 py-3 text-base font-black text-background shadow-lg transition hover:bg-foreground/90 active:scale-[0.98]"
            >
              Skip voice
            </button>
          </div>

          {micPermission === "denied" && (
            <MicPermissionPrompt
              onRetry={async () => {
                setError(null);
                setSoundFallback(null);
                setMicPermission("unknown");
                  // Re-request mic permission from a fresh user gesture.
                const ok = await ensureMicPermission();
                if (!ok) return;
                voiceLoopRef.current = true;
                  // Restart the greeting-to-listening flow: replay the last
                  // assistant greeting so speakReply's onEnd hands off to
                  // startListening automatically.
                await unlockAudioFromTap();
                const lastGreeting = [...turnsRef.current]
                  .reverse()
                    .find((t) => t.role === "assistant")?.text ?? "What can I do for you today?";
                if (lastGreeting && isVoiceAudioUnlocked() && !muted) {
                  speakReply(lastGreeting);
                } else {
                  await startListening();
                }
              }}
            />
          )}


          {(error || !supported) && micPermission !== "denied" && (
            <div className="mt-3 rounded-2xl bg-destructive/10 p-3 text-center ring-1 ring-destructive/20">
              <p className="text-sm font-black text-foreground">Voice not working? No problem.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {!supported ? "This browser doesn't support voice input." : error}
              </p>
              {supported && (
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    setSoundFallback(null);
                    setMicPermission("unknown");
                    voiceLoopRef.current = true;
                    await startListening();
                  }}
                  className="mt-2 w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white shadow-md transition active:scale-[0.98]"
                >
                  Try Voice Again
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  onClose();
                }}
                className="mt-2 w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-black text-background shadow-md transition active:scale-[0.98]"
              >
                Continue without voice
              </button>
            </div>
          )}

          {(partial || lastTranscript) && (
            <p className="mt-3 text-xs text-muted-foreground">
              {partial ? `Live: “${partial}”` : `You said: “${lastTranscript}”`}
            </p>
          )}
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {turns.map((t, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                t.role === "assistant"
                  ? "bg-gradient-to-br from-[oklch(0.97_0.05_30)] to-[oklch(0.96_0.06_290)] text-foreground ring-1 ring-[oklch(0.88_0.05_30)]"
                  : "ml-auto bg-primary text-primary-foreground",
              )}
            >
              {t.text}
            </div>
          ))}
          {partial && (
            <div className="ml-auto max-w-[85%] rounded-2xl bg-primary/60 px-3.5 py-2 text-sm italic text-primary-foreground">
              {partial}
            </div>
          )}
          {chatMut.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Chef is thinking…
            </div>
          )}
          {speaking && !chatMut.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Volume2 className="h-3 w-3 animate-pulse" /> Chef is speaking…
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Suggestions */}
        <div className="border-t border-border bg-card px-4 py-3">
          <>
            {!signedIn && (
              <p className="mb-2 text-center text-xs text-muted-foreground">
                Sign in for personalized fridge, savings, and meal answers. Voice still works.
              </p>
            )}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleVoiceCommand(s)}
                  disabled={chatMut.isPending}
                  className="rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        </div>
      </div>
    </div>
  );
}

function VoiceActionButton({
  icon,
  label,
  onClick,
  onPointerDown,
  primary = false,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (e: PointerEvent<HTMLButtonElement>) => void;
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", pointerEvents: "auto" }}
      className={cn(
        "relative z-30 flex min-h-[60px] min-w-[60px] cursor-pointer select-none items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-black shadow-lg transition active:scale-[0.98]",
        primary
          ? active
            ? "bg-[oklch(0.55_0.22_25)] text-white shadow-[oklch(0.55_0.22_25/0.35)]"
            : "bg-[oklch(0.5_0.2_255)] text-white shadow-[oklch(0.5_0.2_255/0.35)]"
          : "bg-white text-foreground ring-1 ring-border/70 shadow-black/10",
      )}
    >
      <span className={cn("pointer-events-none grid h-8 w-8 shrink-0 place-items-center rounded-full", primary ? "bg-white/15" : "bg-amber-300 text-stone-950")}>
        {icon}
      </span>
      <span className="pointer-events-none leading-tight">{label}</span>
    </button>
  );
}

const SUGGESTIONS = [
  "Chef Super J, what's next?",
  "How much of that?",
  "What does that mean?",
  "What can I make tonight?",
  "What's going bad first?",
  "How much have I saved?",
];

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  const safari = /^((?!chrome|crios|fxios|edgios).)*safari/i.test(ua);
  return iOS && safari;
}

function MicPermissionPrompt({ onRetry }: { onRetry: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const ios = isIOSSafari();
  return (
    <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-300/60">
      <p className="text-sm font-black text-amber-950">
        Microphone is blocked
      </p>
      <p className="mt-1 text-xs text-amber-900/80">
        Chef Super J needs microphone access to hear you. Allow it, then tap Try Voice Again.
      </p>
      {ios ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-amber-900/90">
          <li>Tap the <strong>“aA”</strong> icon in Safari's address bar.</li>
          <li>Choose <strong>Website Settings</strong>.</li>
          <li>Set <strong>Microphone</strong> to <strong>Allow</strong>, then return here.</li>
          <li>If you don't see it: iPhone <strong>Settings → Safari → Microphone → Allow</strong>.</li>
        </ol>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-amber-900/90">
          <li>Tap the lock or site icon in your address bar.</li>
          <li>Set <strong>Microphone</strong> to <strong>Allow</strong>.</li>
          <li>Reload the page if prompted, then return here.</li>
        </ol>
      )}
      <button
        type="button"
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          try { await onRetry(); } finally { setBusy(false); }
        }}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        {busy ? "Checking microphone…" : "Try Voice Again"}
      </button>
    </div>
  );
}

