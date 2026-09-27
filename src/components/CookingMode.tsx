import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  X,
  CheckCircle2,
  Volume2,
  Timer as TimerIcon,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { speakNow, isVoiceSupported, stopAllAudio,
  duckVoiceOutput } from "@/lib/voice-assistant";
import { VoiceRecognizer, isRecognitionSupported } from "@/lib/voice-recognition";
import { armAudioGate, disarmAudioGate } from "@/lib/audio-gate";
import { claimVoiceSession, releaseVoiceSession } from "@/lib/voice-session";
import { noteInterruption } from "@/lib/interruption-politeness";
import { useServerFn } from "@tanstack/react-start";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { getActiveSpeakerId, getSpeakerProfile } from "@/lib/speaker-profiles";
import { cookStepHelp } from "@/lib/cook-along.functions";
import {
  formatClock,
  parseTimerCommand,
  playTimerChime,
  spokenDuration,
  suggestStepSeconds,
} from "@/lib/step-timer";


type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  steps: string[];
  subtitle?: string;
};

/**
 * Hands-free step-by-step cooking mode.
 *
 * Chef Super J reads each step aloud, then waits. The user can:
 *   - tap Next / Previous / Repeat
 *   - say "next" / "next step" / "go", "previous" / "back", "repeat",
 *     "pause" / "stop", "done" / "finished"
  *   - use the reconnect control only if the phone suspends its microphone
 *
 * Steps stay on a single, large card so it's readable from a few feet away.
 */
