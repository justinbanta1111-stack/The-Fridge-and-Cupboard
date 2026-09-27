import { Gauge, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  VOICE_RATE_DEFAULT,
  speakNow,
} from "@/lib/voice-assistant";

const SAMPLE =
  "Here's what I found. You've got chicken, peppers and rice. That's a quick skillet dinner, about twenty minutes.";

/**
 * Voice timing calibration — playback speed and the pause between sentences
 * when Chef Super J reads a scan result out loud.
 */
export function VoiceTimingSettings({ className }: { className?: string }) {
  return (
    <Card className={className ? `p-5 ${className}` : "p-5"}>
      <div className="flex items-center gap-2">
        <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="font-display text-lg">Voice timing</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Chef Super J uses the same warm, natural conversational pace for greetings, questions, recipes, and cooking steps.
      </p>

      <div className="mt-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">Locked at {VOICE_RATE_DEFAULT.toFixed(2)}× for a calm, consistent delivery.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-11 flex-1"
            onClick={() => speakNow(SAMPLE)}
            aria-label="Play a sample scan result at these settings"
          >
            <Play className="mr-2 h-4 w-4" aria-hidden="true" /> Hear a sample
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default VoiceTimingSettings;
