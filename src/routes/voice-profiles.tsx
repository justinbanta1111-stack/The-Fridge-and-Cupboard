import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Mic, Trash2, RefreshCw, Users, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { startVoicePrint } from "@/lib/voice-print";
import {
  listSpeakerProfiles,
  createSpeakerProfile,
  renameSpeakerProfile,
  deleteSpeakerProfile,
  addSpeakerSample,
  updateSpeakerDetails,
  hasSpeakerConsent,
  setSpeakerConsent,
  SPEAKER_PROFILES_EVENT,
  type SpeakerProfile,
  type SpeakerExperience,
} from "@/lib/speaker-profiles";

export const Route = createFileRoute("/voice-profiles")({
  head: () => ({
    meta: [
      { title: "Voice Profiles — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Let everyone in your kitchen introduce themselves by name so Chef Super J can tell voices apart and remember each person's dietary needs.",
      },
      { property: "og:title", content: "Voice Profiles — The Fridge and Cupboard" },
      {
        property: "og:description",
        content:
          "Optional voice profiles so Chef Super J knows who's speaking and keeps each person's dietary needs separate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoiceProfilesPage,
});

const RECORD_MS = 6000;
const PHRASE = "Hi Chef, it's me. I'm cooking in the kitchen today.";

const EXPERIENCE_OPTIONS: { key: SpeakerExperience; label: string }[] = [
  { key: "unknown", label: "Not saying" },
  { key: "beginner", label: "Complete beginner" },
  { key: "some", label: "Some experience" },
  { key: "confident", label: "Confident cook" },
];

function VoiceProfilesPage() {
  const [consent, setConsent] = useState(false);
  const [profiles, setProfiles] = useState<SpeakerProfile[]>([]);
  const [name, setName] = useState("");
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [retrainId, setRetrainId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      setProfiles(listSpeakerProfiles());
      setConsent(hasSpeakerConsent());
    };
    refresh();
    window.addEventListener(SPEAKER_PROFILES_EVENT, refresh);
    return () => window.removeEventListener(SPEAKER_PROFILES_EVENT, refresh);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  async function record(): Promise<number[] | null> {
    const capture = await startVoicePrint();
    if (!capture) {
      toast.error("We couldn't reach the microphone. Check permission and try again.");
      return null;
    }
    setRecording(true);
    setCountdown(Math.round(RECORD_MS / 1000));
    timerRef.current = window.setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    await new Promise((r) => setTimeout(r, RECORD_MS));
    if (timerRef.current) window.clearInterval(timerRef.current);
    const result = capture.stop();
    setRecording(false);
    setCountdown(0);
    if (!result.vector) {
      toast.error("We didn't hear enough. Please read the sentence out loud and try again.");
      return null;
    }
    return result.vector;
  }

  async function handleEnroll() {
    if (!name.trim()) {
      toast.error("Add your name first.");
      return;
    }
    const vector = await record();
    if (!vector) return;
    createSpeakerProfile(name.trim(), vector);
    setName("");
    toast.success("Voice profile saved on this device.");
  }

  async function handleRetrain(id: string) {
    setRetrainId(id);
    const vector = await record();
    setRetrainId(null);
    if (!vector) return;
    addSpeakerSample(id, vector);
    toast.success("Thanks — that voice is easier to recognize now.");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Voice profiles</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cooking with other people? Each person can introduce themselves by name so Chef Super J
          knows who's talking and keeps everyone's dietary needs separate. This is completely
          optional, and everything stays on this device.
        </p>

        <Card className="mt-5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Allow voice profiles
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Turn this on to let Chef Super J tell enrolled voices apart. No recordings are
                saved or uploaded — only a short numeric signature, stored on this device. Chef
                never guesses from accent, tone or gender; if he isn't sure, he simply asks
                "Who's speaking right now?"
              </p>
            </div>
            <Switch
              checked={consent}
              onCheckedChange={(v) => {
                setSpeakerConsent(v);
                setConsent(v);
              }}
              aria-label="Allow voice profiles"
            />
          </div>
        </Card>

        {consent && (
          <Card className="mt-4 p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-primary" />
              Add a person
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name (e.g. Sarah)"
                maxLength={40}
                className="sm:max-w-xs"
              />
              <Button onClick={handleEnroll} disabled={recording} className="gap-2">
                <Mic className="h-4 w-4" />
                {recording && !retrainId ? `Listening… ${countdown}s` : "Record my voice"}
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              When you press record, say this out loud in your normal voice for six seconds:
              <span className="mt-1 block font-medium text-foreground">"{PHRASE}"</span>
            </p>
          </Card>
        )}

        <div className="mt-6 space-y-4">
          {profiles.length === 0 && (
            <p className="text-sm text-muted-foreground">No voice profiles yet.</p>
          )}
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              busy={recording && retrainId === p.id}
              countdown={countdown}
              onRetrain={() => handleRetrain(p.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function ProfileCard({
  profile,
  busy,
  countdown,
  onRetrain,
}: {
  profile: SpeakerProfile;
  busy: boolean;
  countdown: number;
  onRetrain: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [restrictions, setRestrictions] = useState(profile.restrictions.join(", "));
  const [likes, setLikes] = useState(profile.likes.join(", "));
  const [dislikes, setDislikes] = useState(profile.dislikes.join(", "));
  const [notes, setNotes] = useState(profile.notes);

  const split = (v: string) =>
    v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => renameSpeakerProfile(profile.id, name)}
            className="h-9 w-44 font-semibold"
            maxLength={40}
          />
          <Badge variant="secondary">{profile.vectors.length} sample{profile.vectors.length > 1 ? "s" : ""}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRetrain} disabled={busy} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            {busy ? `Listening… ${countdown}s` : "Retrain"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-destructive"
            onClick={() => {
              deleteSpeakerProfile(profile.id);
              toast.success(`${profile.name}'s voice profile was deleted.`);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Allergies & must-avoid foods"
          value={restrictions}
          onChange={setRestrictions}
          onSave={() => updateSpeakerDetails(profile.id, { restrictions: split(restrictions) })}
          placeholder="gluten, dairy"
        />
        <Field
          label="Loves"
          value={likes}
          onChange={setLikes}
          onSave={() => updateSpeakerDetails(profile.id, { likes: split(likes) })}
          placeholder="spicy food, salmon"
        />
        <Field
          label="Not a fan of"
          value={dislikes}
          onChange={setDislikes}
          onSave={() => updateSpeakerDetails(profile.id, { dislikes: split(dislikes) })}
          placeholder="mushrooms"
        />
        <Field
          label="Anything else Chef should know"
          value={notes}
          onChange={setNotes}
          onSave={() => updateSpeakerDetails(profile.id, { notes: notes.slice(0, 200) })}
          placeholder="learning to bake bread"
        />
      </div>

      <div className="mt-4">
        <div className="text-xs font-medium text-muted-foreground">Cooking experience</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={profile.experience === opt.key ? "default" : "outline"}
              onClick={() => updateSpeakerDetails(profile.id, { experience: opt.key })}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  onSave,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        className="mt-1"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
      />
    </label>
  );
}
