import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { speakNow, stopAllAudio } from "@/lib/voice-assistant";

type Step = { title: string; line: string };

const INTRO: Step = {
  title: "Chef Super J",
  line: "Welcome to The Fridge and Cupboard. I'm Chef Super J. Let me show you what makes this different.",
};

const STEPS: Step[] = [
  { title: "Scan My Fridge", line: "Take a picture of your fridge and I'll tell you what you can make." },
  { title: "Scan My Cupboard", line: "I combine pantry and fridge ingredients for even more meal ideas." },
  { title: "Use My Leftovers", line: "I transform leftovers into brand new meals." },
  { title: "What's Going Bad First", line: "I prioritize ingredients that need to be used soon." },
  { title: "What Can I Make Right Now", line: "I instantly show meals you can make without shopping." },
  { title: "Feed My Family", line: "Choose family size, picky eaters, and budget." },
  { title: "Surprise Me Spinner", line: "Spin for random meal inspiration." },
  { title: "Save Money Tracker", line: "Track money saved, food rescued, and meals created." },
  { title: "Smart Shopping List", line: "I show what small ingredients unlock more meals." },
  { title: "Orthodox Lent Mode", line: "Special meal ideas for fasting periods." },
  { title: "Healthy + Bodybuilder Mode", line: "Macros, protein goals, weight loss, and weight gain options." },
  { title: "Elderly Easy Meals", line: "Soft foods, simple prep, easy-to-eat meals." },
  { title: "Teach Me While I Cook", line: "Ask me cooking questions live while preparing meals." },
  { title: "Ask Chef Super J Anything", line: "Cooking help, substitutions, meal fixes, and quick dinner ideas." },
  { title: "Use It Before You Lose It", line: "Get reminders before food expires." },
];

const OUTRO: Step = {
  title: "My Goal",
  line: "My goal is simple. Save you money, reduce waste, and make cooking easier using what you already have.",
};

const SEQUENCE: Step[] = [INTRO, ...STEPS, OUTRO];

export function ShowMeWhatThisCanDoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mt-4 flex justify-center">
        <Button
          size="lg"
          onClick={() => setOpen(true)}
          className="group relative overflow-hidden rounded-full bg-gradient-to-r from-primary via-accent to-primary px-6 py-6 text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
        >
          <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
          Show Me What This Can Do
        </Button>
      </div>
      {open && <TourDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function TourDialog({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const cancelledRef = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = SEQUENCE[i];
  const total = SEQUENCE.length;

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      stopAllAudio();
    };
  }, []);

  useEffect(() => {
    if (cancelledRef.current) return;
    const current = SEQUENCE[i];
    if (!current) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);

    const advance = () => {
      if (cancelledRef.current) return;
      if (i + 1 >= SEQUENCE.length) {
        // Finished
        advanceTimer.current = setTimeout(() => {
          if (!cancelledRef.current) onClose();
        }, 600);
      } else {
        setI((v) => v + 1);
      }
    };

    // Hard ceiling per step so the whole tour stays snappy (~30s total).
    const fallback = setTimeout(advance, 2200);
    advanceTimer.current = fallback;

    const ok = speakNow(current.line, {
      onEnd: () => {
        clearTimeout(fallback);
        if (cancelledRef.current) return;
        advance();
      },
      onError: () => {
        clearTimeout(fallback);
        if (cancelledRef.current) return;
        advance();
      },
    });
    if (!ok) {
      // Voice unavailable — auto-advance on the fallback timer.
    }

    return () => {
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  function handleSkip() {
    cancelledRef.current = true;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    stopAllAudio();
    onClose();
  }

  const progress = ((i + 1) / total) * 100;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="max-w-md overflow-hidden border-0 bg-gradient-to-br from-background via-background to-primary/10 p-0">
        <div className="relative p-6">
          <button
            onClick={handleSkip}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Skip tour"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ChefHat className="h-5 w-5" />
            </div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Feature {i + 1} of {total}
            </div>
          </div>

          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="mb-2 text-2xl font-extrabold leading-tight text-foreground">
              {step.title}
            </h3>
            <p className="text-base text-muted-foreground">{step.line}</p>
          </div>

          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
