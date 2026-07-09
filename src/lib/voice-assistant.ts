// Lightweight voice assistant. Voice output is ElevenLabs Chef Super J only.

import { synthesizeChefVoice } from "@/lib/tts.functions";

const PREF_KEY = "tfc.voice.enabled.v1";
const GREETED_KEY = "tfc.voice.greeted.v1"; // sessionStorage: once per app open
const CHAT_PREF_KEY = "tfc.voice.chat.enabled.v1";
const HANDSFREE_PREF_KEY = "tfc.voice.handsfree.enabled.v1";
const VOICE_GENDER_KEY = "tfc.voice.gender.v1";
const VOICE_PERSONALITY_KEY = "tfc.voice.personality.v1";

export const VOICE_PREF_EVENT = "tfc:voice-pref-change";
export const VOICE_CHAT_PREF_EVENT = "tfc:voice-chat-pref-change";
export const VOICE_STYLE_PREF_EVENT = "tfc:voice-style-pref-change";

export type VoiceGender = "male" | "female";
export type VoicePersonality = "calm" | "energetic" | "friendly" | "chef";
type SpeakOptions = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (reason?: string) => void;
  /** Playback volume 0..1 (default 1). Use lower values for a mellower greeting. */
  volume?: number;
  /** Override the saved personality preference for a single utterance. */
  personalityOverride?: VoicePersonality;
  /** Override playback rate (default 1.0). Use 0.9 for slower/warmer delivery. */
  rate?: number;
};

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQQAAAAAAA==";
const AUDIO_BLOCKED_MESSAGE = "Audio playback blocked. Tap to play Chef Super J audio.";

let outputAudio: HTMLAudioElement | null = null;
let voiceAudioUnlocked = false;
let unlockInFlight: Promise<boolean> | null = null;

export function isVoiceSupported(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

export function getVoiceEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(PREF_KEY);
  if (v === null) return true;
  return v === "1";
}

export function setVoiceEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_KEY, enabled ? "1" : "0");
  if (!enabled) stopAllAudio();
  window.dispatchEvent(new CustomEvent(VOICE_PREF_EVENT, { detail: enabled }));
}

export function getVoiceChatEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(CHAT_PREF_KEY);
  if (v === null) return true;
  return v === "1";
}

export function setVoiceChatEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_PREF_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(VOICE_CHAT_PREF_EVENT, { detail: enabled }));
}

export function getHandsFreeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(HANDSFREE_PREF_KEY);
  if (v === null) return true;
  return v === "1";
}

export function setHandsFreeEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HANDSFREE_PREF_KEY, enabled ? "1" : "0");
}

export function getVoiceGender(): VoiceGender {
  if (typeof window === "undefined") return "male";
  const v = localStorage.getItem(VOICE_GENDER_KEY);
  return v === "female" ? "female" : "male";
}

export function setVoiceGender(gender: VoiceGender) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_GENDER_KEY, gender);
  window.dispatchEvent(new CustomEvent(VOICE_STYLE_PREF_EVENT, { detail: getVoiceStyle() }));
}

export function getVoicePersonality(): VoicePersonality {
  if (typeof window === "undefined") return "chef";
  const v = localStorage.getItem(VOICE_PERSONALITY_KEY);
  return v === "calm" || v === "energetic" || v === "friendly" || v === "chef" ? v : "chef";
}

export function setVoicePersonality(personality: VoicePersonality) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_PERSONALITY_KEY, personality);
  window.dispatchEvent(new CustomEvent(VOICE_STYLE_PREF_EVENT, { detail: getVoiceStyle() }));
}

export function getVoiceStyle() {
  return { gender: getVoiceGender(), personality: getVoicePersonality() };
}

export function hasGreetedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(GREETED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markGreeted() {
  try {
    sessionStorage.setItem(GREETED_KEY, "1");
  } catch {
    // Ignore locked-down storage.
  }
}

// ---------- ElevenLabs playback ----------

let currentAudio: HTMLAudioElement | null = null;
let playbackSeq = 0;
// Cache base64 audio per text to avoid re-calling the API for repeated phrases
// (greeting, "next", "back", etc.). LRU-ish cap via Map insertion order.
const audioCache = new Map<string, string>();
const MAX_CACHE = 50;

export function stopAllAudio() {
  playbackSeq += 1;
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
    } catch {
      // Ignore interrupted media cleanup.
    }
    currentAudio = null;
  }
}

export function isMobileVoiceEnvironment(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Android|Mobile|Silk|Mobi/i.test(ua)) return true;
  return (
    typeof (navigator as any).maxTouchPoints === "number" &&
    (navigator as any).maxTouchPoints > 1 &&
    /Macintosh/i.test(ua)
  );
}

function audioDebugState(audio?: HTMLAudioElement | null, extra: Record<string, unknown> = {}) {
  return {
    mobile: isMobileVoiceEnvironment(),
    unlocked: voiceAudioUnlocked,
    readyState: audio?.readyState,
    networkState: audio?.networkState,
    paused: audio?.paused,
    muted: audio?.muted,
    volume: audio?.volume,
    playbackRate: audio?.playbackRate,
    srcType: audio?.src
      ? audio.src.startsWith("data:audio")
        ? "data-audio"
        : audio.src.startsWith("blob:")
          ? "blob"
          : "url"
      : "none",
    mediaError: audio?.error
      ? { code: audio.error.code, message: audio.error.message || "media error" }
      : null,
    ...extra,
  };
}

