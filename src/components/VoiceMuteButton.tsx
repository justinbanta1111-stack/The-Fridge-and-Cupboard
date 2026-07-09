import { useEffect, useState } from "react";
import { Volume2, VolumeX, Music, Music2 } from "lucide-react";
import {
  getVoiceEnabled,
  setVoiceEnabled,
  stopAllAudio,
  VOICE_PREF_EVENT,
} from "@/lib/voice-assistant";
import {
  getAmbienceEnabled,
  setAmbienceEnabled,
  startKitchenAmbience,
  stopKitchenAmbience,
  isKitchenAmbiencePlaying,
} from "@/lib/sound-effects";
import { cn } from "@/lib/utils";

type Props = { className?: string };

/**
 * Compact mute/unmute control for Chef Super J's voice + optional
 * low-volume kitchen ambience. Visible on the homepage hero.
 */
export function VoiceMuteButton({ className }: Props) {
  const [voiceOn, setVoiceOn] = useState(true);
  const [ambienceOn, setAmbienceOn] = useState(true);

  useEffect(() => {
    setVoiceOn(getVoiceEnabled());
    setAmbienceOn(getAmbienceEnabled());
    const onPref = () => setVoiceOn(getVoiceEnabled());
    window.addEventListener(VOICE_PREF_EVENT, onPref);
    return () => window.removeEventListener(VOICE_PREF_EVENT, onPref);
  }, []);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceEnabled(next);
    setVoiceOn(next);
    if (!next) {
      stopAllAudio();
      stopKitchenAmbience();
    }
  };

  const toggleAmbience = () => {
    const next = !ambienceOn;
    setAmbienceEnabled(next);
    setAmbienceOn(next);
    if (next) {
      startKitchenAmbience();
      // auto-stop after 25s so it doesn't loop forever from the toggle
      window.setTimeout(() => {
        if (isKitchenAmbiencePlaying()) stopKitchenAmbience();
      }, 25000);
    } else {
      stopKitchenAmbience();
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/35 px-1.5 py-1 ring-1 ring-white/20 backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggleVoice}
        aria-pressed={voiceOn}
        aria-label={voiceOn ? "Mute Chef's voice" : "Unmute Chef's voice"}
        title={voiceOn ? "Mute voice" : "Unmute voice"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15"
      >
        {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={toggleAmbience}
        aria-pressed={ambienceOn}
        aria-label={ambienceOn ? "Mute kitchen ambience" : "Play kitchen ambience"}
        title={ambienceOn ? "Mute ambience" : "Play ambience"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15"
      >
        {ambienceOn ? <Music className="h-4 w-4" /> : <Music2 className="h-4 w-4 opacity-60" />}
      </button>
    </div>
  );
}
