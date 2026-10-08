import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CHEF_VOICE_MODEL, CHEF_VOICE_SETTINGS } from "./chef-voice-settings";
import { WELCOME_GREETING } from "./welcome-voice";

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
// Keep the existing low-latency model and licensed voice identity.
const MODEL_ID_CHEF_SUPER_J = CHEF_VOICE_MODEL;

type CachedSpeech = { audio: string; mime: "audio/mpeg"; cachedAt: number };
const speechCache = new Map<string, CachedSpeech>();
const SPEECH_CACHE_MAX = 40;
const SPEECH_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

function getCachedSpeech(key: string): CachedSpeech | null {
  const cached = speechCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > SPEECH_CACHE_TTL_MS) {
    speechCache.delete(key);
    return null;
  }
  speechCache.delete(key);
  speechCache.set(key, cached);
  return cached;
}

function setCachedSpeech(key: string, audio: string) {
  speechCache.set(key, { audio, mime: "audio/mpeg", cachedAt: Date.now() });
  while (speechCache.size > SPEECH_CACHE_MAX) {
    const first = speechCache.keys().next().value;
    if (!first) break;
    speechCache.delete(first);
  }
}

const Input = z.object({
  text: z.string().min(1).max(2000),
  gender: z.enum(["male", "female"]).default("male"),
  personality: z.enum(["calm", "energetic", "friendly", "chef"]).default("chef"),
});

function voiceSettings(personality: z.infer<typeof Input>["personality"], text: string) {
  void personality;
  void text;
  return CHEF_VOICE_SETTINGS;
}

// Strip markdown but KEEP natural sentence punctuation so Chef Super J
// breathes between thoughts instead of rushing through the reply.
function prepareForSpeech(text: string): string {
  // A declarative stop gently encourages a falling close on "today"; it is
  // synthesis punctuation only, not a change to the displayed greeting.
  if (text.trim() === WELCOME_GREETING) text = text.trim().replace(/\?$/, ".");
  return text
    .replace(/[*_#`]/g, "")
    // Keep paragraph transitions audible instead of flattening every line.
    .replace(/([^.!?])\s*\n{2,}\s*/g, "$1. ")
    .replace(/\s*\n\s*/g, ", ")
    .replace(/\s+—\s+/g, ", ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s*:\s*/g, ": ")
    .replace(/\.{2,}/g, ".")
    .replace(/,\s*,+/g, ",")
    .replace(/([.!?])(?=[A-Z])/g, "$1 ")
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
      // Single licensed custom voice for the whole app — never a picked alternate.
      resolved = await resolveVoiceId("male", apiKey);
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
    const preparedText = prepareForSpeech(data.text);
    const cacheKey = [MODEL_ID_CHEF_SUPER_J, resolved.voiceId, JSON.stringify(CHEF_VOICE_SETTINGS), preparedText].join("|");
    const cached = getCachedSpeech(cacheKey);
    if (cached) {
      console.info("VOICE_API_SUCCESS", {
        action: "elevenlabs_text_to_speech_cache",
        voiceId: compactVoiceId(resolved.voiceId),
        source: resolved.source,
      });
      return { audio: cached.audio, mime: cached.mime, error: null };
    }

    const requestUrl = `https://api.elevenlabs.io/v1/text-to-speech/${resolved.voiceId}?output_format=mp3_22050_32`;
    const requestInit: RequestInit = {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: preparedText,
        model_id: MODEL_ID_CHEF_SUPER_J,
        voice_settings: voiceSettings(data.personality, preparedText),
        // Lower latency optimization keeps prosody natural and consistent.
        optimize_streaming_latency: 2,
      }),
    };

    let res: Response;
    try {
      // Let the provider finish one request. Aborting and immediately retrying
      // can leave two paid synthesis jobs running for the same utterance.
      res = await fetch(requestUrl, requestInit);
    } catch (err) {
      const error = `Chef Super J text-to-speech request failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(error);
      return { audio: null, mime: "audio/mpeg", error };
    }

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
    setCachedSpeech(cacheKey, base64);
    return { audio: base64, mime: "audio/mpeg", error: null };
  });