function reportVoiceInfo(kind: string, message: string, audio?: HTMLAudioElement | null, extra?: Record<string, unknown>) {
  if (isMobileVoiceEnvironment()) {
    console.info(`[voice] ${kind}: ${message}`, audioDebugState(audio, extra));
  }
}

function reportVoiceFailure(kind: string, message: string, err?: unknown, audio?: HTMLAudioElement | null) {
  console.error(`[voice] ${kind}: ${message}`, err ?? "", audioDebugState(audio));
}

export function getOutputAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!outputAudio) {
    outputAudio = new Audio();
    outputAudio.preload = "auto";
    outputAudio.setAttribute("playsinline", "");
    (outputAudio as any).playsInline = true;
  }
  return outputAudio;
}

export function isVoiceAudioUnlocked(): boolean {
  return voiceAudioUnlocked;
}

export function markVoiceAudioUnlocked() {
  voiceAudioUnlocked = true;
}

export async function unlockVoiceAudio(): Promise<boolean> {
  if (voiceAudioUnlocked) return true;
  if (unlockInFlight) return unlockInFlight;
  unlockInFlight = (async () => {
    const audio = getOutputAudio();
    if (!audio) return false;
    try {
      audio.muted = false;
      audio.volume = 1;
      audio.src = SILENT_WAV;
      const unlockSrc = audio.src;
      audio.load();
      reportVoiceInfo("mobile audio unlock", "calling silent audio.play() from user gesture", audio);
      await audio.play();
      reportVoiceInfo("mobile audio unlock", "silent audio.play() resolved", audio);
      setTimeout(() => {
        try {
          if (audio.src !== unlockSrc) return;
          audio.pause();
          audio.currentTime = 0;
        } catch {
          // Ignore tiny unlock cleanup failures.
        }
      }, 80);
      voiceAudioUnlocked = true;
      return true;
    } catch (err) {
      voiceAudioUnlocked = false;
      reportVoiceFailure("audio playback blocked", AUDIO_BLOCKED_MESSAGE, err, audio);
      return false;
    } finally {
      unlockInFlight = null;
    }
  })();
  return unlockInFlight;
}

export async function playAudioUrl(url: string, options: SpeakOptions = {}): Promise<boolean> {
  const audio = getOutputAudio();
  if (!audio) {
    const reason = "This browser cannot play Chef Super J audio.";
      reportVoiceFailure("audio playback blocked", reason);
    options.onError?.(reason);
    return false;
  }

  stopAllAudio();
  const seq = ++playbackSeq;
  currentAudio = audio;
  audio.preload = "auto";
  audio.muted = false;
  audio.volume = 1;
  audio.src = url;

  const done = new Promise<boolean>((resolve) => {
    audio.onplaying = () => {
      voiceAudioUnlocked = true;
      options.onStart?.();
    };
    audio.onended = () => {
      if (seq !== playbackSeq) return resolve(true);
      if (currentAudio === audio) currentAudio = null;
      options.onEnd?.();
      resolve(true);
    };
    audio.onerror = () => {
      const reason = "Chef Super J audio could not load or play.";
      if (seq !== playbackSeq) return resolve(true);
      if (currentAudio === audio) currentAudio = null;
      reportVoiceFailure("audio playback blocked", reason, audio.error ?? undefined, audio);
      options.onError?.(reason);
      resolve(false);
    };
  });

  try {
    reportVoiceInfo("mobile audio playback", "calling audio.play() for URL audio", audio);
    await audio.play();
    voiceAudioUnlocked = true;
    reportVoiceInfo("mobile audio playback", "audio.play() resolved for URL audio", audio);
    return await done;
  } catch (err) {
    const reason = AUDIO_BLOCKED_MESSAGE;
    if (currentAudio === audio) currentAudio = null;
    reportVoiceFailure("audio playback blocked", reason, err, audio);
    options.onError?.(reason);
    return false;
  }
}

function cacheKey(text: string, options: Pick<SpeakOptions, "personalityOverride"> = {}) {
  const { gender, personality } = getVoiceStyle();
  return `${gender}:${options.personalityOverride ?? personality}:${text}`;
}

