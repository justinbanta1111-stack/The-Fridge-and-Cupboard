// Lightweight voice assistant. Voice output is ElevenLabs Chef Super J only.

import { synthesizeChefVoice } from "@/lib/tts.functions";
import { disarmAudioGate } from "@/lib/audio-gate";

const PREF_KEY = "tfc.voice.enabled.v1";
const GREETED_KEY = "tfc.voice.greeted.v1"; // sessionStorage: once per app open
const CHAT_PREF_KEY = "tfc.voice.chat.enabled.v1";
const HANDSFREE_PREF_KEY = "tfc.voice.handsfree.enabled.v1";
const RATE_KEY = "tfc.voice.rate.v1";
const PAUSE_KEY = "tfc.voice.pause.v1";

export const VOICE_PREF_EVENT = "tfc:voice-pref-change";
export const VOICE_CHAT_PREF_EVENT = "tfc:voice-chat-pref-change";
export const VOICE_STYLE_PREF_EVENT = "tfc:voice-style-pref-change";
export const VOICE_TIMING_EVENT = "tfc:voice-timing-change";

// Natural conversational speed. Anything below ~1.0 made the voice sound
// drawn out and sluggish, so playback stays at real-time everywhere.
export const VOICE_RATE_MIN = 1.0;
export const VOICE_RATE_MAX = 1.0;
export const VOICE_RATE_DEFAULT = 1.0;
export const VOICE_PAUSE_MIN = 0;
export const VOICE_PAUSE_MAX = 1500;
export const VOICE_PAUSE_DEFAULT = 220;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Playback speed multiplier for Chef Super J's voice. */
export function getVoiceRate(): number {
  return VOICE_RATE_DEFAULT;
}

export function setVoiceRate(rate: number) {
  if (typeof window === "undefined") return;
  void rate;
  const v = VOICE_RATE_DEFAULT;
  try {
    localStorage.setItem(RATE_KEY, String(v));
  } catch {}
  window.dispatchEvent(new CustomEvent(VOICE_TIMING_EVENT, { detail: { rate: v } }));
}

/** Extra silence between spoken sentences, in milliseconds. */
export function getVoicePauseMs(): number {
  return VOICE_PAUSE_DEFAULT;
}

export function setVoicePauseMs(ms: number) {
  if (typeof window === "undefined") return;
  void ms;
  const v = VOICE_PAUSE_DEFAULT;
  try {
    localStorage.setItem(PAUSE_KEY, String(v));
  } catch {}
  window.dispatchEvent(new CustomEvent(VOICE_TIMING_EVENT, { detail: { pauseMs: v } }));
}

export function resetVoiceTiming() {
  setVoiceRate(VOICE_RATE_DEFAULT);
  setVoicePauseMs(VOICE_PAUSE_DEFAULT);
}


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

// Sound is ON by default every time the app opens. Muting via the speaker
// button lasts only until the app is opened again — the flag is cleared once
// per document load below, so a fresh open (or reload) always starts unmuted
// and only an actual tap on the speaker button turns the voice off.
if (typeof window !== "undefined") {
  try {
    sessionStorage.removeItem(PREF_KEY);
    localStorage.removeItem(PREF_KEY);
  } catch {}
}

export function getVoiceEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = sessionStorage.getItem(PREF_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}


export function setVoiceEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREF_KEY, enabled ? "1" : "0");
    localStorage.removeItem(PREF_KEY); // clear any old persisted mute
  } catch {}
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

// The app uses ONE licensed custom ElevenLabs voice everywhere. There is no
// voice picker: these are locked so no stored preference can change the voice.
export function getVoiceGender(): VoiceGender {
  return "male";
}

export function setVoiceGender(_gender: VoiceGender) {
  /* locked: the custom Chef Super J voice is the only voice */
}

export function getVoicePersonality(): VoicePersonality {
  return "calm";
}

export function setVoicePersonality(_personality: VoicePersonality) {
  /* locked: mellow, warm, relaxed delivery everywhere */
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
let playbackClaimed = false;
// Every Audio element used for TTS playback (singleton + any per-mobile
// blob audios created elsewhere) is registered here so stopAllAudio()
// can truly stop every voice source and prevent two voices at once.
const activeAudios = new Set<HTMLAudioElement>();
// Cache base64 audio per text to avoid re-calling the API for repeated phrases
// (greeting, "next", "back", etc.). LRU-ish cap via Map insertion order.
const audioCache = new Map<string, string>();
const MAX_CACHE = 50;

export function registerVoiceAudio(audio: HTMLAudioElement) {
  activeAudios.add(audio);
}

export function unregisterVoiceAudio(audio: HTMLAudioElement) {
  activeAudios.delete(audio);
}

/**
 * True while Chef Super J is actually speaking. Read-only helper used by the
 * ambient background music so it can duck under the voice.
 */
export function isVoiceSpeaking(): boolean {
  const playing = (a: HTMLAudioElement | null) =>
    !!a && !a.paused && !a.ended && a.currentTime >= 0 && !!a.src;
  if (playing(currentAudio)) return true;
  for (const a of activeAudios) if (playing(a)) return true;
  try {
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return true;
  } catch {
    // Ignore speechSynthesis access failures.
  }
  return false;
}

/** Briefly lower Chef's voice so the user can talk over him naturally. */
export function duckVoiceOutput() {
  try {
    const el = getOutputAudio();
    if (el) el.volume = 0.18;
  } catch {
    // ignore
  }
}

export function stopAllAudio() {
  playbackSeq += 1;
  playbackClaimed = false;
  disarmAudioGate();
  // Cancel any browser speech-synthesis utterance that might have been
  // triggered elsewhere — enforces single-voice (ElevenLabs only) policy.
  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore SpeechSynthesis cleanup failures.
  }
  const toStop = new Set<HTMLAudioElement>(activeAudios);
  if (currentAudio) toStop.add(currentAudio);
  for (const audio of toStop) {
    const onEnded = audio.onended;
    try {
      audio.pause();
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      audio.src = "";
      audio.load();
    } catch {
      // Ignore interrupted media cleanup.
    }
    activeAudios.delete(audio);
    // Resolve any playback owner waiting for completion. Calling the captured
    // handler after detaching it prevents stale media events and double loops.
    try {
      onEnded?.call(audio, new Event("ended"));
    } catch {
      // Ignore owner cleanup failures.
    }
  }
  currentAudio = null;
}

