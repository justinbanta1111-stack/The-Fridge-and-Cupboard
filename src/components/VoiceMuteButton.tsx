import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  getVoiceEnabled,
  setVoiceEnabled,
  stopAllAudio,
  VOICE_PREF_EVENT,
} from "@/lib/voice-assistant";
import { cn } from "@/lib/utils";

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
    <button
      type="button"
      data-voice-mute
      onClick={toggleVoice}
      aria-pressed={!voiceOn}
      aria-label={voiceOn ? "Mute assistant voice" : "Unmute assistant voice"}
      title={voiceOn ? "Mute assistant voice" : "Unmute assistant voice"}
      className={cn(
        "fixed right-3 z-[320] inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md transition hover:bg-black/60 active:scale-95",
        className,
      )}
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
    >
      {voiceOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
}
