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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { speakNow, isVoiceSupported, stopAllAudio } from "@/lib/voice-assistant";
import { VoiceRecognizer, isRecognitionSupported } from "@/lib/voice-recognition";

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
 *   - tap the big mic to toggle hands-free listening
 *
 * Steps stay on a single, large card so it's readable from a few feet away.
 */
export function CookingMode({ open, onClose, title, steps, subtitle }: Props) {
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [heard, setHeard] = useState("");
  const recRef = useRef<VoiceRecognizer | null>(null);
  const lastSpokenRef = useRef<number>(-1);

  const total = steps.length;
  const current = steps[index] ?? "";
  const isLast = index >= total - 1;
  const isFirst = index <= 0;

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setIndex(0);
      lastSpokenRef.current = -1;
    } else {
      stopListening();
      stopAllAudio();
    }
  }, [open]);

  // Speak step when index changes (if autoplay)
  useEffect(() => {
    if (!open || !autoplay || !current) return;
    if (lastSpokenRef.current === index) return;
    lastSpokenRef.current = index;
    const phrase = total > 0 ? `Step ${index + 1} of ${total}. ${current}` : current;
    speakNow(phrase);
  }, [open, autoplay, index, current, total]);

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

  function handleCommand(textRaw: string) {
    const t = textRaw.toLowerCase().trim();
    setHeard(textRaw);
    if (!t) return;
    if (/\b(next|continue|go on|got it|ready|advance|move on)\b/.test(t)) {
      if (isLast) {
        speakNow("Nice work — that was the last step. Enjoy your meal!");
        return;
      }
      const nextIndex = Math.min(total - 1, index + 1);
      lastSpokenRef.current = nextIndex;
      speakNow(`Moving on. Step ${nextIndex + 1} of ${total}. ${steps[nextIndex]}`);
      setIndex(nextIndex);
    } else if (/\b(previous|back|go back|last step)\b/.test(t)) {
      const prevIndex = Math.max(0, index - 1);
      lastSpokenRef.current = prevIndex;
      speakNow(`Going back. Step ${prevIndex + 1} of ${total}. ${steps[prevIndex]}`);
      setIndex(prevIndex);
    } else if (/\b(repeat|again|say that again|one more time)\b/.test(t)) {
      lastSpokenRef.current = index;
      speakNow(`Repeating. Step ${index + 1} of ${total}. ${steps[index]}`);
    } else if (/\b(pause|stop|hold on|wait)\b/.test(t)) {
      speakNow("Pausing.");
    } else if (/\b(done|finished|finish|complete|all done)\b/.test(t)) {
      speakNow("Beautiful. You cooked it.");
      setTimeout(onClose, 1200);
    } else if (/\b(close|exit|quit)\b/.test(t)) {
      speakNow("Closing cooking mode.");
      setTimeout(onClose, 900);
    }
  }

  function startListening() {
    if (!isRecognitionSupported()) return;
    if (!recRef.current) recRef.current = new VoiceRecognizer();
    setListening(true);
    const restart = () => {
      // continuous-ish: re-arm after each utterance while still listening
      if (recRef.current && listeningRef.current) {
        setTimeout(() => startOne(), 250);
      }
    };
    const startOne = () => {
      recRef.current!.start({
        onFinal: (t) => handleCommand(t),
        onError: (e) => {
          if (e) setHeard(e);
        },
        onEnd: () => {
          restart();
        },
      });
    };
    startOne();
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
        <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
          Step {index + 1} of {total}
        </Badge>
        <p className="mt-5 max-w-2xl font-display text-3xl leading-tight tracking-tight sm:text-4xl">
          {current}
        </p>
        {isLast && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Last step — you got this.
          </div>
        )}
      </div>

      {/* Voice feedback */}
      <div className="mx-auto mb-2 min-h-[20px] max-w-md px-4 text-center text-xs text-muted-foreground">
        {listening
          ? heard
            ? `Heard: "${heard}"`
            : "Listening… say 'next', 'repeat', or 'back'"
          : null}
      </div>

      {/* Controls */}
      <div className="border-t border-border/60 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <Button variant="outline" size="lg" onClick={prev} disabled={isFirst} className="flex-1">
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
            <Button size="lg" onClick={onClose} className="flex-1 font-bold">
              <CheckCircle2 className="mr-1 h-5 w-5" /> Done
            </Button>
          ) : (
            <Button size="lg" onClick={next} className="flex-1 font-bold">
              Next <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-2">
          {supportsRec && (
            <Button
              variant={listening ? "default" : "outline"}
              onClick={() => (listening ? stopListening() : startListening())}
              className={cn("rounded-full px-4", listening && "shadow-lg")}
            >
              {listening ? (
                <>
                  <Mic className="mr-1.5 h-4 w-4 animate-pulse" /> Listening
                </>
              ) : (
                <>
                  <MicOff className="mr-1.5 h-4 w-4" /> Hands-free
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