/** Reserve the one Chef output channel and invalidate every older caller. */
export function claimVoicePlayback(): number {
  stopAllAudio();
  playbackClaimed = true;
  playbackSeq += 1;
  return playbackSeq;
}

export function isVoicePlaybackClaimCurrent(claim: number): boolean {
  return playbackClaimed && claim === playbackSeq;
}

export function releaseVoicePlaybackClaim(claim: number): void {
  if (claim === playbackSeq) playbackClaimed = false;
}


export function isMobileVoiceEnvironment(): boolean {
  if (typeof navigator === "undefined") return false;
  const isNative =
    typeof (window as any) !== "undefined" &&
    !!(window as any).Capacitor &&
    typeof (window as any).Capacitor.isNativePlatform === "function" &&
    (window as any).Capacitor.isNativePlatform();
  if (isNative) return true;
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

/** Wait until the browser has decoded enough media for stable playback. */
export function waitForVoiceAudioReady(
  audio: HTMLAudioElement,
  claim: number,
): Promise<boolean> {
  if (!isVoicePlaybackClaimCurrent(claim)) return Promise.resolve(false);
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("abort", onError);
      resolve(ready && isVoicePlaybackClaimCurrent(claim));
    };
    const onReady = () => finish(true);
    const onError = () => finish(false);
    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.addEventListener("abort", onError, { once: true });
    try {
      audio.load();
    } catch {
      finish(false);
    }
  });
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
      audio.volume = 0.82;
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

  const seq = claimVoicePlayback();
  currentAudio = audio;
  audio.preload = "auto";
  audio.muted = false;
  audio.volume = 0.82;
  audio.src = url;
    const ready = await waitForVoiceAudioReady(audio, seq);
    if (!ready) {
      if (currentAudio === audio) currentAudio = null;
      releaseVoicePlaybackClaim(seq);
      options.onError?.("Chef Super J audio could not be prepared for playback.");
      return false;
    }

  const done = new Promise<boolean>((resolve) => {
    audio.onplaying = () => {
      voiceAudioUnlocked = true;
      options.onStart?.();
    };
    audio.onended = () => {
      disarmAudioGate();
      if (seq !== playbackSeq) return resolve(true);
      if (currentAudio === audio) currentAudio = null;
      releaseVoicePlaybackClaim(seq);
      options.onEnd?.();
      resolve(true);
    };
    audio.onerror = () => {
      disarmAudioGate();
      const reason = "Chef Super J audio could not load or play.";
      if (seq !== playbackSeq) return resolve(true);
      if (currentAudio === audio) currentAudio = null;
      releaseVoicePlaybackClaim(seq);
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
    releaseVoicePlaybackClaim(seq);
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
    const seq = claimVoicePlayback();
    const audio = getOutputAudio();
    if (!audio) {
      reportVoiceFailure("text-to-speech failed", "HTML audio output is unavailable.");
      return false;
    }
    currentAudio = audio;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = Math.max(0, Math.min(0.82, options.volume ?? 0.82));
    audio.src = `data:audio/mpeg;base64,${b64}`;
    audio.playbackRate = (options.rate ?? 1.0) * getVoiceRate();
    const done = new Promise<boolean>((resolve) => {
      audio.onplaying = () => {
        voiceAudioUnlocked = true;
        reportVoiceInfo("mobile audio playback", "audio element fired onplaying", audio);
        options.onStart?.();
      };
      audio.onended = () => {
        if (seq !== playbackSeq) return resolve(true);
        if (currentAudio === audio) currentAudio = null;
        releaseVoicePlaybackClaim(seq);
        options.onEnd?.();
        resolve(true);
      };
      audio.onerror = () => {
        if (seq !== playbackSeq) return resolve(true);
        if (currentAudio === audio) currentAudio = null;
        releaseVoicePlaybackClaim(seq);
        const reason = "Chef Super J text-to-speech audio could not play.";
        reportVoiceFailure("text-to-speech failed", reason, audio.error ?? undefined, audio);
        options.onError?.(reason);
        resolve(false);
      };
    });
    try {
      const ready = await waitForVoiceAudioReady(audio, seq);
      if (!ready) {
        if (currentAudio === audio) currentAudio = null;
        releaseVoicePlaybackClaim(seq);
        options.onError?.("Chef Super J audio could not be prepared for playback.");
        return false;
      }
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
      releaseVoicePlaybackClaim(seq);
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
