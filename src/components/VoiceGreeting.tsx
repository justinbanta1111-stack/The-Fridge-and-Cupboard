import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FRIDGE_INTRO_VOICE_TAP_EVENT,
  getVoiceEnabled,
  setVoiceEnabled,
  VOICE_PREF_EVENT,
  isMobileVoiceEnvironment,
  markGreeted,
  hasGreetedThisSession,
  stopAllAudio,
  duckVoiceOutput,
  unlockVoiceAudio,
  getOutputAudio,
  getVoicePersonality,
  markVoiceAudioUnlocked,
  isVoiceAudioUnlocked,
  registerVoiceAudio,
  unregisterVoiceAudio,
  claimVoicePlayback,
  isVoicePlaybackClaimCurrent,
  releaseVoicePlaybackClaim,
  waitForVoiceAudioReady,
  getVoiceRate,
  getVoicePauseMs,
  isVoicePlaybackClaimed,
} from "@/lib/voice-assistant";
import { WELCOME_GREETING, canPrepareWelcomeAudio } from "@/lib/welcome-voice";

import { synthesizeChefVoice } from "@/lib/tts.functions";

import {
  VoiceRecognizer,
  isRecognitionSupported,
  requestMicPermission,
} from "@/lib/voice-recognition";
import { chatWithChef, chatWithChefGuest } from "@/lib/voice-chat.functions";
import { getScanContext } from "@/lib/scan-context";
import { startVoicePrint, type VoicePrintResult } from "@/lib/voice-print";
import {
  hasSpeakerConsent,
  listSpeakerProfiles,
  matchSpeaker,
  findSpeakerBySpokenName,
  getActiveSpeakerId,
  setActiveSpeaker,
  getSpeakerProfile,
  addSpeakerSample,
} from "@/lib/speaker-profiles";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserName } from "@/lib/user-name";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { useLanguage } from "@/lib/i18n/context";
import { emitVoiceMeter } from "@/components/VoiceStatusMeter";
import { recordVoiceHealth } from "@/lib/voice-health";
import { releaseAudioGate } from "@/lib/audio-gate";
import { armAudioGate, disarmAudioGate } from "@/lib/audio-gate";
import { resetMicActivity } from "@/lib/mic-activity";
import { getVoiceSessionOwner, VOICE_SESSION_EVENT } from "@/lib/voice-session";
import { noteInterruption } from "@/lib/interruption-politeness";
import { isNativeApp } from "@/lib/native-runtime";
import { hasConsent, grantConsent } from "@/lib/permissions";

import greetingAsset from "@/assets/chef-welcome-relaxed.mp3.asset.json";
const bundledGreetingAudioUrl = greetingAsset.url;

/**
 * Hands-free voice runtime.
 *
 *   Mobile:  first user tap  →  unlock audio (sync)  →  welcome  →  mic prompt  →  loop
 *   Desktop: mount            →  request mic         →  welcome  →  loop
 */
const GREETING_TEXT = WELCOME_GREETING;

/**
 * Said instead of the welcome line whenever the voice loop starts again later
 * in the same session. Kept short, warm and varied so it never sounds canned.
 */
const RETURN_LINES = [
  "Just let me know what you'd like to do.",
  "Let me know what questions you have.",
  "What would you like to do next?",
  "I'm ready whenever you are.",
  "Tell me what you're in the mood for.",
  "I'm here — what sounds good?",
];
let lastReturnLine = -1;
function pickReturnLine(): string {
  let index = Math.floor(Math.random() * RETURN_LINES.length);
  if (index === lastReturnLine) index = (index + 1) % RETURN_LINES.length;
  lastReturnLine = index;
  return RETURN_LINES[index] ?? "I'm ready whenever you are.";
}
// The exact welcome line is synthesized with the ElevenLabs Chef voice. The
// bundled clip stays as an offline fallback if synthesis ever fails.
let greetingAudioUrl: string | null = null;
let greetingAudioBase64: string | null = null;
let greetingPreloadPromise: Promise<string | null> | null = null;

type MobileVoiceDebug = {
  tapReceived: "yes" | "no";
  audioUnlocked: "yes" | "no";
  elevenLabsRequestSent: "yes" | "no";
  elevenLabsResponseSuccess: "not started" | "pending" | "yes" | "no";
  audioBlobSize: number | null;
  audioUrlCreated: "yes" | "no";
  audioPlayCalled: "yes" | "no";
  audioPlaySuccess: "not started" | "pending" | "yes" | "no";
  appAudioMuted: "unknown" | "yes" | "no";
  appAudioVolume: string;
  exactError: string;
};

const initialMobileDebug: MobileVoiceDebug = {
  tapReceived: "no",
  audioUnlocked: "no",
  elevenLabsRequestSent: "no",
  elevenLabsResponseSuccess: "not started",
  audioBlobSize: null,
  audioUrlCreated: "no",
  audioPlayCalled: "no",
  audioPlaySuccess: "not started",
  appAudioMuted: "unknown",
  appAudioVolume: "unknown",
  exactError: "none",
};

let greetingPreloadError: string | null = null;
let greetingAudioBlobSize: number | null = null;
let greetingAudioUrlCreated: "yes" | "no" = "no";

function exactError(err: unknown): string {
  if (!err) return "unknown error";
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function mobileDeviceLabel(): "iPhone/iPad" | "Android" | "other mobile" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone/iPad";
  if (/Android/i.test(ua)) return "Android";
  return isMobileVoiceEnvironment() ? "other mobile" : "desktop";
}

function audioFromBase64(base64: string): {
  url: string;
  blobSize: number;
  urlCreated: "yes" | "no";
  error?: string;
} {
  // Unified with desktop: always use a data URL played through the singleton
  // getOutputAudio() element. Keeps mobile and desktop on the exact same
  // playback path so behavior, timing, and single-voice guarantees match.
  const estimatedBytes = Math.max(0, Math.floor((base64.length * 3) / 4));
  return { url: `data:audio/mpeg;base64,${base64}`, blobSize: estimatedBytes, urlCreated: "yes" };
}

// ---------------------------------------------------------------------------
// Voice startup timing instrumentation
// ---------------------------------------------------------------------------
// Records elapsed ms from app open (module load) to key voice-startup milestones
// so we can verify the greeting begins within 1–2 seconds on iPhone Safari and
// Android Chrome. View in DevTools console (filter "[voice-timing]") or on
// mobile append ?voiceDebug=1 to inspect window.__voiceTimings.
const voiceStartupT0: number = typeof performance !== "undefined" ? performance.now() : Date.now();
const voiceTimings: Array<{ mark: string; ms: number; sinceLast: number }> = [];
let voiceTimingsLast = voiceStartupT0;
function markVoiceTiming(mark: string) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const ms = Math.round(now - voiceStartupT0);
  const sinceLast = Math.round(now - voiceTimingsLast);
  voiceTimingsLast = now;
  voiceTimings.push({ mark, ms, sinceLast });
  try {
    console.info(`[voice-timing] +${ms}ms (Δ${sinceLast}ms) ${mark}`);
  } catch {}
  if (typeof window !== "undefined") {
    (window as any).__voiceTimings = voiceTimings;
    (window as any).__voiceStartupT0 = voiceStartupT0;
  }
}
if (typeof window !== "undefined") markVoiceTiming("module load");

// Resolves when the fridge has shown closed for 1s, opened over 3s, and held
// fully open for 1s. If the intro is not on screen, resolves immediately. A
// timeout guarantees the greeting never waits forever if the event is missed.
function logVoiceStage(stage: string, detail: Record<string, unknown> = {}) {
  try {
    console.info(`[voice-stage] ${stage}`, detail);
  } catch {}
}

function waitForFridgeVoiceReady(timeoutMs = 6200): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.__tfcFridgeVoiceReady) return Promise.resolve();
  const introVisible = !!document.querySelector("[data-fridge-intro]");
  const homepageIntroLikely = window.location.pathname === "/";
  if (!w.__tfcFridgeIntroActive && !introVisible && !homepageIntroLikely) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = (mark: string) => {
      if (settled) return;
      settled = true;
      window.removeEventListener(FRIDGE_INTRO_VOICE_TAP_EVENT, onEvent);
      window.clearTimeout(timer);
      markVoiceTiming(`waitForFridgeVoiceReady: ${mark}`);
      resolve();
    };
    const onEvent = () => finish("event received");
    window.addEventListener(FRIDGE_INTRO_VOICE_TAP_EVENT, onEvent, { once: true });
    const timer = window.setTimeout(() => finish("timeout"), timeoutMs);
  });
}

