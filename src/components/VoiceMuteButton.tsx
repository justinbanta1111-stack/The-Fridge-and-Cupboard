import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  getVoiceEnabled,
  setVoiceEnabled,
  stopAllAudio,
  VOICE_PREF_EVENT,
} from "@/lib/voice-assistant";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = { className?: string };

/**
 * Simple always-available mute control for Chef Super J's spoken voice.
 * Muting only silences speech output — listening and every other feature
 * keep working exactly as before.
 */
export function VoiceMuteButton({ className }: Props) {
  const [voiceOn, setVoiceOn] = useState(true);

  useEffect(() => {
    setVoiceOn(getVoiceEnabled());
    const onPref = () => setVoiceOn(getVoiceEnabled());
    window.addEventListener(VOICE_PREF_EVENT, onPref);
    return () => window.removeEventListener(VOICE_PREF_EVENT, onPref);
  }, []);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceEnabled(next);
    setVoiceOn(next);
    if (!next) stopAllAudio();
  };

  return (
    <Button
      variant="outline"
      size="icon"
      type="button"
      data-voice-mute
      onClick={toggleVoice}
      aria-pressed={!voiceOn}
      aria-label={voiceOn ? "Mute assistant voice" : "Unmute assistant voice"}
      title={voiceOn ? "Mute assistant voice" : "Unmute assistant voice"}
      className={cn(
        "fixed right-[max(env(safe-area-inset-right,0px),12px)] top-[calc(var(--app-safe-top)+4px)] z-[320] h-[44px] w-[44px] rounded-full text-foreground sm:top-[calc(var(--app-safe-top)+0.75rem)] sm:h-11 sm:w-11",
        className,
      )}
    >
      {voiceOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </Button>
  );
}
