import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { originalChefVoiceId, CHEF_VOICE_MODEL, CHEF_VOICE_SETTINGS } from "./chef-voice-settings";
import { WELCOME_GREETING, WELCOME_VOICE_SETTINGS } from "./welcome-voice";

// The original custom voice only; never substitute a library or browser voice.
function exactElevenLabsError(action: string, status: number, body: string) {
  return `${action}: ElevenLabs ${status}: ${body || "No error body returned"}`;
}
function compactVoiceId(voiceId: string) {
  return voiceId.length > 8 ? `…${voiceId.slice(-6)}` : "configured";
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
  return text.trim() === WELCOME_GREETING ? WELCOME_VOICE_SETTINGS : CHEF_VOICE_SETTINGS;
}

// Strip markdown but KEEP natural sentence punctuation so Chef Super J
// breathes between thoughts instead of rushing through the reply.
function prepareForSpeech(text: string): string {
  // Preserve sentence intent; never force a falling or rising greeting ending.
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
      resolved = { voiceId: originalChefVoiceId(process.env['CHEF_VOICE_ID_MALE']), source: "CHEF_VOICE_ID_MALE" };
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
    const settings = voiceSettings(data.personality, data.text);
    const cacheKey = [MODEL_ID_CHEF_SUPER_J, resolved.voiceId, JSON.stringify(settings), preparedText].join("|");
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
        language_code: "en",
        voice_settings: settings,
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