async function preloadGreetingAudio(): Promise<string | null> {
  if (greetingAudioUrl) return greetingAudioUrl;
  if (greetingPreloadPromise) return greetingPreloadPromise;
  markVoiceTiming("preload greeting: fetch start");
  logVoiceStage("voice configuration loaded", { greeting: GREETING_TEXT });
  logVoiceStage("greeting requested", { source: "preload" });
  greetingPreloadPromise = (async () => {
    try {
      const res = await synthesizeChefVoice({ data: { text: GREETING_TEXT } });
      if (res?.audio) {
        greetingPreloadError = null;
        greetingAudioBase64 = res.audio;
        const audioResult = audioFromBase64(res.audio);
        greetingAudioUrl = audioResult.url;
        greetingAudioBlobSize = audioResult.blobSize;
        greetingAudioUrlCreated = audioResult.urlCreated;
        if (audioResult.error) greetingPreloadError = audioResult.error;
        markVoiceTiming(`preload greeting: audio ready (${audioResult.blobSize ?? "?"} bytes)`);
        logVoiceStage("ElevenLabs audio received", {
          kind: "greeting",
          bytes: audioResult.blobSize,
        });
        return greetingAudioUrl;
      }
      greetingPreloadError = res?.error || "ElevenLabs returned no greeting audio";
      markVoiceTiming(`preload greeting: FAILED (${greetingPreloadError})`);
    } catch (err) {
      greetingPreloadError = exactError(err);
      console.error("[voice] greeting preload failed", err);
      markVoiceTiming(`preload greeting: THREW (${greetingPreloadError})`);
    }
    greetingPreloadPromise = null;
    // Offline / synthesis failure: fall back to the bundled welcome clip so
    // the assistant still speaks and the listening loop still starts.
    greetingAudioUrl = bundledGreetingAudioUrl;
    return greetingAudioUrl;
  })();
  return greetingPreloadPromise;
}

// Kick off the ElevenLabs greeting fetch at module import so the audio is
// already in flight (or fully cached) by the time <VoiceGreeting /> mounts
// and the fridge intro finishes. Cuts the perceived startup delay from
// tens of seconds down to whatever the browser needs to play the cached MP3.
if (typeof window !== "undefined") {
  try {
    void preloadGreetingAudio();
  } catch {}
}

const HISTORY_KEY = "tfc.voice.history.v1";
const DISMISSED_KEY = "tfc.voice.popup.dismissed.v1";
const REOPEN_EVENT = "tfc:voice:reopen-popup";
const MAX_HISTORY = 20;

let started = false; // module-level guard: greeting plays only once per load

// Signing in reloads the page. The sign-in screen sets this flag right before
// the redirect so the voice assistant treats the signed-in page as a fresh
// start: greeting plays once more, sound comes back unmuted, and the
// hands-free loop restarts. Authentication never disables the assistant.
const AUTH_RESUME_KEY = "tfc.voice.resume-after-auth.v1";
if (typeof window !== "undefined") {
  try {
    if (sessionStorage.getItem(AUTH_RESUME_KEY) === "1") {
      sessionStorage.removeItem(AUTH_RESUME_KEY);
      // Keep the "already greeted" flag: signing in reloads the page, but the
      // welcome line is only ever said once per session.
      // Preserve an explicit mute through account changes.
      started = false;
    }
  } catch {}
}

type MicState = "idle" | "granted" | "denied" | "unsupported";
type Turn = { role: "user" | "assistant"; text: string };

function loadHistory(): Turn[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Turn[]) : [];
  } catch {
    return [];
  }
}
function saveHistory(h: Turn[]) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-MAX_HISTORY)));
  } catch {}
}

function isPopupDismissed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
function setPopupDismissed(v: boolean) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (v) sessionStorage.setItem(DISMISSED_KEY, "1");
    else sessionStorage.removeItem(DISMISSED_KEY);
  } catch {}
}