async function getElevenLabsAudio(text: string, options: SpeakOptions = {}): Promise<string | null> {
  const { gender, personality: savedPersonality } = getVoiceStyle();
  const personality = options.personalityOverride ?? savedPersonality;
  const key = cacheKey(text, options);
  const cached = audioCache.get(key);
  if (cached) {
    reportVoiceInfo("text-to-speech", "ElevenLabs audio ready from cache", getOutputAudio(), {
      bytesApprox: Math.round((cached.length * 3) / 4),
      cached: true,
    });
    return cached;
  }

  reportVoiceInfo("text-to-speech", "requesting ElevenLabs audio", getOutputAudio(), {
    textLength: text.length,
    personality,
  });
  const res = await synthesizeChefVoice({ data: { text, gender, personality } });
  if (!res.audio) {
    reportVoiceFailure("text-to-speech failed", "ElevenLabs returned no Chef Super J audio.");
    return null;
  }
  audioCache.set(key, res.audio);
  if (audioCache.size > MAX_CACHE) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) audioCache.delete(firstKey);
  }
  reportVoiceInfo("text-to-speech", "ElevenLabs audio loaded", getOutputAudio(), {
    bytesApprox: Math.round((res.audio.length * 3) / 4),
    cached: false,
  });
  return res.audio;
}

export function isSpeechPrepared(text: string, options: Pick<SpeakOptions, "personalityOverride"> = {}): boolean {
  return audioCache.has(cacheKey(text, options));
}

export async function prepareSpeech(text: string, options: SpeakOptions = {}): Promise<boolean> {
  try {
    return !!(await getElevenLabsAudio(text, options));
  } catch (err) {
    reportVoiceFailure("text-to-speech failed", "ElevenLabs audio preloading failed.", err);
    return false;
  }
}

async function playElevenLabs(text: string, options: SpeakOptions = {}): Promise<boolean> {
  try {
    // Critical for iPhone/Safari: when audio has been preloaded, do not await
    // before calling audio.play(); keep play() in the same user gesture.
    let b64: string | null | undefined = audioCache.get(cacheKey(text, options));
    if (b64) {
      reportVoiceInfo("text-to-speech", "ElevenLabs audio ready from cache", getOutputAudio(), {
        bytesApprox: Math.round((b64.length * 3) / 4),
        cached: true,
      });
    } else {
      b64 = await getElevenLabsAudio(text, options);
    }
    if (!b64) return false;
    stopAllAudio();
    const seq = ++playbackSeq;
    const audio = getOutputAudio();
    if (!audio) {
      reportVoiceFailure("text-to-speech failed", "HTML audio output is unavailable.");
      return false;
    }
    currentAudio = audio;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = Math.max(0, Math.min(1, options.volume ?? 1));
    audio.src = `data:audio/mpeg;base64,${b64}`;
    audio.playbackRate = options.rate ?? 1.0;
    const done = new Promise<boolean>((resolve) => {
      audio.onplaying = () => {
        voiceAudioUnlocked = true;
        reportVoiceInfo("mobile audio playback", "audio element fired onplaying", audio);
        options.onStart?.();
      };
      audio.onended = () => {
        if (seq !== playbackSeq) return resolve(true);
        if (currentAudio === audio) currentAudio = null;
        options.onEnd?.();
        resolve(true);
      };
      audio.onerror = () => {
        if (seq !== playbackSeq) return resolve(true);
        if (currentAudio === audio) currentAudio = null;
        const reason = "Chef Super J text-to-speech audio could not play.";
        reportVoiceFailure("text-to-speech failed", reason, audio.error ?? undefined, audio);
        options.onError?.(reason);
        resolve(false);
      };
    });
    try {
      audio.load();
      reportVoiceInfo("mobile audio playback", "calling audio.play() for ElevenLabs audio", audio, {
        bytesApprox: Math.round((b64.length * 3) / 4),
        preparedBeforeTap: isSpeechPrepared(text, options),
      });
      await audio.play();
      voiceAudioUnlocked = true;
      reportVoiceInfo("mobile audio playback", "audio.play() resolved for ElevenLabs audio", audio);
    } catch (err) {
      const reason = AUDIO_BLOCKED_MESSAGE;
      if (currentAudio === audio) currentAudio = null;
      reportVoiceFailure("audio playback blocked", reason, err, audio);
      options.onError?.(reason);
      return false;
    }
    return await done;
  } catch (err) {
    reportVoiceFailure("text-to-speech failed", "Saved Chef Super J voice failed.", err);
    return false;
  }
}

// ---------- Public API ----------

export function speak(text: string, options: SpeakOptions = {}): boolean {
  if (!isVoiceSupported() || !getVoiceEnabled()) {
    options.onError?.("Voice output is unavailable or muted.");
    return false;
  }
  void playElevenLabs(text, options).then((ok) => {
    if (ok) return;
    options.onError?.("Chef Super J voice failed to play.");
    options.onEnd?.();
  });
  return true;
}

/** Bypass the enabled flag — used by the "Preview voice" button. */
export function speakNow(text: string, options: SpeakOptions = {}): boolean {
  if (!isVoiceSupported()) {
    options.onError?.("Voice output is unavailable in this browser.");
    return false;
  }
  void playElevenLabs(text, options).then((ok) => {
    if (!ok) {
      options.onError?.("Chef Super J voice failed to play.");
      options.onEnd?.();
    }
  });
  return true;
}

export function whenVoicesReady(timeoutMs = 2500): Promise<void> {
  void timeoutMs;
  return Promise.resolve();
}

/** Direct tap event from the visible Tap for Voice button. */
export const FRIDGE_INTRO_VOICE_TAP_EVENT = "tfc:fridge-intro-voice-tap";
