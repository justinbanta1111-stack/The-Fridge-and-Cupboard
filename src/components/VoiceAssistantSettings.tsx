import { useEffect, useState } from "react";
import { Volume2, VolumeX, Play, Mic, MicOff, ChefHat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VOICE_PREF_EVENT,
  VOICE_CHAT_PREF_EVENT,
  VOICE_STYLE_PREF_EVENT,
  getVoiceEnabled,
  isVoiceSupported,
  setVoiceEnabled,
  speakNow,
  getVoiceChatEnabled,
  setVoiceChatEnabled,
  getHandsFreeEnabled,
  setHandsFreeEnabled,
  getVoiceGender,
  setVoiceGender,
  getVoicePersonality,
  setVoicePersonality,
  type VoiceGender,
  type VoicePersonality,
} from "@/lib/voice-assistant";
import { isRecognitionSupported } from "@/lib/voice-recognition";

const SAMPLE = "Alright, I'm Chef Super J. Let's make something good with what you've already got.";

export function VoiceAssistantSettings() {
  const [enabled, setEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [handsFree, setHandsFree] = useState(true);
  const [supported, setSupported] = useState(true);
  const [recSupported, setRecSupported] = useState(true);
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>("male");
  const [personality, setPersonalityState] = useState<VoicePersonality>("chef");

  useEffect(() => {
    setSupported(isVoiceSupported());
    setRecSupported(isRecognitionSupported());
    setEnabled(getVoiceEnabled());
    setChatEnabled(getVoiceChatEnabled());
    setHandsFree(getHandsFreeEnabled());
    setVoiceGenderState(getVoiceGender());
    setPersonalityState(getVoicePersonality());
    const onChange = (e: Event) => setEnabled((e as CustomEvent).detail);
    const onChatChange = (e: Event) => setChatEnabled((e as CustomEvent).detail);
    const onStyleChange = () => {
      setVoiceGenderState(getVoiceGender());
      setPersonalityState(getVoicePersonality());
    };
    window.addEventListener(VOICE_PREF_EVENT, onChange as EventListener);
    window.addEventListener(VOICE_CHAT_PREF_EVENT, onChatChange as EventListener);
    window.addEventListener(VOICE_STYLE_PREF_EVENT, onStyleChange as EventListener);
    return () => {
      window.removeEventListener(VOICE_PREF_EVENT, onChange as EventListener);
      window.removeEventListener(VOICE_CHAT_PREF_EVENT, onChatChange as EventListener);
      window.removeEventListener(VOICE_STYLE_PREF_EVENT, onStyleChange as EventListener);
    };
  }, []);

  function toggle(next: boolean) {
    setEnabled(next);
    setVoiceEnabled(next);
    if (next) speakNow(SAMPLE);
  }
  function toggleChat(next: boolean) {
    setChatEnabled(next);
    setVoiceChatEnabled(next);
  }
  function toggleHandsFree(next: boolean) {
    setHandsFree(next);
    setHandsFreeEnabled(next);
  }
  function chooseGender(next: VoiceGender) {
    setVoiceGenderState(next);
    setVoiceGender(next);
    speakNow(SAMPLE);
  }
  function choosePersonality(next: VoicePersonality) {
    setPersonalityState(next);
    setVoicePersonality(next);
    speakNow(SAMPLE);
  }

  return (
    <Card className="mt-4 p-5 space-y-5">
      {/* Greeting voice */}
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground">
          {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Greeting voice</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Chef Super J greets you when you open the app and adds friendly voice tips.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={toggle}
              disabled={!supported}
              aria-label="Toggle greeting voice"
            />
          </div>
          {!supported && (
            <p className="mt-2 text-xs text-muted-foreground">
              Your browser doesn't support voice playback.
            </p>
          )}
          {supported && enabled && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => speakNow(SAMPLE)}
                className="gap-2"
              >
                <Play className="h-4 w-4" /> Preview voice
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-md border border-border bg-secondary/30 p-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-sm font-semibold">Voice</div>
          <Select value={voiceGender} onValueChange={(value) => chooseGender(value as VoiceGender)}>
            <SelectTrigger aria-label="Choose Chef voice">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="text-sm font-semibold">Personality</div>
          <Select
            value={personality}
            onValueChange={(value) => choosePersonality(value as VoicePersonality)}
          >
            <SelectTrigger aria-label="Choose Chef personality">
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
      </div>

      <div className="h-px bg-border" />

      {/* Voice chat */}
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.6_0.2_30)] to-[oklch(0.5_0.2_290)] text-white shadow-md">
          {chatEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Talk to Chef Super J</div>
              <p className="mt-1 text-sm text-muted-foreground">
                A floating mic appears on every page so you can ask things like "what should I make
                tonight?" or "what's going bad?"
              </p>
            </div>
            <Switch
              checked={chatEnabled}
              onCheckedChange={toggleChat}
              disabled={!recSupported}
              aria-label="Toggle voice chat"
            />
          </div>
          {!recSupported && (
            <p className="mt-2 text-xs text-muted-foreground">
              Voice input isn't supported in this browser. Try Chrome on desktop or mobile.
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Hands-free */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-primary/40 shadow-md">
          <img src="/__l5e/assets-v1/6777100d-858a-4317-9496-734f32083459/chef-super-j.jpeg" alt="Chef Super J" className="h-full w-full object-cover object-top" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Hands-free cooking mode</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask Chef to read a recipe step-by-step. Say "next", "back", "repeat", or "stop" —
                perfect for messy hands.
              </p>
            </div>
            <Switch
              checked={handsFree}
              onCheckedChange={toggleHandsFree}
              aria-label="Toggle hands-free cooking mode"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