export function VoiceGreeting() {
  const chatFn = useServerFn(chatWithChef);
  const guestChatFn = useServerFn(chatWithChefGuest);
  const { restrictions } = useDietaryPrefs();
  const { language: chatLanguage } = useLanguage();
  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<Turn[]>(loadHistory());
  const prefsRef = useRef(restrictions);
  const loopingRef = useRef(true);
  const runningRef = useRef(false);
  const speakingRef = useRef(false);
  // Set when the user has interrupted several times in a row — the next reply
  // gets a brief, warm "Pardon me." prefix, then it's cleared.
  const pardonPendingRef = useRef(false);
  const speechEpochRef = useRef(0);
  const bargeAcknowledgingRef = useRef(false);
  const finishActiveListenRef = useRef<(() => void) | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastMicMsRef = useRef<number>(0);
  const micStateRef = useRef<MicState>("idle");
  const mobileMicPermissionPromiseRef = useRef<Promise<MicState> | null>(null);
  const pendingCompanionPromptRef = useRef<string | null>(null);
  const voicePrintRef = useRef<VoicePrintResult | null>(null);
  const awaitingSpeakerNameRef = useRef(false);
  const startVoiceFromTapRef = useRef<(() => void) | null>(null);
  const unlockHandlerRef = useRef<(() => void) | null>(null);
  const pendingSpeechRef = useRef<{
    text: string;
    kind: "greeting" | "reply";
    audioUrl?: string;
    audioBase64?: string;
  } | null>(null);
  const [micState, setMicStateValue] = useState<MicState>("idle");
  const [, setDismissed] = useState<boolean>(() => isPopupDismissed());
  const [, setShowMobileStart] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioDebug, setAudioDebug] = useState<string[]>([]);
  const [mobileDebug, setMobileDebug] = useState<MobileVoiceDebug>(initialMobileDebug);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [, setVoiceLoading] = useState(false);
  const [greetingReady, setGreetingReady] = useState<boolean>(!!greetingAudioUrl);
  const [clientReady, setClientReady] = useState(false);
  const [voiceDebugMode, setVoiceDebugMode] = useState(false);

  const setMicState = (status: MicState) => {
    micStateRef.current = status;
    setMicStateValue(status);
  };

  useEffect(() => {
    prefsRef.current = restrictions;
  }, [restrictions]);

  useEffect(() => {
    markVoiceTiming("VoiceGreeting mounted");
  }, []);

  // Signing in or out must never leave the assistant silent. Whenever the
  // account state changes in place (no page reload), unmute and restart the
  // listening loop so the conversation carries on exactly as before.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "TOKEN_REFRESHED") return;
      setVoiceEnabled(true);
      loopingRef.current = true;
      lastActivityRef.current = 0;
      try {
        (window as any).__tfcRestartVoiceLoop?.();
      } catch {}
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setClientReady(true);

    // Voice debug panel is hidden from normal users. Enable only via URL
    // (?voiceDebug=1) or by setting localStorage.tfc_voice_debug = "1".
    try {
      const url = new URL(window.location.href);
      const param = url.searchParams.get("voiceDebug");
      const stored =
        typeof localStorage !== "undefined" ? localStorage.getItem("tfc_voice_debug") : null;
      setVoiceDebugMode(param === "1" || stored === "1");
    } catch {
      setVoiceDebugMode(false);
    }
  }, []);

  // Global listener: clicking any microphone / voice button re-opens the popup.
  useEffect(() => {
    const reopen = () => {
      setPopupDismissed(false);
      setDismissed(false);
    };
    const onClick = (e: Event) => {
      const target = e.target as Element | null;
      if (!target || typeof (target as any).closest !== "function") return;
      // Never treat the audio mute/ambience control as a mic/voice trigger —
      // that click is meant to toggle sound, not reopen the assistant popup
      // or restart the voice loop.
      if (target.closest("[data-voice-mute], [data-ambience-toggle]")) return;
      const hit = target.closest<HTMLElement>(
        '[data-voice-trigger], [aria-label*="microphone" i], [aria-label*="mic" i], [title*="microphone" i]',
      );
      if (hit) reopen();
    };

    window.addEventListener("click", onClick, { capture: true });
    window.addEventListener(REOPEN_EVENT, reopen);
    window.addEventListener(FRIDGE_INTRO_VOICE_TAP_EVENT, reopen);
    return () => {
      window.removeEventListener("click", onClick, { capture: true } as any);
      window.removeEventListener(REOPEN_EVENT, reopen);
      window.removeEventListener(FRIDGE_INTRO_VOICE_TAP_EVENT, reopen);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    // Diagnostic snapshot: device, permissions, capability.
    (async () => {
      const mobile = isMobileVoiceEnvironment();
      const info: Record<string, unknown> = {
        mobile,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
        recognitionSupported: isRecognitionSupported(),
        speechSynthesis: typeof window !== "undefined" && !!window.speechSynthesis,
      };
      try {
        if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
          const mic = await (navigator as any).permissions.query({
            name: "microphone" as PermissionName,
          });
          info.micPermission = mic.state;
          mic.onchange = () => console.info("[voice] mic permission changed →", mic.state);
        }
      } catch (e) {
        info.micPermissionError = String(e);
      }
      console.info("[voice] ENV", info);
    })();

    // Kick off ElevenLabs Chef Super J greeting preload while the fridge
    // starts opening. Avoid any visible waiting state during normal startup.
    const loadingHintTimer = window.setTimeout(() => {
      if (!started && !greetingAudioUrl) setVoiceLoading(true);
    }, 1800);
    setMobileDebug((prev) => ({
      ...prev,
      elevenLabsRequestSent: "yes",
      elevenLabsResponseSuccess: "pending",
      audioBlobSize: null,
      audioUrlCreated: "no",
      exactError: "none",
    }));
    void preloadGreetingAudio().then((url) => {
      if (!url) {
        window.clearTimeout(loadingHintTimer);
        setMobileDebug((prev) => ({
          ...prev,
          elevenLabsResponseSuccess: "no",
          exactError: greetingPreloadError || "ElevenLabs greeting preload failed",
        }));
        setVoiceLoading(false);
        return;
      }
      window.clearTimeout(loadingHintTimer);
      setMobileDebug((prev) => ({
        ...prev,
        elevenLabsResponseSuccess: "yes",
        audioBlobSize: greetingAudioBlobSize,
        audioUrlCreated: greetingAudioUrlCreated,
        exactError: greetingPreloadError || "none",
      }));
      setGreetingReady(true);
      try {
        const audio = getOutputAudio();
        if (audio && !disposed && canPrepareWelcomeAudio(started, speakingRef.current, isVoicePlaybackClaimed())) {
          audio.preload = "auto";
          audio.src = url;
          audio.load();
        }
      } catch (err) {
        console.error("[voice] greeting preload attach failed", err);
      }
    });

    // Split a reply into sentence-sized chunks so we can start speaking
    // the first sentence while ElevenLabs is still synthesizing the rest.
    // First chunk is intentionally small (first sentence) for fastest
    // time-to-first-audio; remaining sentences are batched to keep prosody
    // natural. Never splits below 3 words so short replies stay one chunk.
    function splitForStreamingSpeech(text: string): string[] {
      const trimmed = (text || "").trim();
      if (!trimmed) return [];
      const sentences = trimmed
        .match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g)
        ?.map((s) => s.trim())
        .filter(Boolean) ?? [trimmed];
      if (sentences.length <= 1) return [trimmed];
      const first = sentences[0];
      if (first.split(/\s+/).length < 3) {
        // Merge tiny opener ("Oh nice!") with the next sentence so the
        // first chunk is worth streaming on its own.
        return [[sentences[0], sentences[1]].join(" "), ...sentences.slice(2)].filter(Boolean)
          .length > 1
          ? [[sentences[0], sentences[1]].join(" "), sentences.slice(2).join(" ")].filter(Boolean)
          : [trimmed];
      }
      const rest = sentences.slice(1).join(" ").trim();
      return rest ? [first, rest] : [first];
    }

    // Speak a single already-synthesized audio blob. Preserves the exact
    // mobile-unlock, autoplay-fallback, and error handling of the original
    // speak() — only the TTS fetch is lifted out so callers can pipeline it.
    async function speakOne(
      text: string,
      res: { audio: string | null; error?: string | null },
      opts: { isFirstChunk: boolean; ttsStart: number },
    ): Promise<void> {
      return new Promise(async (resolve) => {
        try {
          try {
            recognizerRef.current?.stop();
          } catch {}
          recognizerRef.current = null;

          if (!res?.audio) {
            const reason = res?.error || "ElevenLabs returned no audio";
            recordVoiceHealth("tts_failed", { note: reason });
            console.warn("[voice] ElevenLabs returned no audio", { reason });
            setMobileDebug((prev) => ({
              ...prev,
              elevenLabsResponseSuccess: "no",
              audioPlaySuccess: "no",
              exactError: reason,
            }));
            return resolve();
          }
          const audioResult = audioFromBase64(res.audio);
          setMobileDebug((prev) => ({
            ...prev,
            elevenLabsResponseSuccess: "yes",
            audioBlobSize: audioResult.blobSize,
            audioUrlCreated: audioResult.urlCreated,
            audioPlaySuccess: "pending",
            exactError: audioResult.error || "none",
          }));
          const playbackClaim = claimVoicePlayback();
          // Unified with desktop: always use the singleton audio element.
          const audio = getOutputAudio();
          if (!audio || disposed || !isVoicePlaybackClaimCurrent(playbackClaim)) {
            releaseVoicePlaybackClaim(playbackClaim);
            const reason = "No audio element available";
            console.warn("[voice] no audio element");
            setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: reason }));
            return resolve();
          }
          registerVoiceAudio(audio);
          audioRef.current = audio;
          audio.muted = false;
          audio.volume = 0.82;
          audio.defaultMuted = false;
          audio.src = audioResult.url;
          audio.playbackRate = getVoiceRate();

          audio.preload = "auto";
          audio.setAttribute("playsinline", "");
          (audio as any).playsInline = true;
          speakingRef.current = true;
          const speakStartedAt = Date.now();
          let playbackBegan = false;
          let settled = false;
          const onPlaying = () => {
            if (playbackBegan) return;
            playbackBegan = true;
            if (!bargeAcknowledgingRef.current) {
              void armAudioGate(() => {
                if (!speakingRef.current || bargeAcknowledgingRef.current) return;
                // The user started talking — go completely silent and listen.
                // Usually just pause naturally; only after repeated
                // interruptions do we offer a brief "Pardon me."
                speechEpochRef.current += 1;
                if (noteInterruption()) pardonPendingRef.current = true;
                stopAllAudio();
                disarmAudioGate();
                speakingRef.current = false;
              }, duckVoiceOutput);
            }
            markVoiceAudioUnlocked();
            setMobileDebug((prev) => ({
              ...prev,
              audioUnlocked: "yes",
              audioPlaySuccess: "yes",
              appAudioMuted: audio.muted ? "yes" : "no",
              appAudioVolume: String(audio.volume),
              exactError: "none",
            }));
            if (opts.isFirstChunk) {
              console.info("[voice] ElevenLabs audio STARTED", {
                ms: Date.now() - opts.ttsStart,
                text: text.slice(0, 60),
              });
              logVoiceStage("response playback started", { ms: Date.now() - opts.ttsStart });
              emitVoiceMeter({
                phase: "speaking",
                ms: Date.now() - opts.ttsStart,
                note: "tts+first-audio",
              });
              recordVoiceHealth("tts_audible", {
                ms: Date.now() - opts.ttsStart,
                note: text.slice(0, 40),
              });
            }
          };
          audio.onplaying = onPlaying;
          const done = () => {
            if (settled) return;
            settled = true;
            disarmAudioGate();
            const ownsPlayback = isVoicePlaybackClaimCurrent(playbackClaim);
            audio.onplaying = null;
            audio.onerror = null;
            audio.onended = null;
            unregisterVoiceAudio(audio);
            releaseVoicePlaybackClaim(playbackClaim);
            if (ownsPlayback) {
              speakingRef.current = false;
              emitVoiceMeter({ phase: "listening", ms: Date.now() - speakStartedAt, note: "spoke" });
            }
            resolve();
          };
          const doneWithFallback = async (evt?: unknown) => {
            if (settled) return;
            disarmAudioGate();
            if (playbackBegan) {
              console.warn(
                "[voice] audio error after playback began — ignoring (no fallback)",
                evt,
              );
              return done();
            }
            settled = true;
            const ownsPlayback = isVoicePlaybackClaimCurrent(playbackClaim);
            audio.onplaying = null;
            audio.onerror = null;
            audio.onended = null;
            unregisterVoiceAudio(audio);
            releaseVoicePlaybackClaim(playbackClaim);
            const mediaErr = audio.error
              ? { code: audio.error.code, message: audio.error.message }
              : null;
            const evtType =
              (evt && (evt as any).type) ||
              (evt instanceof Error ? evt.message : String(evt || ""));
            console.warn("[voice] ElevenLabs playback DID NOT START", {
              mediaError: mediaErr,
              evt: evtType,
            });
            recordVoiceHealth("tts_failed", { note: `playback: ${evtType || "no start"}` });
            recordVoiceHealth("fallback", { note: "single-voice-skip" });
            setMobileDebug((prev) => ({
              ...prev,
              tapReceived: "yes",
              audioPlaySuccess: "no",
              exactError: `${evtType || "audio play blocked"}${mediaErr ? `; media ${mediaErr.code}: ${mediaErr.message}` : ""}`,
            }));
            // If autoplay is still locked, surface the tap-to-enable overlay
            // (same behavior the desktop code follows on the very first load
            // before any user interaction has unlocked audio).
            if (!isVoiceAudioUnlocked()) {
              pendingSpeechRef.current = {
                text,
                kind: "reply",
                audioBase64: res.audio ?? undefined,
              };
              setAudioDebug((prev) => [
                ...prev.slice(-6),
                `reply blocked: ${evtType || "no start"}${mediaErr ? ` err=${mediaErr.code}` : ""}`,
              ]);
              setAudioBlocked(true);
            }
            if (ownsPlayback) speakingRef.current = false;
            resolve();
          };
          audio.onended = done;
          audio.onerror = doneWithFallback;
          const ready = await waitForVoiceAudioReady(audio, playbackClaim);
          if (!ready || disposed) {
            unregisterVoiceAudio(audio);
            releaseVoicePlaybackClaim(playbackClaim);
            speakingRef.current = false;
            return resolve();
          }
          setMobileDebug((prev) => ({
            ...prev,
            audioPlayCalled: "yes",
            appAudioMuted: audio.muted ? "yes" : "no",
            appAudioVolume: String(audio.volume),
          }));
          await audio.play().catch(doneWithFallback);
        } catch (err) {
          console.error("[voice] speakOne() threw", err);
          setMobileDebug((prev) => ({
            ...prev,
            audioPlaySuccess: "no",
            exactError: exactError(err),
          }));
          speakingRef.current = false;
          resolve();
        }
      });
    }

    // Streamed speak(): split the reply into sentence chunks, fire ALL
    // ElevenLabs TTS requests in parallel immediately, and start playing
    // the first chunk the moment it comes back. Cuts perceived latency
    // from "wait for full audio" (~1.5-3s) to "wait for first sentence"
    // (~400-700ms) without changing voice, personality, or answer length.
    async function speak(text: string): Promise<void> {
      if (disposed || !getVoiceEnabled()) return;
      if (pardonPendingRef.current) {
        pardonPendingRef.current = false;
        text = `Pardon me. ${text}`;
      }
      const chunks = splitForStreamingSpeech(text);
      if (chunks.length === 0) return;
      const speechEpoch = speechEpochRef.current;

      const ttsStart = Date.now();
      setMobileDebug((prev) => ({
        ...prev,
        elevenLabsRequestSent: "yes",
        elevenLabsResponseSuccess: "pending",
        audioBlobSize: null,
        audioUrlCreated: "no",
        audioPlayCalled: "no",
        audioPlaySuccess: "not started",
        exactError: "none",
      }));
      recordVoiceHealth("tts_request", { note: `${chunks.length}ch: ${text.slice(0, 40)}` });
      logVoiceStage("ElevenLabs audio requested", { kind: "reply", chunks: chunks.length });

      // Kick off every chunk's TTS in parallel — first-chunk audio arrives
      // as fast as the shortest sentence takes to synthesize.
      const ttsPromises = chunks.map((chunk) =>
        synthesizeChefVoice({ data: { text: chunk } }).catch((err) => ({
          audio: null,
          mime: "audio/mpeg" as const,
          error: err instanceof Error ? err.message : String(err),
        })),
      );

      for (let i = 0; i < chunks.length; i += 1) {
        if (disposed || !getVoiceEnabled() || speechEpoch !== speechEpochRef.current) break;
        const res = await ttsPromises[i];
        if (disposed || !getVoiceEnabled() || speechEpoch !== speechEpochRef.current) break;
        if (res?.audio) logVoiceStage("ElevenLabs audio received", { kind: "reply", chunk: i + 1 });
        await speakOne(chunks[i], res as { audio: string | null; error?: string | null }, {
          isFirstChunk: i === 0,
          ttsStart,
        });
        if (speechEpoch !== speechEpochRef.current) break;
        // Calibrated breathing room between sentences (Settings → Voice timing).
        const gap = getVoicePauseMs();
        if (gap > 0 && i < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, gap));
        }
      }

    }

    async function requestMicOnce(): Promise<MicState> {
      if (micStateRef.current === "granted") return "granted";
      const pendingMobilePermission = mobileMicPermissionPromiseRef.current;
      const status = pendingMobilePermission
        ? await pendingMobilePermission
        : await requestMicPermission();
      setMicState(status);
      if (status !== "granted") mobileMicPermissionPromiseRef.current = null;
      return status;
    }

    async function listenOnce(): Promise<string | null> {
      if (!isRecognitionSupported()) return null;
      if (getVoiceSessionOwner() !== "global") return null;
      // App Store rule: inside the native app the microphone prompt must not
      // appear until the person chooses a voice feature. Chef still greets and
      // everything else works; we simply do not open the mic until then.
      if (micStateRef.current === "denied" || (isNativeApp() && !hasConsent("microphone"))) {
        await new Promise((r) => setTimeout(r, 1200));
        return null;
      }

      while (speakingRef.current) {
        if (disposed || !getVoiceEnabled()) return null;
        await new Promise((r) => setTimeout(r, 20));
      }
      console.info("[voice] MIC_STARTED");
      logVoiceStage("microphone started");
      lastActivityRef.current = Date.now();
      const micStart = Date.now();
      emitVoiceMeter({ phase: "listening", note: "mic open" });
      // Optional, opt-in voice fingerprint for multi-speaker recognition.
      // Nothing is captured unless the household enrolled voice profiles.
      let printCapture: Awaited<ReturnType<typeof startVoicePrint>> = null;
      voicePrintRef.current = null;
      if (hasSpeakerConsent() && listSpeakerProfiles().length > 0) {
        printCapture = await startVoicePrint().catch(() => null);
      }

      return new Promise((resolve) => {
        const rec = new VoiceRecognizer();
        recognizerRef.current = rec;
        let done = false;
        let denied = false;
        let finalText: string | null = null;
        const finish = (text: string | null) => {
          if (done) return;
          done = true;
          finishActiveListenRef.current = null;
          if (printCapture) {
            try {
              voicePrintRef.current = printCapture.stop();
            } catch {
              voicePrintRef.current = null;
            }
            printCapture = null;
          }
          try {
            rec.stop();
          } catch {}
          lastMicMsRef.current = Date.now() - micStart;
          const cleaned = (text ?? finalText ?? "").trim();
          console.info("[voice] MIC_FINISHED", {
            hasText: !!cleaned,
            chars: cleaned.length,
            ms: lastMicMsRef.current,
          });
          resolve(denied ? "__DENIED__" : cleaned || null);
        };
        finishActiveListenRef.current = () => finish(null);
        const timeout = setTimeout(() => finish(null), 30000);
        rec.start({
          onPartial: (t) => {
            lastActivityRef.current = Date.now();
            if (t?.trim()) finalText = t.trim();
          },
          onFinal: (t) => {
            const cleaned = t.trim();
            if (cleaned) finalText = cleaned;
            clearTimeout(timeout);
            lastActivityRef.current = Date.now();
            console.info("[voice] TRANSCRIPT_CAPTURED", { chars: cleaned.length });
            logVoiceStage("transcript created", { chars: cleaned.length });
            finish(cleaned || finalText);
          },
          onError: (msg) => {
            console.warn("[voice] MIC_FAILED", msg);
            clearTimeout(timeout);
            if (/microphone|not-allowed|blocked/i.test(msg || "")) {
              denied = true;
              setMicState("denied");
            }
            finish(null);
          },
          onEnd: () => {
            clearTimeout(timeout);
            // Some mobile recognizers emit onEnd immediately after onFinal.
            // Preserve the transcript captured above instead of racing it with null.
            window.setTimeout(() => finish(finalText), 0);
          },
        });
      });
    }

    async function conversationTurn(): Promise<"continue" | "pause"> {
      recordVoiceHealth("turn_start");

      const queuedPrompt = pendingCompanionPromptRef.current;
      pendingCompanionPromptRef.current = null;
      const transcript = queuedPrompt || (await listenOnce());
      if (transcript === "__DENIED__") {
        console.warn("[voice] mic denied this turn — retrying");
        recordVoiceHealth("mic_denied");
        await new Promise((r) => setTimeout(r, 800));
        return "continue";
      }
      if (!transcript) return "continue";
      recordVoiceHealth("transcript", {
        ms: lastMicMsRef.current,
        note: `${transcript.length} chars`,
      });
      // ---- Who is talking? (only with enrolled, opted-in voice profiles) ----
      let speakerPayload:
        | { status: "match" | "unsure" | "none" | "overlap"; name?: string; roster: string[] }
        | undefined;
      if (hasSpeakerConsent() && listSpeakerProfiles().length > 0) {
        const roster = listSpeakerProfiles().map((p) => {
          const bits: string[] = [];
          if (p.restrictions.length) bits.push(`must avoid ${p.restrictions.join(", ")}`);
          if (p.likes.length) bits.push(`likes ${p.likes.join(", ")}`);
          if (p.dislikes.length) bits.push(`dislikes ${p.dislikes.join(", ")}`);
          if (p.experience !== "unknown") bits.push(`${p.experience} cook`);
          if (p.notes) bits.push(p.notes);
          return `- ${p.name}${bits.length ? ` — ${bits.join("; ")}` : ""}`.slice(0, 200);
        });
        const print = voicePrintRef.current;

        if (print?.overlap) {
          awaitingSpeakerNameRef.current = false;
          speakerPayload = { status: "overlap", roster };
        } else if (awaitingSpeakerNameRef.current) {
          // They were asked "Who's speaking right now?" — take them at their word.
          const named = findSpeakerBySpokenName(transcript);
          awaitingSpeakerNameRef.current = false;
          if (named) {
            setActiveSpeaker(named.id);
            if (print?.vector) addSpeakerSample(named.id, print.vector);
            speakerPayload = { status: "match", name: named.name, roster };
          } else {
            speakerPayload = { status: "none", roster };
          }
        } else {
          const result = matchSpeaker(print?.vector ?? null);
          if (result.status === "match") {
            setActiveSpeaker(result.profile.id);
            speakerPayload = { status: "match", name: result.profile.name, roster };
          } else if (result.status === "unsure") {
            // Never guess. Ask.
            awaitingSpeakerNameRef.current = true;
            setActiveSpeaker(null);
            speakerPayload = { status: "unsure", roster };
          } else {
            const active = getSpeakerProfile(getActiveSpeakerId());
            speakerPayload = active
              ? { status: "match", name: active.name, roster }
              : { status: "none", roster };
          }
        }
      }

      console.info("[voice] AI_REQUEST_SENT", { chars: transcript.length });
      logVoiceStage("speech detected", { chars: transcript.length });
      historyRef.current.push({ role: "user", text: transcript });
      saveHistory(historyRef.current);

      try {
        const { data } = await supabase.auth.getSession();
        emitVoiceMeter({
          phase: "thinking",
          ms: lastMicMsRef.current,
          note: transcript.slice(0, 60),
        });
        const thinkStart = Date.now();
        recordVoiceHealth("ai_request", { note: transcript.slice(0, 40) });
        const scanCtx = getScanContext();
        const knownUserName = await resolveUserName();
        const payload = {
          message: transcript,
          history: historyRef.current.slice(-24),
          restrictions: prefsRef.current,
          voicePersonality: getVoicePersonality(),
          language: chatLanguage,
          ...(speakerPayload ? { speaker: speakerPayload } : {}),
          ...(knownUserName ? { userName: knownUserName } : {}),
          ...(scanCtx
            ? {
                scanContext: {
                  items: scanCtx.items,
                  useFirst: scanCtx.useFirst,
                  summary: scanCtx.summary,
                  storage: scanCtx.storage,
                },
              }
            : {}),
        };
        let reply: Awaited<ReturnType<typeof chatFn>> | null = null;
        let lastErr: unknown = null;
        try {
          reply = data.session?.user
            ? await chatFn({ data: payload })
            : await guestChatFn({ data: payload });
        } catch (err) {
          lastErr = err;
          recordVoiceHealth("ai_error", {
            note: err instanceof Error ? err.message : String(err),
          });
        }
        // Being signed in must never silence the conversation. If the
        // account-aware reply fails for any reason (expired token, network,
        // cold start), fall back to the same path logged-out visitors use.
        if (!reply?.reply && data.session?.user) {
          try {
            reply = await guestChatFn({ data: payload });
            if (reply?.reply) lastErr = null;
          } catch (err) {
            lastErr = err;
          }
        }

        if (reply?.reply) {
          console.info("[voice] AI_RESPONSE_RECEIVED", {
            chars: reply.reply.length,
            intent: reply.intent,
          });
          logVoiceStage("assistant response received", {
            chars: reply.reply.length,
            intent: reply.intent,
          });
          recordVoiceHealth("ai_response", { ms: Date.now() - thinkStart, note: reply.intent });
          historyRef.current.push({ role: "assistant", text: reply.reply });
          saveHistory(historyRef.current);
          emitVoiceMeter({ phase: "speaking", ms: Date.now() - thinkStart, note: "llm done" });
          await speak(reply.reply);
        } else {
          // All retries failed — stay in-character, keep conversation going,
          // never announce a technical error. Craft a contextual nudge from
          // what we already know.
          console.error("[voice] chat reply failed after retries", lastErr);
          recordVoiceHealth("ai_error", { note: "all retries failed — using contextual fallback" });
          const lastAssistant = [...historyRef.current]
            .reverse()
            .find((m) => m.role === "assistant")?.text;
          const graceful = lastAssistant
            ? "Let's keep going — tell me a bit more about what you're in the mood for, or any ingredients you'd like to use."
            : "Tell me what ingredients you have on hand or what you're in the mood for, and I'll pull something together.";
          try {
            await speak(graceful);
          } catch {
            /* keep looping */
          }
        }
      } catch (err) {
        // Outer safety net — never break the loop, never announce an error.
        console.error("[voice] turn outer error", err);
        recordVoiceHealth("ai_error", { note: err instanceof Error ? err.message : String(err) });
      }

      return "continue";
    }

    async function runFlow() {
      if (disposed) return;
      if (runningRef.current) return;
      if (!getVoiceEnabled()) return;
      if (getVoiceSessionOwner() !== "global") return;
      runningRef.current = true;
      loopingRef.current = true;
      markVoiceTiming("runFlow: start");

      try {
        if (!started) {
          // If the user has muted the AI voice, skip the audible greeting but
          // still mark the session as greeted so the hands-free listening loop
          // begins immediately. Muting must never disable the rest of the app.
          if (!getVoiceEnabled()) {
            started = true;
            markGreeted();
          } else if (hasGreetedThisSession()) {
            // The welcome line is said once per app open. Coming back to the
            // voice loop later in the same session uses a short, varied,
            // relaxed nudge instead of repeating the welcome.
            started = true;
            setVoiceLoading(false);
            try {
              await speak(pickReturnLine());
            } catch {
              /* keep the loop going even if this line can't play */
            }
          } else {

            let greetingOk = false;
            try {
              if (!greetingAudioUrl) setVoiceLoading(true);
              const url = greetingAudioUrl ?? (await preloadGreetingAudio());
              if (!url) throw new Error("no greeting audio");
              markVoiceTiming("runFlow: greeting URL ready");
              // Align greeting start to the fridge intro: if the intro is on
              // screen and the doors haven't begun opening yet, wait for the
              // "doors opening" event so voice + animation begin together.
              // Cap the wait so a missed event never stalls the greeting.
              await waitForFridgeVoiceReady(6200);
              if (disposed || !getVoiceEnabled() || started || speakingRef.current || isVoicePlaybackClaimed()) return;
              markVoiceTiming("runFlow: aligned with fridge voice-ready pause");

              const playbackClaim = claimVoicePlayback();
              const audio = getOutputAudio();
              if (!audio || !isVoicePlaybackClaimCurrent(playbackClaim)) {
                releaseVoicePlaybackClaim(playbackClaim);
                throw new Error("no audio element");
              }
              registerVoiceAudio(audio);
              audioRef.current = audio;
              audio.muted = false;
              audio.volume = 0.82;
              audio.defaultMuted = false;
              audio.src = url;
              audio.preload = "auto";
              audio.setAttribute("playsinline", "");
              (audio as any).playsInline = true;
              const ready = await waitForVoiceAudioReady(audio, playbackClaim);
              if (!ready || disposed || !isVoicePlaybackClaimCurrent(playbackClaim)) {
                unregisterVoiceAudio(audio);
                releaseVoicePlaybackClaim(playbackClaim);
                speakingRef.current = false;
                throw new Error("greeting audio was not ready for stable playback");
              }

              speakingRef.current = true;
              greetingOk = await new Promise<boolean>((resolve) => {
                let settled = false;
                const done = (ok: boolean) => {
                  if (settled) return;
                  settled = true;
                  const ownsPlayback = isVoicePlaybackClaimCurrent(playbackClaim);
                  disarmAudioGate();
                  unregisterVoiceAudio(audio);
                  releaseVoicePlaybackClaim(playbackClaim);
                  if (ownsPlayback) speakingRef.current = false;
                  resolve(ok);
                };
                const greetingStartMs = Date.now();
                recordVoiceHealth("greeting_started");
                logVoiceStage("greeting requested", { source: "playback" });
                audio.onplaying = () => {
                  markVoiceTiming("GREETING AUDIBLE (audio.onplaying)");
                  logVoiceStage("audio playback started", { kind: "greeting" });
                  recordVoiceHealth("greeting_audible", { ms: Date.now() - greetingStartMs });
                  setVoiceLoading(false);
                  markVoiceAudioUnlocked();
                  setAudioUnlocked(true);
                  setMobileDebug((prev) => ({
                    ...prev,
                    audioPlaySuccess: "yes",
                    exactError: "none",
                  }));
                  emitVoiceMeter({ phase: "speaking", note: "welcome audio started" });
                  if (!isNativeApp() || hasConsent("microphone")) void armAudioGate(() => {
                    if (!speakingRef.current) return;
                    // User started talking during the welcome — stop instantly.
                    if (noteInterruption()) pardonPendingRef.current = true;
                    stopAllAudio();
                    disarmAudioGate();
                    speakingRef.current = false;
                  }, duckVoiceOutput);
                };
                audio.onended = () => done(true);
                audio.onerror = () => {
                  const mediaErr = audio.error
                    ? `media ${audio.error.code}: ${audio.error.message}`
                    : "audio error";
                  setMobileDebug((prev) => ({
                    ...prev,
                    audioPlaySuccess: "no",
                    exactError: mediaErr,
                  }));
                  done(false);
                };
                setMobileDebug((prev) => ({
                  ...prev,
                  audioPlayCalled: "yes",
                  appAudioMuted: audio.muted ? "yes" : "no",
                  appAudioVolume: String(audio.volume),
                }));
                markVoiceTiming("runFlow: calling audio.play()");
                audio
                  .play()
                  .then(() => {
                    markVoiceTiming("runFlow: audio.play() resolved");
                  })
                  .catch((err) => {
                    markVoiceTiming(`runFlow: audio.play() REJECTED (${exactError(err)})`);
                    setMobileDebug((prev) => ({
                      ...prev,
                      audioPlaySuccess: "no",
                      exactError: exactError(err),
                    }));
                    done(false);
                  });
              });

              if (greetingOk) {
                started = true;
                markGreeted();
              }
            } catch (err) {
              console.error("[voice] greeting playback failed", err);
            } finally {
              setVoiceLoading(false);
            }
            if (!greetingOk) {
              speakingRef.current = false;
              recordVoiceHealth("greeting_blocked", {
                note: isMobileVoiceEnvironment() ? "mobile autoplay" : "desktop",
              });
              // Never hold the hands-free loop behind a tap. If a browser blocks
              // the opening audio, continue directly to microphone listening;
              // spoken replies still use only the prepared ElevenLabs voice.
              console.warn("[voice] greeting playback blocked — continuing hands-free");
              // iPhone/Safari refuses autoplay outright. Keep the prepared
              // greeting queued so the very first real touch anywhere plays it
              // instantly inside that gesture. Android/native already played it,
              // so this branch never runs there.
              if (!pendingSpeechRef.current && !hasGreetedThisSession()) {
                pendingSpeechRef.current = {
                  text: GREETING_TEXT,
                  kind: "greeting",
                  audioUrl: greetingAudioUrl ?? undefined,
                  audioBase64: greetingAudioBase64 ?? undefined,
                };
              }
              started = true;
              markGreeted();
            }
          }
        } else {
          setVoiceLoading(false);
        }

        // On mobile web, don't gate the loop on a pre-flight getUserMedia
        // probe — the MobileRecognizer opens its own mic stream, and a
        // double request right after audio playback can be rejected by
        // iOS Safari, killing the whole conversation. Assume granted and
        // let per-turn denial recover via conversationTurn's retry.
        const mobileWeb = isMobileVoiceEnvironment();
        if (!mobileWeb || isNativeApp()) {
          const status = await requestMicOnce();
          logVoiceStage("microphone permission result", { status });
          if (status === "granted" && isNativeApp()) grantConsent("microphone");
          if (status !== "granted") return; // desktop: modal shown; loop paused
        } else {
          setMicState("granted");
          logVoiceStage("microphone permission result", { status: "granted", mobileWeb: true });
        }

        while (loopingRef.current && !disposed && getVoiceEnabled()) {
          if (getVoiceSessionOwner() !== "global") break;
          recordVoiceHealth("loop_iteration");
          try {
            const s = await conversationTurn();
            logVoiceStage("listening restarted", { result: s });
            if (s === "pause") break;
          } catch (err) {
            console.error("[voice] conversationTurn threw — continuing", err);
            recordVoiceHealth("ai_error", {
              note: err instanceof Error ? err.message : "loop throw",
            });
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      } finally {
        runningRef.current = false;
      }
    }

    // ---------- Bootstrap ----------
    let bootstrapped = false;

    // Play the greeting synchronously inside the user gesture. Android Chrome
    // (and Samsung Internet) will reject audio.play() the moment control
    // returns to an async continuation, so we cannot `await` anything before
    // calling play(). Requires greetingAudioUrl to be preloaded already;
    // if it isn't, we bail so the async runFlow path handles it.
    const playGreetingInGesture = (): boolean => {
      if (!getVoiceEnabled() || speakingRef.current || isVoicePlaybackClaimed()) return false;
      // The welcome line belongs to the first app open only. If it has already
      // been said this session, let the async loop speak a short varied line.
      if (hasGreetedThisSession()) return false;
      const url = greetingAudioUrl;
      if (!url) return false;
      const audio = getOutputAudio();
      if (!audio) return false;
      try {
        setMobileDebug((prev) => ({
          ...prev,
          tapReceived: "yes",
          audioBlobSize: greetingAudioBlobSize,
          audioUrlCreated: greetingAudioUrlCreated,
          audioPlayCalled: "no",
          audioPlaySuccess: "pending",
          exactError: greetingPreloadError || "none",
        }));
        const playbackClaim = claimVoicePlayback();
        registerVoiceAudio(audio);
        audioRef.current = audio;
        audio.muted = false;
        audio.volume = 0.82;
        audio.defaultMuted = false;
        audio.src = url;
        audio.preload = "auto";
        audio.setAttribute("playsinline", "");
        (audio as any).playsInline = true;
        try {
          audio.load();
        } catch {}
        speakingRef.current = true;

        let playbackEndFallback: number | null = null;
        const finish = (ok: boolean, reason?: string) => {
          const ownsPlayback = isVoicePlaybackClaimCurrent(playbackClaim);
          if (ownsPlayback) speakingRef.current = false;
          if (playbackEndFallback) {
            window.clearTimeout(playbackEndFallback);
            playbackEndFallback = null;
          }
          audio.onplaying = null;
          audio.onended = null;
          audio.onerror = null;
          unregisterVoiceAudio(audio);
          releaseVoicePlaybackClaim(playbackClaim);
          if (ok) {
            setMobileDebug((prev) => ({
              ...prev,
              audioUnlocked: "yes",
              audioPlaySuccess: "yes",
              appAudioMuted: audio.muted ? "yes" : "no",
              appAudioVolume: String(audio.volume),
              exactError: "none",
            }));
            started = true;
            markGreeted();
            void runFlow();
            return;
          }
          // ElevenLabs playback blocked mid-gesture on mobile. Show the
          // "Tap to Enable Voice" overlay so a real tap can unlock audio,
          // then Chef will greet with the polished ElevenLabs voice.
          const mediaErr = audio.error
            ? { code: audio.error.code, message: audio.error.message }
            : null;
          console.warn("[voice] in-gesture greeting failed", { mediaError: mediaErr });
          setMobileDebug((prev) => ({
            ...prev,
            audioPlaySuccess: "no",
            exactError:
              reason ||
              (mediaErr
                ? `media ${mediaErr.code}: ${mediaErr.message}`
                : "in-gesture audio play failed"),
          }));
          pendingSpeechRef.current = {
            text: GREETING_TEXT,
            kind: "greeting",
            audioUrl: greetingAudioUrl ?? undefined,
            audioBase64: greetingAudioBase64 ?? undefined,
          };
          setAudioDebug((prev) => [
            ...prev.slice(-6),
            `in-gesture greeting failed${mediaErr ? ` err=${mediaErr.code}` : ""}`,
          ]);
          setAudioBlocked(true);
        };
        let playbackBegan = false;
        const fallbackFinish = window.setTimeout(() => {
          if (!playbackBegan) finish(false, "audio.play() did not begin within 5 seconds");
        }, 5000);
        audio.onplaying = () => {
          playbackBegan = true;
          playbackEndFallback = window.setTimeout(() => finish(true), 8000);
          setVoiceLoading(false);
          markVoiceAudioUnlocked();
          setAudioUnlocked(true);
          setMobileDebug((prev) => ({
            ...prev,
            audioUnlocked: "yes",
            audioPlaySuccess: "yes",
            appAudioMuted: audio.muted ? "yes" : "no",
            appAudioVolume: String(audio.volume),
            exactError: "none",
          }));
          emitVoiceMeter({ phase: "speaking", note: "welcome audio started" });
        };
        audio.onended = () => {
          window.clearTimeout(fallbackFinish);
          finish(true);
        };
        audio.onerror = () => {
          window.clearTimeout(fallbackFinish);
          finish(false);
        };

        // Call play() synchronously — do not await, do not wrap in a promise
        // chain that yields before this call.
        setMobileDebug((prev) => ({
          ...prev,
          audioPlayCalled: "yes",
          appAudioMuted: audio.muted ? "yes" : "no",
          appAudioVolume: String(audio.volume),
        }));
        const p = audio.play();
        setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "pending" }));
        if (p && typeof p.then === "function") {
          p.catch((err) => {
            setMobileDebug((prev) => ({
              ...prev,
              audioPlaySuccess: "no",
              exactError: exactError(err),
            }));
            finish(false, exactError(err));
          });
        }
        return true;
      } catch {
        setMobileDebug((prev) => ({
          ...prev,
          audioPlaySuccess: "no",
          exactError: "in-gesture audio play threw before audio.play()",
        }));
        return false;
      }
    };

    const playPendingAudioInGesture = (pending: {
      text: string;
      kind: "greeting" | "reply";
      audioUrl?: string;
      audioBase64?: string;
    }): boolean => {
      const url =
        pending.audioUrl ||
        (pending.audioBase64 ? `data:audio/mpeg;base64,${pending.audioBase64}` : undefined);
      if (!url) return false;
      const audio = getOutputAudio();
      if (!audio) return false;
      // Close the microphone first: on iPhone a live capture stream owns the
      // audio session and can silence playback or echo Chef back into itself.
      try {
        recognizerRef.current?.stop();
      } catch {
        /* ignore */
      }
      try {
        setMobileDebug((prev) => ({
          ...prev,
          tapReceived: "yes",
          audioUrlCreated: "yes",
          audioPlayCalled: "no",
          audioPlaySuccess: "pending",
          exactError: "none",
        }));
        const playbackClaim = claimVoicePlayback();
        registerVoiceAudio(audio);
        audioRef.current = audio;
        audio.muted = false;
        audio.volume = 0.82;
        audio.defaultMuted = false;
        audio.preload = "auto";
        audio.setAttribute("playsinline", "");
        (audio as any).playsInline = true;
        audio.src = url;
        try {
          audio.load();
        } catch {}
        speakingRef.current = true;
        setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "pending", exactError: "none" }));

        let playbackEndFallback: number | null = null;
        const finish = (ok: boolean, reason?: string) => {
          const ownsPlayback = isVoicePlaybackClaimCurrent(playbackClaim);
          if (ownsPlayback) speakingRef.current = false;
          if (playbackEndFallback) {
            window.clearTimeout(playbackEndFallback);
            playbackEndFallback = null;
          }
          audio.onplaying = null;
          audio.onended = null;
          audio.onerror = null;
          unregisterVoiceAudio(audio);
          releaseVoicePlaybackClaim(playbackClaim);
          setMobileDebug((prev) => ({
            ...prev,
            audioUnlocked: ok ? "yes" : prev.audioUnlocked,
            audioPlaySuccess: ok ? "yes" : "no",
            appAudioMuted: audio.muted ? "yes" : "no",
            appAudioVolume: String(audio.volume),
            exactError: ok ? "none" : reason || "prepared ElevenLabs audio failed to play",
          }));
          if (ok) {
            if (pending.kind === "greeting") {
              started = true;
              markGreeted();
            }
            void runFlow();
          } else {
            pendingSpeechRef.current = pending;
            setAudioBlocked(true);
          }
        };

        audio.onplaying = () => {
          playbackEndFallback = window.setTimeout(() => finish(true), 12000);
          markVoiceAudioUnlocked();
          setAudioUnlocked(true);
          setVoiceLoading(false);
          setMobileDebug((prev) => ({
            ...prev,
            audioUnlocked: "yes",
            audioPlaySuccess: "yes",
            appAudioMuted: audio.muted ? "yes" : "no",
            appAudioVolume: String(audio.volume),
            exactError: "none",
          }));
          emitVoiceMeter({
            phase: "speaking",
            note: pending.kind === "greeting" ? "welcome audio started" : "reply audio started",
          });
        };
        audio.onended = () => finish(true);
        audio.onerror = () => {
          const mediaErr = audio.error
            ? `media ${audio.error.code}: ${audio.error.message}`
            : "audio error";
          finish(false, mediaErr);
        };
        setMobileDebug((prev) => ({
          ...prev,
          audioPlayCalled: "yes",
          appAudioMuted: audio.muted ? "yes" : "no",
          appAudioVolume: String(audio.volume),
        }));
        const p = audio.play();
        if (p && typeof p.then === "function") p.catch((err) => finish(false, exactError(err)));
        return true;
      } catch (err) {
        setMobileDebug((prev) => ({
          ...prev,
          audioPlaySuccess: "no",
          exactError: exactError(err),
        }));
        return false;
      }
    };

    const firstTap = (event?: Event) => {
      const target = event?.target as Element | null;
      if (
        target &&
        typeof (target as any).closest === "function" &&
        target.closest("[data-mobile-voice-button]")
      ) {
        return;
      }
      if (bootstrapped) return;
      bootstrapped = true;
      setMobileDebug((prev) => ({ ...prev, tapReceived: "yes", exactError: "none" }));
      setShowMobileStart(false);
      removeFirstTap();
      // Try to play the greeting IN the gesture before any async unlock work.
      // This is the Android-critical path: the first audible play() must happen
      // directly inside the tap handler.
      const playedGreetingInGesture =
        !started && !speakingRef.current && playGreetingInGesture();
      if (!playedGreetingInGesture) {
        // If the real greeting is not preloaded yet, unlock the audio element
        // with a silent sound before asking for microphone permission. This
        // preserves the user gesture for iPhone/Android audio playback.
        void unlockVoiceAudio().then((ok) => {
          logVoiceStage("audio unlocked", { ok });
          setAudioUnlocked(ok);
          setMobileDebug((prev) => ({
            ...prev,
            audioUnlocked: ok ? "yes" : "no",
            exactError: ok ? prev.exactError : "mobile silent unlock failed",
          }));
          if (!ok)
            setMobileDebug((prev) => ({ ...prev, exactError: "mobile silent unlock failed" }));
        });
      }
      // Do not request microphone access here. On phones, opening the mic in
      // the same tap as audio playback can steal the mobile audio session and
      // make the ElevenLabs greeting resolve without audible sound. The mic is
      // requested only after the greeting has fully ended inside runFlow().
      if (playedGreetingInGesture) return;
      // Fallback for browsers that need a silent unlock first.
      void runFlow();
    };

    const removeFirstTap = () => {
      window.removeEventListener("pointerdown", firstTap, { capture: true } as any);
      window.removeEventListener("touchstart", firstTap, { capture: true } as any);
      window.removeEventListener("click", firstTap, { capture: true } as any);
    };

    startVoiceFromTapRef.current = () => firstTap();

    // Called from the "Tap to Enable Voice" overlay. Must run synchronously
    // inside the button's click handler so audio.play() satisfies the iOS
    // Safari / Chrome autoplay policy.
    unlockHandlerRef.current = () => {
      const pending = pendingSpeechRef.current;
      pendingSpeechRef.current = null;
      setAudioBlocked(false);
      setShowMobileStart(false);
      setMobileDebug((prev) => ({
        ...prev,
        tapReceived: "yes",
        audioPlaySuccess: "pending",
        exactError: "none",
      }));
      if (!pending) {
        void unlockVoiceAudio().then((ok) => {
          logVoiceStage("audio unlocked", { ok });
          setAudioUnlocked(ok);
          setMobileDebug((prev) => ({ ...prev, audioUnlocked: ok ? "yes" : "no" }));
          setAudioDebug((prev) => [
            ...prev.slice(-6),
            ok ? "audio unlocked by tap" : "audio unlock failed",
          ]);
          if (!ok)
            setMobileDebug((prev) => ({
              ...prev,
              audioPlaySuccess: "no",
              exactError: "mobile audio unlock failed",
            }));
        });
        void runFlow();
        return;
      }
      if (playPendingAudioInGesture(pending)) return;
      if (pending.kind === "greeting") {
        if (playGreetingInGesture()) return;
        // Kick runFlow — greeting will replay with the freshly-unlocked audio.
        started = false;
        void runFlow();
      } else {
        // A pending reply: re-speak it, then keep the loop going.
        void (async () => {
          await speak(pending.text);
          if (!runningRef.current) void runFlow();
        })();
      }
    };

    const mobile = isMobileVoiceEnvironment();

    // Silent autoplay recovery. There is no visible voice button any more, so
    // if the browser blocked the automatic greeting we quietly retry on the
    // very first real interaction anywhere in the app. Passive + capture so it
    // never interferes with normal taps, and it removes itself once used.
    const silentRecover = (event: Event) => {
      if (!event.isTrusted) return;
      if (!getVoiceEnabled() || speakingRef.current || isVoicePlaybackClaimed()) return;
      try {
        if (pendingSpeechRef.current) unlockHandlerRef.current?.();
        else if (!bootstrapped) firstTap(event);
        else void unlockVoiceAudio();
      } catch {
        /* fail silently — never block the UI */
      }
    };
    window.addEventListener("pointerdown", silentRecover, { capture: true, passive: true });
    window.addEventListener("touchstart", silentRecover, { capture: true, passive: true });
    window.addEventListener("keydown", silentRecover, { capture: true });
    const onVoicePreference = () => {
      speechEpochRef.current += 1;
      if (!getVoiceEnabled()) {
        loopingRef.current = false;
        finishActiveListenRef.current?.();
        recognizerRef.current?.stop();
      } else {
        loopingRef.current = true;
        void runFlow();
      }
    };
    window.addEventListener(VOICE_PREF_EVENT, onVoicePreference);


    // Begin the hands-free loop immediately on every platform. Native builds
    // can autoplay; mobile browsers are allowed to block the opening greeting,
    // but that must never prevent automatic microphone activation.
    (async () => {
      try {
        if (!mobile && !isNativeApp()) void requestMicPermission().then(setMicState);
        else setMicState("granted");
        bootstrapped = true;
        void runFlow();
      } catch {
        bootstrapped = true;
        void runFlow();
      }
    })();

    // Fridge intro tap also counts.
    const onTap = (event: Event) => {
      // The fridge intro dispatches an automatic CustomEvent when the doors
      // open. On phones that synthetic event is not a user gesture, so letting
      // it start voice consumes the bootstrap and blocks audio. Real mobile
      // starts come from pointer/touch/click listeners above.
      if (mobile && !event.isTrusted) return;
      firstTap(event);
    };
    window.addEventListener(FRIDGE_INTRO_VOICE_TAP_EVENT, onTap);

    // Companion Mode and its quick actions feed the active background voice
    // loop directly. A queued prompt runs after any current Chef reply, then
    // the microphone automatically returns to listening.
    const onCompanionOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ prefill?: string; autoListen?: boolean }>).detail;
      const prefill = detail?.prefill?.trim();
      if (prefill) pendingCompanionPromptRef.current = prefill;
      setMicState("granted");
      loopingRef.current = true;
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {}
      }
      if (!runningRef.current) void runFlow();
    };
    window.addEventListener("tfc:open-chef-voice", onCompanionOpen as EventListener);

    // Lines Chef speaks outside this loop (e.g. photo results) are added to
    // the conversation memory so follow-up answers keep the photo context.
    const onChefSaid = (event: Event) => {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text?.trim();
      if (!text) return;
      historyRef.current.push({ role: "assistant", text } as Turn);
      saveHistory(historyRef.current);
    };
    window.addEventListener("tfc:chef-said", onChefSaid as EventListener);

    const onVoiceOwnerChange = () => {
      if (getVoiceSessionOwner() !== "global") {
        finishActiveListenRef.current?.();
        try { recognizerRef.current?.stop(); } catch {}
        recognizerRef.current = null;
        runningRef.current = false;
        return;
      }
      loopingRef.current = true;
      lastActivityRef.current = Date.now();
      void runFlow();
    };
    window.addEventListener(VOICE_SESSION_EVENT, onVoiceOwnerChange);

    (window as any).__tfcRestartVoiceLoop = () => {
      setMicState("granted");
      void runFlow();
    };

    // ---------- Watchdog ----------
    // Speech recognition on iOS/Android sometimes stops firing events silently
    // (network hiccup, tab backgrounded, engine reset). If we stall while the
    // loop is meant to be running, tear down the recognizer and restart the
    // flow so the conversation resumes without a user tap.
    const WATCHDOG_MS = 45000;
    const watchdog = window.setInterval(() => {
      if (!loopingRef.current) return;
      if (!bootstrapped) return;
      if (speakingRef.current) {
        lastActivityRef.current = Date.now();
        return;
      }
      const idle = Date.now() - lastActivityRef.current;
      if (idle < WATCHDOG_MS) return;
      console.warn("[voice] WATCHDOG_RESTART", { idleMs: idle, running: runningRef.current });
      try {
        recognizerRef.current?.stop();
      } catch {}
      recognizerRef.current = null;
      // Break any in-flight listenOnce promise and reset flags so runFlow
      // can be re-entered cleanly.
      runningRef.current = false;
      lastActivityRef.current = Date.now();
      void runFlow();
    }, 5000);

    // Also restart when the tab comes back to the foreground; recognition
    // is almost always killed by the OS while backgrounded.
    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        try {
          recognizerRef.current?.stop();
        } catch {}
        recognizerRef.current = null;
        runningRef.current = false;
        stopAllAudio();
        releaseAudioGate();
        resetMicActivity();
        return;
      }
      if (!loopingRef.current || !bootstrapped) return;
      lastActivityRef.current = 0; // force watchdog next tick
    };
    const onPageHide = () => {
      try {
        recognizerRef.current?.stop();
      } catch {}
      recognizerRef.current = null;
      runningRef.current = false;
      stopAllAudio();
      releaseAudioGate();
      resetMicActivity();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      finishActiveListenRef.current?.();
      loopingRef.current = false;
      runningRef.current = false;
      setShowMobileStart(false);
      startVoiceFromTapRef.current = null;
      unlockHandlerRef.current = null;
      window.clearInterval(watchdog);
      window.clearTimeout(loadingHintTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onPageHide);
      removeFirstTap();
      window.removeEventListener("pointerdown", silentRecover, { capture: true } as any);
      window.removeEventListener("touchstart", silentRecover, { capture: true } as any);
      window.removeEventListener("keydown", silentRecover, { capture: true } as any);
      window.removeEventListener(VOICE_PREF_EVENT, onVoicePreference);
      window.removeEventListener(FRIDGE_INTRO_VOICE_TAP_EVENT, onTap);
      window.removeEventListener("tfc:open-chef-voice", onCompanionOpen as EventListener);
      window.removeEventListener("tfc:chef-said", onChefSaid as EventListener);
      window.removeEventListener(VOICE_SESSION_EVENT, onVoiceOwnerChange);
      try {
        recognizerRef.current?.stop();
      } catch {}
      try {
        audioRef.current?.pause();
      } catch {}
      stopAllAudio();
      releaseAudioGate();
      resetMicActivity();
      audioRef.current = null;
      delete (window as any).__tfcRestartVoiceLoop;
    };
  }, [chatFn, guestChatFn]);

  const mobileDebugPanel =
    clientReady && voiceDebugMode && isMobileVoiceEnvironment() ? (
      <div className="mt-4 rounded-2xl bg-white/5 p-3 text-left text-[11px] leading-relaxed text-white/70 ring-1 ring-white/10">
        <div>device: {mobileDeviceLabel()}</div>
        <div>tap received: {mobileDebug.tapReceived}</div>
        <div>microphone permission: {micState}</div>
        <div>audio unlocked: {audioUnlocked ? "yes" : mobileDebug.audioUnlocked}</div>
        <div>ElevenLabs request sent: {mobileDebug.elevenLabsRequestSent}</div>
        <div>ElevenLabs response success: {mobileDebug.elevenLabsResponseSuccess}</div>
        <div>audio blob size: {mobileDebug.audioBlobSize ?? "none"}</div>
        <div>audio URL created: {mobileDebug.audioUrlCreated}</div>
        <div>audio.play called: {mobileDebug.audioPlayCalled}</div>
        <div>audio play success: {mobileDebug.audioPlaySuccess}</div>
        <div>app muted: {mobileDebug.appAudioMuted}</div>
        <div>app volume: {mobileDebug.appAudioVolume}</div>
        <div>exact error: {mobileDebug.exactError}</div>
        {audioDebug.map((line, i) => (
          <div key={i}>• {line}</div>
        ))}
      </div>
    ) : null;

  // "Tap to Enable Voice" overlay — shown on iPhone/Android so a real user
  // gesture unlocks the exact same ElevenLabs Chef Super J audio used on desktop.
  // "Getting voice ready…" hint — shown while the ElevenLabs greeting is
  // still being fetched/prepared, so the user never hears a broken or cut-off
  // start. Auto-clears once the greeting actually begins playing.
  const readyHint = null;

  const persistentMobileDebug =
    clientReady && voiceDebugMode && isMobileVoiceEnvironment() ? (
      <details
        open
        className="fixed bottom-3 left-3 z-[190] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-neutral-950/85 px-3 py-2 text-[11px] text-white/80 shadow-xl ring-1 ring-white/10 backdrop-blur"
      >
        <summary className="cursor-pointer font-semibold text-white">Voice debug</summary>
        <div className="mt-2 space-y-0.5">
          <div>device: {mobileDeviceLabel()}</div>
          <div>tap received: {mobileDebug.tapReceived}</div>
          <div>microphone permission: {micState}</div>
          <div>audio unlocked: {audioUnlocked ? "yes" : mobileDebug.audioUnlocked}</div>
          <div>greeting audio ready: {greetingReady ? "yes" : "no"}</div>
          <div>ElevenLabs request sent: {mobileDebug.elevenLabsRequestSent}</div>
          <div>ElevenLabs response success: {mobileDebug.elevenLabsResponseSuccess}</div>
          <div>audio blob size: {mobileDebug.audioBlobSize ?? "none"}</div>
          <div>audio URL created: {mobileDebug.audioUrlCreated}</div>
          <div>audio.play called: {mobileDebug.audioPlayCalled}</div>
          <div>audio play success: {mobileDebug.audioPlaySuccess}</div>
          <div>app muted: {mobileDebug.appAudioMuted}</div>
          <div>app volume: {mobileDebug.appAudioVolume}</div>
          <div>exact error: {mobileDebug.exactError}</div>
        </div>
      </details>
    ) : null;

  // Small, discreet mute icon in the top-right corner. On mobile web this
  // also acts as the guaranteed user-gesture surface: if the visitor hasn't
  // yet tapped anywhere else, tapping this icon unlocks audio and kicks off
  // the ElevenLabs Chef Super J greeting → listen → answer loop. After the
  // greeting is playing, it toggles mute/unmute. Never a large button.
  // No visible mute/voice button: audio starts automatically, and if a browser
  // blocks autoplay we silently recover on the first normal interaction.
  const muteIcon = null;
  void audioBlocked;
  void audioUnlocked;

  return (
    <>
      {readyHint}
      {muteIcon}
      {mobileDebugPanel}
      {persistentMobileDebug}
    </>
  );
}