export function CookingMode({ open, onClose, title, steps, subtitle }: Props) {
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const [scale, setScale] = useState(1);
  const [timerLeft, setTimerLeft] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const recRef = useRef<VoiceRecognizer | null>(null);
  const lastSpokenRef = useRef<number>(-1);
  const speakingRef = useRef(false);
  const indexRef = useRef(0);
  const scaleRef = useRef(1);
  const timerLeftRef = useRef(0);
  const timerRunningRef = useRef(false);
  const autoTimedRef = useRef<number>(-1);
  const interruptedRef = useRef(false);
  // Set when the cook has interrupted several times in a row — the next thing
  // the chef says gets a brief, warm "Pardon me." prefix, then it's cleared.
  const pardonPendingRef = useRef(false);
  const progressKey = `tfc.cooking.progress.v1:${title}`;

  const askChef = useServerFn(cookStepHelp);
  const { restrictions } = useDietaryPrefs();

  const total = steps.length;
  const current = steps[index] ?? "";
  const isLast = index >= total - 1;
  const isFirst = index <= 0;
  const suggestedSeconds = suggestStepSeconds(current);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    timerLeftRef.current = timerLeft;
  }, [timerLeft]);
  useEffect(() => {
    timerRunningRef.current = timerRunning;
  }, [timerRunning]);

  // Countdown tick — deadline-based so it stays accurate if the tab throttles.
  useEffect(() => {
    if (!timerRunning) return;
    const deadline = Date.now() + timerLeftRef.current * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, (deadline - Date.now()) / 1000);
      setTimerLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        setTimerRunning(false);
        timerRunningRef.current = false;
        playTimerChime();
        setTimeout(() => say("Timer's up."), 900);
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning]);


  // Reset when reopened
  useEffect(() => {
    if (open) {
      claimVoiceSession("cooking");
      const saved = Number(sessionStorage.getItem(progressKey));
      setIndex(Number.isInteger(saved) && saved >= 0 && saved < steps.length ? saved : 0);
      setAnswer("");
      setScale(1);
      setHeard("");
      cancelTimer();
      lastSpokenRef.current = -1;
      autoTimedRef.current = -1;

      // Hands-free by default — the whole point of Cook With Me.
      if (isRecognitionSupported()) setTimeout(() => startListening(), 400);
    } else {
      stopListening();
      stopAllAudio();
      disarmAudioGate();
      releaseVoiceSession("cooking");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, progressKey, steps.length]);

  useEffect(() => {
    if (!open) return;
    try { sessionStorage.setItem(progressKey, String(index)); } catch {}
  }, [index, open, progressKey]);

  /** Speak without the mic hearing the chef — pause capture, resume after. */
  function say(text: string, onDone?: () => void) {
    if (!autoplay) {
      onDone?.();
      return;
    }
    if (pardonPendingRef.current) {
      pardonPendingRef.current = false;
      text = `Pardon me. ${text}`;
    }
    speakingRef.current = true;
    pauseCapture();
    speakNow(text, {
      onStart: () => {
        void armAudioGate(() => {
          if (!speakingRef.current) return;
          // Never talk over the cook — go silent and listen immediately.
          // Usually we just pause naturally; only after repeated interruptions
          // do we offer a brief "Pardon me."
          interruptedRef.current = true;
          if (noteInterruption()) pardonPendingRef.current = true;
          stopAllAudio();
          disarmAudioGate();
          speakingRef.current = false;
          resumeCapture();
        }, duckVoiceOutput);
      },
      onEnd: () => {
        disarmAudioGate();
        speakingRef.current = false;
        if (interruptedRef.current) {
          interruptedRef.current = false;
          return;
        }
        onDone?.();
        resumeCapture();
      },
      onError: () => {
        disarmAudioGate();
        speakingRef.current = false;
        onDone?.();
        resumeCapture();
      },
    });
  }

  // Speak step when index changes (if autoplay), then auto-start its timer.
  useEffect(() => {
    if (!open || !autoplay || !current) return;
    if (lastSpokenRef.current === index) return;
    lastSpokenRef.current = index;
    // One step, then silence. They tell us when they're done.
    const wait = " Take your time. Tell me when you're done, or ask me anything.";
    const phrase = (total > 0 ? `Step ${index + 1} of ${total}. ${current}` : current) + wait;
    const seconds = suggestedSeconds;
    say(phrase, () => {
      if (!seconds || autoTimedRef.current === index) return;
      autoTimedRef.current = index;
      setTimer(seconds, true);
      say(`Timer set for ${spokenDuration(seconds)}.`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoplay, index, current, total, suggestedSeconds]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function next() {
    setIndex((i) => Math.min(total - 1, i + 1));
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }
  function repeat() {
    stopAllAudio();
    lastSpokenRef.current = -1; // force re-speak
    setIndex((i) => i); // trigger effect
  }
  function pauseSpeech() {
    stopAllAudio();
  }

  // ----- Kitchen timer controls -----
  function setTimer(seconds: number, autostart = true) {
    const s = Math.max(1, Math.round(seconds));
    setTimerTotal(s);
    setTimerLeft(s);
    timerLeftRef.current = s;
    setTimerRunning(false);
    timerRunningRef.current = false;
    if (autostart) {
      // Let state settle so the countdown effect reads the fresh remaining time.
      setTimeout(() => {
        setTimerRunning(true);
        timerRunningRef.current = true;
      }, 0);
    }
  }
  function startTimer() {
    if (timerLeftRef.current <= 0) return;
    setTimerRunning(true);
    timerRunningRef.current = true;
  }
  function pauseTimer() {
    setTimerRunning(false);
    timerRunningRef.current = false;
  }
  function cancelTimer() {
    setTimerRunning(false);
    timerRunningRef.current = false;
    setTimerLeft(0);
    setTimerTotal(0);
    timerLeftRef.current = 0;
  }
  function addTime(seconds: number) {
    const next = Math.max(0, timerLeftRef.current + seconds);
    const wasRunning = timerRunningRef.current;
    setTimerLeft(next);
    timerLeftRef.current = next;
    setTimerTotal((t) => Math.max(t, Math.ceil(next)));
    // Re-arm the deadline-based countdown with the new remaining time.
    setTimerRunning(false);
    timerRunningRef.current = false;
    if (wasRunning && next > 0) {
      setTimeout(() => {
        setTimerRunning(true);
        timerRunningRef.current = true;
      }, 0);
    }
  }

  /** Returns true when the phrase was a timer command and has been handled. */
  function handleTimerCommand(textRaw: string): boolean {
    const cmd = parseTimerCommand(textRaw);
    if (!cmd) return false;
    switch (cmd.kind) {
      case "set":
        setTimer(cmd.seconds);
        say(`Timer set for ${spokenDuration(cmd.seconds)}.`);
        return true;
      case "start":
      case "resume": {
        if (timerLeftRef.current > 0) {
          startTimer();
          say(`Timer running. ${spokenDuration(timerLeftRef.current)} left.`);
        } else if (suggestedSeconds) {
          setTimer(suggestedSeconds);
          say(`Timer set for ${spokenDuration(suggestedSeconds)}.`);
        } else {
          say("How long should I set it for?");
        }
        return true;
      }
      case "pause":
        pauseTimer();
        say(`Timer paused at ${spokenDuration(timerLeftRef.current)}.`);
        return true;
      case "cancel":
        cancelTimer();
        say("Timer cleared.");
        return true;
      case "add":
        addTime(cmd.seconds);
        say(`Added ${spokenDuration(cmd.seconds)}.`);
        return true;
      case "check":
        if (timerLeftRef.current > 0) say(`${spokenDuration(timerLeftRef.current)} left.`);
        else say("No timer running right now.");
        return true;
      default:
        return false;
    }
  }


  function goTo(nextIndex: number, lead: string) {
    const clamped = Math.max(0, Math.min(total - 1, nextIndex));
    lastSpokenRef.current = clamped;
    setIndex(clamped);
    setAnswer("");
    say(`${lead} Step ${clamped + 1} of ${total}. ${steps[clamped]}`);
  }

  function handleCommand(textRaw: string) {
    const t = textRaw.toLowerCase().trim();
    if (!t) return;
    setHeard(textRaw);
    const i = indexRef.current;

    // Timer phrases win before "pause"/"stop" step commands.
    if (handleTimerCommand(textRaw)) return;



    if (/\b(next|continue|go on|got it|ready|advance|move on|okay next|what's next)\b/.test(t)) {
      if (i >= total - 1) {
        say("Nice work — that was the last step. Enjoy your meal!");
        return;
      }
      goTo(i + 1, "Moving on.");
    } else if (/\b(previous|back|go back|last step)\b/.test(t)) {
      goTo(i - 1, "Going back.");
    } else if (/\b(repeat|again|say that again|one more time|what was that)\b/.test(t)) {
      lastSpokenRef.current = i;
      say(`Repeating. Step ${i + 1} of ${total}. ${steps[i]}`);
    } else if (/\b(pause|hold on|wait a second|give me a minute)\b/.test(t)) {
      stopAllAudio();
      say("No rush. Say next when you're ready.");
    } else if (/\b(done|finished|all done|that's it)\b/.test(t)) {
      say("Beautiful. You cooked it.");
      setTimeout(onClose, 1600);
    } else if (/\b(close|exit|quit|stop cooking mode)\b/.test(t)) {
      say("Closing cooking mode.");
      setTimeout(onClose, 1200);
    } else {
      // Anything else is a real question or a quantity tweak — ask Chef.
      void ask(textRaw);
    }
  }

  async function ask(question: string) {
    if (thinking) return;
    setThinking(true);
    setAnswer("");
    pauseCapture();
    try {
      const res = await askChef({
        data: {
          question,
          title,
          steps: steps.slice(0, 30),
          stepIndex: Math.min(indexRef.current, 29),
          scale: scaleRef.current,
          restrictions: [
            ...restrictions,
            // Whoever is cooking right now: keep their own must-avoid list active.
            ...(getSpeakerProfile(getActiveSpeakerId())?.restrictions ?? []),
          ].slice(0, 20),
        },
      });
      setAnswer(res.answer);
      if (res.scale && res.scale !== scaleRef.current) setScale(res.scale);
      const i = indexRef.current;
      // Always hand the kitchen back at the exact step they paused on, and
      // never advance on our own — they say when they're ready.
      const tail =
        total > 0 ? ` Whenever you're ready, we were on step ${i + 1}. ${steps[i]}` : "";
      say(`${res.answer}${tail}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "I didn't catch that.";
      setAnswer(msg);
      say("Sorry, I missed that one. Ask me again.");
    } finally {
      setThinking(false);
    }
  }

  function startListening() {
    if (!isRecognitionSupported()) return;
    if (!recRef.current) recRef.current = new VoiceRecognizer();
    setListening(true);
    listeningRef.current = true;
    startCapture();
  }

  function startCapture() {
    if (!recRef.current || !listeningRef.current) return;
    if (speakingRef.current) return;
    recRef.current.start({
      onFinal: (t) => handleCommand(t),
      onError: (e) => {
        if (e) setHeard(e);
      },
      onEnd: () => {
        // continuous-ish: re-arm after each utterance while still listening
        if (listeningRef.current && !speakingRef.current) setTimeout(() => startCapture(), 80);
      },
    });
  }

  /** Mute the mic while the chef talks so it never hears itself. */
  function pauseCapture() {
    recRef.current?.stop();
  }
  function resumeCapture() {
    if (listeningRef.current) setTimeout(() => startCapture(), 60);
  }

  const listeningRef = useRef(false);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  function stopListening() {
    setListening(false);
    listeningRef.current = false;
    recRef.current?.stop();
  }

  useEffect(() => {
    if (!open) return;
    return () => {
      stopListening();
      stopAllAudio();
      disarmAudioGate();
      releaseVoiceSession("cooking");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  if (!open) return null;
  if (typeof document === "undefined") return null;

  const supportsVoice = isVoiceSupported();
  const supportsRec = isRecognitionSupported();

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/98 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-9 w-9 overflow-hidden rounded-xl ring-2 ring-primary/30">
            <img src="/__l5e/assets-v1/6777100d-858a-4317-9496-734f32083459/chef-super-j.jpeg" alt="Chef Super J" className="h-full w-full object-cover object-top" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{title}</div>
            {subtitle && (
              <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close cooking mode">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Step body */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="border-primary/40 bg-primary/5 px-3 py-1 text-base font-bold text-primary">
            Step {index + 1} of {total}
          </Badge>
          {scale !== 1 && (
            <Badge variant="outline" className="border-accent/50 bg-accent/10 text-accent-foreground">
              {scale}× batch
            </Badge>
          )}
        </div>
        <p className="mt-6 max-w-2xl font-display text-[2rem] font-semibold leading-snug tracking-tight sm:text-5xl">
          {current}
        </p>
        {/* Kitchen timer */}
        <div className="mt-6 w-full max-w-md">
          {timerTotal > 0 ? (
            <div
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                timerLeft <= 0
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-primary/30 bg-primary/5",
              )}
            >
              <div className="flex items-center justify-center gap-3">
                <TimerIcon
                  className={cn("h-5 w-5 text-primary", timerRunning && "animate-pulse")}
                />
                <span className="font-display text-4xl tabular-nums tracking-tight">
                  {formatClock(timerLeft)}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, (timerLeft / Math.max(1, timerTotal)) * 100))}%`,
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {timerRunning ? (
                  <Button size="sm" variant="outline" onClick={pauseTimer} className="rounded-full">
                    <Pause className="mr-1 h-4 w-4" /> Pause
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => (timerLeft > 0 ? startTimer() : setTimer(timerTotal))}
                    className="rounded-full"
                  >
                    <Play className="mr-1 h-4 w-4" /> {timerLeft > 0 ? "Start" : "Restart"}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => addTime(60)} className="rounded-full">
                  <Plus className="mr-1 h-4 w-4" /> 1 min
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelTimer} className="rounded-full text-xs">
                  Clear
                </Button>
              </div>
              {timerLeft <= 0 && (
                <div className="mt-2 text-center text-xs font-semibold text-emerald-700">
                  Time's up — check on it.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {suggestedSeconds && (
                <Button
                  size="sm"
                  onClick={() => setTimer(suggestedSeconds)}
                  className="rounded-full"
                >
                  <TimerIcon className="mr-1.5 h-4 w-4" /> Start {formatClock(suggestedSeconds)} timer
                </Button>
              )}
              {[60, 300, 600].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  onClick={() => setTimer(s)}
                  className="rounded-full text-xs"
                >
                  {s / 60} min
                </Button>
              ))}
            </div>
          )}
          <div className="mt-2 text-center text-[11px] text-muted-foreground">
            Hands-free: say “timer five”, “pause timer”, “add two minutes”, “how much time is left”
          </div>
        </div>

        {isLast && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Last step — you got this.
          </div>
        )}
      </div>


      {/* Chef answer + voice feedback */}
      <div className="mx-auto mb-2 w-full max-w-md px-4">
        {(thinking || answer) && (
          <div className="mb-2 rounded-2xl border border-primary/25 bg-primary/5 p-3 text-left text-sm leading-relaxed text-foreground">
            {thinking ? (
              <span className="text-muted-foreground">Chef's thinking…</span>
            ) : (
              answer
            )}
          </div>
        )}
        <div className="min-h-[20px] text-center text-xs text-muted-foreground">
          {listening
            ? heard
              ? `Heard: "${heard}"`
              : "Listening… say “next”, or just ask me anything"
            : "Listening resumes automatically after Chef finishes"}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border/60 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <Button variant="outline" size="lg" onClick={prev} disabled={isFirst} className="h-16 flex-1 text-lg">
            <ChevronLeft className="mr-1 h-5 w-5" /> Back
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={repeat}
            disabled={!supportsVoice}
            aria-label="Repeat step"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          {isLast ? (
            <Button size="lg" onClick={onClose} className="h-16 flex-1 text-lg font-bold">
              <CheckCircle2 className="mr-1 h-5 w-5" /> Done
            </Button>
          ) : (
            <Button size="lg" onClick={next} className="h-16 flex-1 text-lg font-bold">
              Next Step <ChevronRight className="ml-1 h-6 w-6" />

            </Button>
          )}
        </div>

        <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-2">
          {supportsRec && (
            <Button
              variant={listening ? "default" : "outline"}
              onClick={() => startListening()}
              className={cn("rounded-full px-4", listening && "shadow-lg")}
            >
              {listening ? (
                <>
                  <Mic className="mr-1.5 h-4 w-4 animate-pulse" /> Listening
                </>
              ) : (
                <>
                  <MicOff className="mr-1.5 h-4 w-4" /> Reconnect mic
                </>
              )}
            </Button>
          )}
          {supportsVoice && (
            <Button
              variant={autoplay ? "default" : "outline"}
              onClick={() => {
                setAutoplay((v) => !v);
                if (autoplay) pauseSpeech();
                else {
                  lastSpokenRef.current = -1;
                  setIndex((i) => i);
                  speakNow(`Step ${index + 1} of ${total}. ${current}`);
                }
              }}
              className="rounded-full px-4"
            >
              {autoplay ? (
                <>
                  <Pause className="mr-1.5 h-4 w-4" /> Mute Chef
                </>
              ) : (
                <>
                  <Volume2 className="mr-1.5 h-4 w-4" /> Voice on
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              lastSpokenRef.current = -1;
              setIndex(0);
            }}
            className="rounded-full px-3 text-xs"
          >
            <Play className="mr-1 h-3.5 w-3.5" /> Restart
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
