import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Chef Super J's saved ElevenLabs voice only. No browser voice and no stock
// ElevenLabs fallback voice is used for this app.
let savedChefVoiceId: string | null | undefined;

function exactElevenLabsError(action: string, status: number, body: string) {
  return `${action}: ElevenLabs ${status}: ${body || "No error body returned"}`;
}

function compactVoiceId(voiceId: string) {
  return voiceId.length > 8 ? `…${voiceId.slice(-6)}` : "configured";
}

async function findSavedChefVoiceId(apiKey: string): Promise<string | null> {
  if (savedChefVoiceId !== undefined) return savedChefVoiceId;
  console.info("VOICE_API_CALLED", { action: "elevenlabs_voices_lookup" });
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    savedChefVoiceId = null;
    throw new Error(exactElevenLabsError("Saved Chef Super J voice lookup failed", res.status, body));
  }
  console.info("VOICE_API_SUCCESS", { action: "elevenlabs_voices_lookup" });
  const data = (await res.json()) as {
    voices?: Array<{ voice_id?: string; name?: string; category?: string; labels?: Record<string, string> }>;
  };
  const voices = data.voices ?? [];
  const savedByName = voices.find((voice) =>
    /chef\s*super\s*j|super\s*j|chef\s*justin|justin\s*banta|fridge\s*&?\s*cupboard/i.test(
      voice.name || "",
    ),
  );
  const savedCustom = voices.find((voice) => {
    const category = (voice.category || "").toLowerCase();
    const labelText = Object.values(voice.labels || {}).join(" ").toLowerCase();
    return (
      !!voice.voice_id &&
      (category === "cloned" ||
        category === "professional" ||
        category === "generated" ||
        /cloned|custom|professional|instant voice clone|voice clone/.test(labelText))
    );
  });
  const saved = savedByName ?? savedCustom;
  savedChefVoiceId = saved?.voice_id || null;
  if (savedChefVoiceId) console.info(`[tts] saved Chef Super J voice connected: ${saved?.name}`);
  else console.warn("[tts] no saved Chef Super J voice found");
  return savedChefVoiceId;
}

async function resolveVoiceId(gender: "male" | "female", apiKey: string): Promise<{ voiceId: string; source: string }> {
  const source = gender === "male"
    ? process.env.CHEF_VOICE_ID_MALE
      ? "CHEF_VOICE_ID_MALE"
      : process.env.CHEF_SUPER_J_VOICE_ID
        ? "CHEF_SUPER_J_VOICE_ID"
        : process.env.ELEVENLABS_CHEF_SUPER_J_VOICE_ID
          ? "ELEVENLABS_CHEF_SUPER_J_VOICE_ID"
          : null
    : process.env.CHEF_VOICE_ID_FEMALE
      ? "CHEF_VOICE_ID_FEMALE"
      : null;
  const cloned = source ? process.env[source] : null;
  if (cloned && cloned.trim() && source) return { voiceId: cloned.trim(), source };
  const saved = await findSavedChefVoiceId(apiKey);
  if (saved) return { voiceId: saved, source: "ElevenLabs saved voice lookup" };
  throw new Error(
    "Saved Chef Super J ElevenLabs voice ID is missing. Set CHEF_VOICE_ID_MALE (or CHEF_SUPER_J_VOICE_ID / ELEVENLABS_CHEF_SUPER_J_VOICE_ID) or grant the ElevenLabs key voices_read permission so the saved voice can be found.",
  );
}
// eleven_flash_v2_5 = ultra-low-latency real-time model (~75ms). Uses the
// same saved Chef Super J voice — just responds faster than multilingual_v2.
const MODEL_ID_CHEF_SUPER_J = "eleven_flash_v2_5";

const Input = z.object({
  text: z.string().min(1).max(2000),
  gender: z.enum(["male", "female"]).default("male"),
  personality: z.enum(["calm", "energetic", "friendly", "chef"]).default("chef"),
});

function voiceSettings(personality: z.infer<typeof Input>["personality"]) {
  // Warm, grounded, slightly deeper male voice — calm, mellow, real-human
  // feel. Higher stability + lower style keeps it from getting animated or
  // shouty; slower speed makes it sound thoughtful, not rushed.
  // Warmer, slower, slightly deeper delivery — closer to a real person than
  // a broadcaster. Higher stability keeps the pitch grounded; lower style
  // removes the "announcer" edge.
  // ~12% faster than the previous settings while keeping the same warm,
  // grounded male voice. Slightly lower stability keeps it conversational
  // at the higher speed without sounding rushed.
  const settings = {
    calm:      { speed: 0.90, stability: 0.90, style: 0.04 },
    friendly:  { speed: 0.96, stability: 0.78, style: 0.14 },
    energetic: { speed: 1.05, stability: 0.64, style: 0.28 },
    chef:      { speed: 0.95, stability: 0.84, style: 0.12 },
  }[personality];
  return {
    ...settings,
    similarity_boost: 0.92,
    use_speaker_boost: true,
  };
}

// Strip markdown and shorten long pauses so responses feel snappier and
// more conversational — no long gaps between sentences.
function prepareForSpeech(text: string): string {
  return text
    .replace(/[*_#`]/g, "")
    .replace(/\s+—\s+/g, ", ")
    .replace(/\.{2,}/g, ",")
    .replace(/,\s*,+/g, ",")
    // Shorten sentence-ending pauses: ". " → ", " keeps a brief beat but
    // avoids the long full-stop pause ElevenLabs otherwise inserts.
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1 ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Public TTS endpoint — Chef Super J greets every visitor (signed in or not).
export const synthesizeChefVoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      const error = "ELEVENLABS_API_KEY is not configured";
      console.error(error);
      return { audio: null, mime: "audio/mpeg", error };
    }

    let resolved: { voiceId: string; source: string };
    try {
      resolved = await resolveVoiceId(data.gender, apiKey);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(error);
      return { audio: null, mime: "audio/mpeg", error };
    }
    console.info("VOICE_API_CALLED", {
      action: "elevenlabs_text_to_speech",
      voiceId: compactVoiceId(resolved.voiceId),
      source: resolved.source,
    });
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolved.voiceId}?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: prepareForSpeech(data.text),
          model_id: MODEL_ID_CHEF_SUPER_J,
          voice_settings: voiceSettings(data.personality),
          optimize_streaming_latency: 3,
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const error = exactElevenLabsError("Chef Super J text-to-speech failed", res.status, errText);
      console.error(error);
      return { audio: null, mime: "audio/mpeg", error };
    }
    console.info("VOICE_API_SUCCESS", {
      action: "elevenlabs_text_to_speech",
      voiceId: compactVoiceId(resolved.voiceId),
      source: resolved.source,
    });

    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return { audio: base64, mime: "audio/mpeg", error: null };
  });
