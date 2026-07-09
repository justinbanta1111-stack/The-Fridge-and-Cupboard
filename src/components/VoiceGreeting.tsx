import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  FRIDGE_INTRO_VOICE_TAP_EVENT,
  getVoiceEnabled,
  isMobileVoiceEnvironment,
  markGreeted,
  stopAllAudio,
  unlockVoiceAudio,
  getOutputAudio,
  getVoicePersonality,
  markVoiceAudioUnlocked,
} from "@/lib/voice-assistant";
import { synthesizeChefVoice } from "@/lib/tts.functions";
import { playFridgeOpen } from "@/lib/sound-effects";
import {
  VoiceRecognizer,
  isRecognitionSupported,
  requestMicPermission,
} from "@/lib/voice-recognition";
import { chatWithChef } from "@/lib/voice-chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { dietLabel } from "@/lib/personalization";
import { emitVoiceMeter } from "@/components/VoiceStatusMeter";

/**
 * Hands-free voice runtime.
 *
 *   Mobile:  first user tap  →  unlock audio (sync)  →  welcome  →  mic prompt  →  loop
 *   Desktop: mount            →  request mic         →  welcome  →  loop
 */
const GREETING_TEXT =
  "Welcome to The Fridge & Cupboard. What can we cook today?";
// Cached data-URL of the ElevenLabs Chef Super J greeting, preloaded on mount
// so the first user tap can call audio.play() synchronously (required on
// Android Chrome / Samsung Internet). Falls back to on-demand fetch if the
// preload hasn't finished by the time the user taps.
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
  try { return JSON.stringify(err); } catch { return String(err); }
}

function mobileDeviceLabel(): "iPhone/iPad" | "Android" | "other mobile" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone/iPad";
  if (/Android/i.test(ua)) return "Android";
  return isMobileVoiceEnvironment() ? "other mobile" : "desktop";
}

function audioFromBase64(base64: string): { url: string; blobSize: number; urlCreated: "yes" | "no"; error?: string } {
  const estimatedBytes = Math.max(0, Math.floor((base64.length * 3) / 4));
  if (!isMobileVoiceEnvironment()) {
    return { url: `data:audio/mpeg;base64,${base64}`, blobSize: estimatedBytes, urlCreated: "yes" };
  }
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    return { url: URL.createObjectURL(blob), blobSize: blob.size, urlCreated: "yes" };
  } catch (err) {
    const message = exactError(err);
    console.warn("[voice] mobile blob audio URL failed; using data URL", err);
    return { url: `data:audio/mpeg;base64,${base64}`, blobSize: estimatedBytes, urlCreated: "yes", error: message };
  }
}

function mobileAudioFromBase64(base64: string): { audio: HTMLAudioElement; url: string; blobSize: number } {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.muted = false;
  audio.defaultMuted = false;
  audio.volume = 1;
  audio.setAttribute("playsinline", "");
  (audio as any).playsInline = true;
  return { audio, url, blobSize: blob.size };
}

async function preloadGreetingAudio(): Promise<string | null> {
  if (greetingAudioUrl) return greetingAudioUrl;
  if (greetingPreloadPromise) return greetingPreloadPromise;
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
        return greetingAudioUrl;
      }
      greetingPreloadError = res?.error || "ElevenLabs returned no greeting audio";
    } catch (err) {
      greetingPreloadError = exactError(err);
      console.error("[voice] greeting preload failed", err);
    }
    greetingPreloadPromise = null;
    return null;
  })();
  return greetingPreloadPromise;
}

const HISTORY_KEY = "tfc.voice.history.v1";
const DISMISSED_KEY = "tfc.voice.popup.dismissed.v1";
const REOPEN_EVENT = "tfc:voice:reopen-popup";
const MAX_HISTORY = 20;

let started = false; // module-level guard: greeting plays only once per load

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
  try { return sessionStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
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
  const { prefs } = useDietaryPrefs();
  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<Turn[]>(loadHistory());
  const loopingRef = useRef(true);
  const runningRef = useRef(false);
  const speakingRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastMicMsRef = useRef<number>(0);
  const micStateRef = useRef<MicState>("idle");
  const mobileMicPermissionPromiseRef = useRef<Promise<MicState> | null>(null);
  const mobileButtonGestureAtRef = useRef(0);
  const startVoiceFromTapRef = useRef<(() => void) | null>(null);
  const unlockHandlerRef = useRef<(() => void) | null>(null);
  const pendingSpeechRef = useRef<{ text: string; kind: "greeting" | "reply"; audioUrl?: string; audioBase64?: string } | null>(null);
  const [micState, setMicStateValue] = useState<MicState>("idle");
  const [dismissed, setDismissed] = useState<boolean>(() => isPopupDismissed());
  const [showMobileStart, setShowMobileStart] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioDebug, setAudioDebug] = useState<string[]>([]);
  const [mobileDebug, setMobileDebug] = useState<MobileVoiceDebug>(initialMobileDebug);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [greetingReady, setGreetingReady] = useState<boolean>(!!greetingAudioUrl);
  const [clientReady, setClientReady] = useState(false);
  const [voiceDebugMode, setVoiceDebugMode] = useState(false);

  const setMicState = (status: MicState) => {
    micStateRef.current = status;
    setMicStateValue(status);
  };



  useEffect(() => {
    setClientReady(true);
    // Voice debug panel is hidden from normal users. Enable only via URL
    // (?voiceDebug=1) or by setting localStorage.tfc_voice_debug = "1".
    try {
      const url = new URL(window.location.href);
      const param = url.searchParams.get("voiceDebug");
      const stored = typeof localStorage !== "undefined" ? localStorage.getItem("tfc_voice_debug") : null;
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
      const hit = target.closest<HTMLElement>(
        '[data-voice-trigger], [aria-label*="microphone" i], [aria-label*="mic" i], [aria-label*="voice" i], [title*="microphone" i], [title*="voice" i]'
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
          const mic = await (navigator as any).permissions.query({ name: "microphone" as PermissionName });
          info.micPermission = mic.state;
          mic.onchange = () => console.info("[voice] mic permission changed →", mic.state);
        }
      } catch (e) {
        info.micPermissionError = String(e);
      }
      console.info("[voice] ENV", info);
    })();

    // Kick off ElevenLabs Chef Super J greeting preload so we can play it
    // synchronously inside the first user gesture on Android. Show a
    // "Getting voice ready…" hint if the preload / first playback drags on.
    if (!started) setVoiceLoading(true);
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
        setMobileDebug((prev) => ({
          ...prev,
          elevenLabsResponseSuccess: "no",
          exactError: greetingPreloadError || "ElevenLabs greeting preload failed",
        }));
        setVoiceLoading(false);
        return;
      }
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
        if (audio && !started && !isMobileVoiceEnvironment()) {
          audio.preload = "auto";
          audio.src = url;
          audio.load();
        }
      } catch (err) {
        console.error("[voice] greeting preload attach failed", err);
      }
    });





    async function speak(text: string): Promise<void> {
      return new Promise(async (resolve) => {
        try {
          try { recognizerRef.current?.stop(); } catch {}
          recognizerRef.current = null;

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
          const res = await synthesizeChefVoice({ data: { text } });
          if (!res?.audio) {
            const reason = res?.error || "ElevenLabs returned no audio";
            console.warn("[voice] ElevenLabs returned no audio", { mobile: isMobileVoiceEnvironment(), reason });
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
          stopAllAudio();
          const mobilePlayback = isMobileVoiceEnvironment();
          const audio = mobilePlayback ? new Audio(audioResult.url) : getOutputAudio();
          if (!audio) {
            const reason = "No audio element available";
            console.warn("[voice] no audio element", { mobile: isMobileVoiceEnvironment() });
            setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: reason }));
            return resolve();
          }
          audioRef.current = audio;
          audio.muted = false;
          audio.volume = 1;
          audio.defaultMuted = false;
          if (!mobilePlayback) audio.src = audioResult.url;
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
            markVoiceAudioUnlocked();
            setMobileDebug((prev) => ({
              ...prev,
              audioUnlocked: "yes",
              audioPlaySuccess: "yes",
              appAudioMuted: audio.muted ? "yes" : "no",
              appAudioVolume: String(audio.volume),
              exactError: "none",
            }));
            console.info("[voice] ElevenLabs audio STARTED", { ms: Date.now() - ttsStart, text: text.slice(0, 60) });
            emitVoiceMeter({ phase: "speaking", ms: Date.now() - ttsStart, note: "tts+first-audio" });
          };
          audio.onplaying = onPlaying;
          const done = () => {
            if (settled) return;
            settled = true;
            audio.onplaying = null;
            audio.onerror = null;
            audio.onended = null;
            if (mobilePlayback && audioResult.url.startsWith("blob:")) {
              try { URL.revokeObjectURL(audioResult.url); } catch {}
            }
            speakingRef.current = false;
            emitVoiceMeter({ phase: "listening", ms: Date.now() - speakStartedAt, note: "spoke" });
            resolve();
          };
          const doneWithFallback = async (evt?: unknown) => {
            if (settled) return;
            // CRITICAL: only fall back if ElevenLabs playback truly never
            // started AND we are on mobile. On desktop, browser voice must
            // never speak — this prevents two voices overlapping.
            if (playbackBegan) {
              // Transient error mid-playback — playback is already audible.
              // Don't start a second voice; just resolve normally.
              console.warn("[voice] audio error after playback began — ignoring (no fallback)", evt);
              return done();
            }
            settled = true;
            audio.onplaying = null;
            audio.onerror = null;
            audio.onended = null;
            if (mobilePlayback && audioResult.url.startsWith("blob:")) {
              try { URL.revokeObjectURL(audioResult.url); } catch {}
            }
            const mobile = isMobileVoiceEnvironment();
            const mediaErr = audio.error ? { code: audio.error.code, message: audio.error.message } : null;
            const evtType = (evt && (evt as any).type) || (evt instanceof Error ? evt.message : String(evt || ""));
            console.warn("[voice] ElevenLabs playback DID NOT START", { mobile, mediaError: mediaErr, evt: evtType });
            setMobileDebug((prev) => ({
              ...prev,
            tapReceived: "yes",
              audioPlaySuccess: "no",
              exactError: `${evtType || "audio play blocked"}${mediaErr ? `; media ${mediaErr.code}: ${mediaErr.message}` : ""}`,
            }));
            if (mobile) {
              // Mobile autoplay blocked. Stash the text and show the
              // "Tap to Enable Voice" overlay — a real user tap can then
              // call audio.play() synchronously (iOS Safari requirement).
              pendingSpeechRef.current = { text, kind: "reply", audioUrl: audio.src, audioBase64: res.audio };
              setAudioDebug((prev) => [
                ...prev.slice(-6),
                `reply blocked: ${evtType || "no start"}${mediaErr ? ` err=${mediaErr.code}` : ""}`,
              ]);
              setAudioBlocked(true);
            } else {
              console.info("[voice] desktop — skipping browser fallback (single-voice policy)");
            }
            speakingRef.current = false;
            resolve();
          };
          audio.onended = done;
          audio.onerror = doneWithFallback;
          try { audio.load(); } catch {}
          setMobileDebug((prev) => ({
            ...prev,
            audioPlayCalled: "yes",
            appAudioMuted: audio.muted ? "yes" : "no",
            appAudioVolume: String(audio.volume),
          }));
          await audio.play().catch(doneWithFallback);
        } catch (err) {
          console.error("[voice] speak() threw", err);
          setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: exactError(err) }));
          speakingRef.current = false;
          resolve();
        }
      });
    }



    async function requestMicOnce(): Promise<MicState> {
      if (micStateRef.current === "granted") return "granted";
      const pendingMobilePermission = mobileMicPermissionPromiseRef.current;
      const status = pendingMobilePermission ? await pendingMobilePermission : await requestMicPermission();
      setMicState(status);
      if (status !== "granted") mobileMicPermissionPromiseRef.current = null;
      return status;
    }

    async function listenOnce(): Promise<string | null> {
      if (!isRecognitionSupported()) return null;
      while (speakingRef.current) {
        await new Promise((r) => setTimeout(r, 20));
      }
      console.info("[voice] MIC_STARTED");
      lastActivityRef.current = Date.now();
      const micStart = Date.now();
      emitVoiceMeter({ phase: "listening", note: "mic open" });
      return new Promise((resolve) => {
        const rec = new VoiceRecognizer();
        recognizerRef.current = rec;
        let done = false;
        let denied = false;
        let finalText: string | null = null;
        const finish = (text: string | null) => {
          if (done) return;
          done = true;
          try { rec.stop(); } catch {}
          lastMicMsRef.current = Date.now() - micStart;
          const cleaned = (text ?? finalText ?? "").trim();
          console.info("[voice] MIC_FINISHED", { hasText: !!cleaned, chars: cleaned.length, ms: lastMicMsRef.current });
          resolve(denied ? "__DENIED__" : cleaned || null);
        };
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
      const transcript = await listenOnce();
      if (transcript === "__DENIED__") {
        // Mic denied for this attempt (mobile web transient race,
        // audio-session conflict, etc.). Wait briefly and keep the
        // loop alive instead of stopping the conversation.
        console.warn("[voice] mic denied this turn — retrying");
        await new Promise((r) => setTimeout(r, 800));
        return "continue";
      }
      if (!transcript) return "continue";
      console.info("[voice] AI_REQUEST_SENT", { chars: transcript.length });
      historyRef.current.push({ role: "user", text: transcript });
      saveHistory(historyRef.current);
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          await speak(
            "Sign in any time and I'll connect your fridge, recipes, and savings.",
          );
          return "continue";
        }
        emitVoiceMeter({ phase: "thinking", ms: lastMicMsRef.current, note: transcript.slice(0, 60) });
        const thinkStart = Date.now();
        const reply = await chatFn({
          data: {
            message: transcript,
            // Pass the full recent window so Chef remembers the whole meal
            // being planned across many turns (dishes, ingredients, spice
            // level, etc.), not just the last exchange.
            history: historyRef.current.slice(-10),
            restrictions: prefs.map((p) => dietLabel(p)),
            voicePersonality: getVoicePersonality(),
          },
        });
        if (reply?.reply) {
          console.info("[voice] AI_RESPONSE_RECEIVED", { chars: reply.reply.length, intent: reply.intent });
          historyRef.current.push({ role: "assistant", text: reply.reply });
          saveHistory(historyRef.current);
          emitVoiceMeter({ phase: "speaking", ms: Date.now() - thinkStart, note: "llm done" });
          // Reply immediately — no artificial thinking pause.
          await speak(reply.reply);
        } else {
          await speak("I didn't quite catch that. Try again?");
        }
      } catch (err) {
        console.error("[voice] chat reply failed", err);
        try {
          await speak("I heard you, but my chef brain hiccuped. Say that one more time?");
        } catch {
          /* even TTS fell over — keep looping instead of stopping */
        }
      }
      return "continue";
    }

    async function runFlow() {
      if (runningRef.current) return;
      if (!getVoiceEnabled()) return;
      runningRef.current = true;
      loopingRef.current = true;

      try {
        await unlockVoiceAudio();

        if (!started) {
          let greetingOk = false;
          try {
            setVoiceLoading(true);
            const url = greetingAudioUrl ?? (await preloadGreetingAudio());
            if (!url) throw new Error("no greeting audio");
            stopAllAudio();
            const audio = getOutputAudio();
            if (!audio) throw new Error("no audio element");
            audioRef.current = audio;
            audio.muted = false;
            audio.volume = 1;
            audio.defaultMuted = false;
            audio.src = url;
            audio.preload = "auto";
            audio.setAttribute("playsinline", "");
            (audio as any).playsInline = true;
            try { audio.load(); } catch {}
            // Wait until the browser has enough data to play the greeting
            // through without stalling — prevents mid-word cut-offs.
            await new Promise<void>((ready) => {
              if (audio.readyState >= 4) return ready();
              const onReady = () => {
                audio.removeEventListener("canplaythrough", onReady);
                ready();
              };
              audio.addEventListener("canplaythrough", onReady, { once: true });
              // Hard cap so we never hang forever on flaky networks.
              window.setTimeout(() => {
                audio.removeEventListener("canplaythrough", onReady);
                ready();
              }, 4000);
            });
            if (!isMobileVoiceEnvironment()) {
              try { void playFridgeOpen(); } catch {}
            }
            speakingRef.current = true;
            greetingOk = await new Promise<boolean>((resolve) => {
              let settled = false;
              const done = (ok: boolean) => {
                if (settled) return;
                settled = true;
                speakingRef.current = false;
                resolve(ok);
              };
              audio.onplaying = () => {
                setVoiceLoading(false);
                markVoiceAudioUnlocked();
                setAudioUnlocked(true);
                setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "yes", exactError: "none" }));
                emitVoiceMeter({ phase: "speaking", note: "welcome audio started" });
              };
              audio.onended = () => done(true);
              audio.onerror = () => {
                const mediaErr = audio.error ? `media ${audio.error.code}: ${audio.error.message}` : "audio error";
                setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: mediaErr }));
                done(false);
              };
              setMobileDebug((prev) => ({
                ...prev,
                audioPlayCalled: "yes",
                appAudioMuted: audio.muted ? "yes" : "no",
                appAudioVolume: String(audio.volume),
              }));
              audio.play().then(() => {}).catch((err) => {
                setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: exactError(err) }));
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
            if (isMobileVoiceEnvironment()) {
              // Mobile autoplay blocked the greeting. Show "Tap to Enable Voice"
              // so the user can unlock audio with a real tap, then Chef will
              // greet with the polished ElevenLabs voice — not the browser voice.
              pendingSpeechRef.current = { text: GREETING_TEXT, kind: "greeting", audioUrl: greetingAudioUrl ?? undefined, audioBase64: greetingAudioBase64 ?? undefined };
              setAudioDebug((prev) => [...prev.slice(-6), "greeting blocked by autoplay policy"]);
              setAudioBlocked(true);
              return; // wait for the user tap; runFlow will be re-entered
            }
            // Desktop: something odd happened; log and continue so the loop
            // doesn't stall. No browser TTS on desktop (single-voice policy).
            console.warn("[voice] desktop greeting failed — continuing without voice");
            started = true;
            markGreeted();
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
        if (!mobileWeb) {
          const status = await requestMicOnce();
          if (status !== "granted") return; // desktop: modal shown; loop paused
        } else {
          setMicState("granted");
        }

        while (loopingRef.current) {
          try {
            const s = await conversationTurn();
            if (s === "pause") break;
          } catch (err) {
            // Safety net: any unexpected throw shouldn't kill the loop.
            console.error("[voice] conversationTurn threw — continuing", err);
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
      const url = greetingAudioUrl;
      if (!url) return false;
      const mobilePlayback = isMobileVoiceEnvironment() && !!greetingAudioBase64;
      let mobileObjectUrl: string | null = null;
      let audio: HTMLAudioElement | null = null;
      try {
        if (mobilePlayback && greetingAudioBase64) {
          const mobileAudio = mobileAudioFromBase64(greetingAudioBase64);
          audio = mobileAudio.audio;
          mobileObjectUrl = mobileAudio.url;
          greetingAudioBlobSize = mobileAudio.blobSize;
          greetingAudioUrlCreated = "yes";
        } else {
          audio = getOutputAudio();
        }
      } catch (err) {
        setMobileDebug((prev) => ({
          ...prev,
          tapReceived: "yes",
          audioUrlCreated: "no",
          audioPlaySuccess: "no",
          exactError: `mobile audio blob creation failed: ${exactError(err)}`,
        }));
        return false;
      }
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
        stopAllAudio();
        audioRef.current = audio;
        audio.muted = false;
        audio.volume = 1;
        audio.defaultMuted = false;
        if (!mobileObjectUrl) audio.src = url;
        audio.preload = "auto";
        audio.setAttribute("playsinline", "");
        (audio as any).playsInline = true;
        try { audio.load(); } catch {}
        speakingRef.current = true;

        const finish = (ok: boolean, reason?: string) => {
          speakingRef.current = false;
          audio.onplaying = null;
          audio.onended = null;
          audio.onerror = null;
          if (mobileObjectUrl) {
            try { URL.revokeObjectURL(mobileObjectUrl); } catch {}
            mobileObjectUrl = null;
          }
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
          const mediaErr = audio.error ? { code: audio.error.code, message: audio.error.message } : null;
          console.warn("[voice] in-gesture greeting failed", { mediaError: mediaErr });
          setMobileDebug((prev) => ({
            ...prev,
            audioPlaySuccess: "no",
            exactError: reason || (mediaErr ? `media ${mediaErr.code}: ${mediaErr.message}` : "in-gesture audio play failed"),
          }));
          pendingSpeechRef.current = { text: GREETING_TEXT, kind: "greeting", audioUrl: greetingAudioUrl ?? undefined, audioBase64: greetingAudioBase64 ?? undefined };
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
        audio.onended = () => { window.clearTimeout(fallbackFinish); finish(true); };
        audio.onerror = () => { window.clearTimeout(fallbackFinish); finish(false); };

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
            setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: exactError(err) }));
            finish(false, exactError(err));
          });
        }
        return true;
      } catch {
        setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: "in-gesture audio play threw before audio.play()" }));
        return false;
      }
    };

    const playPendingAudioInGesture = (pending: { text: string; kind: "greeting" | "reply"; audioUrl?: string; audioBase64?: string }): boolean => {
      const url = pending.audioUrl;
      const mobilePlayback = isMobileVoiceEnvironment() && !!pending.audioBase64;
      if (!url && !pending.audioBase64) return false;
      let mobileObjectUrl: string | null = null;
      let mobileBlobSize: number | null = null;
      let audio: HTMLAudioElement | null = null;
      try {
        if (mobilePlayback && pending.audioBase64) {
          const mobileAudio = mobileAudioFromBase64(pending.audioBase64);
          audio = mobileAudio.audio;
          mobileObjectUrl = mobileAudio.url;
          mobileBlobSize = mobileAudio.blobSize;
        } else {
          audio = getOutputAudio();
        }
      } catch (err) {
        setMobileDebug((prev) => ({
          ...prev,
          tapReceived: "yes",
          audioUrlCreated: "no",
          audioPlaySuccess: "no",
          exactError: `mobile audio blob creation failed: ${exactError(err)}`,
        }));
        return false;
      }
      if (!audio) return false;
      try {
        setMobileDebug((prev) => ({
          ...prev,
          tapReceived: "yes",
          audioBlobSize: mobileBlobSize ?? prev.audioBlobSize,
          audioUrlCreated: url || mobileObjectUrl ? "yes" : "no",
          audioPlayCalled: "no",
          audioPlaySuccess: "pending",
          exactError: "none",
        }));
        stopAllAudio();
        audioRef.current = audio;
        audio.muted = false;
        audio.volume = 1;
        audio.defaultMuted = false;
        audio.preload = "auto";
        audio.setAttribute("playsinline", "");
        (audio as any).playsInline = true;
        if (!mobileObjectUrl && url) audio.src = url;
        try { audio.load(); } catch {}
        speakingRef.current = true;
        setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "pending", exactError: "none" }));

        const finish = (ok: boolean, reason?: string) => {
          speakingRef.current = false;
          audio.onplaying = null;
          audio.onended = null;
          audio.onerror = null;
          if (mobileObjectUrl) {
            try { URL.revokeObjectURL(mobileObjectUrl); } catch {}
            mobileObjectUrl = null;
          }
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
          emitVoiceMeter({ phase: "speaking", note: pending.kind === "greeting" ? "welcome audio started" : "reply audio started" });
        };
        audio.onended = () => finish(true);
        audio.onerror = () => {
          const mediaErr = audio.error ? `media ${audio.error.code}: ${audio.error.message}` : "audio error";
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
        setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: exactError(err) }));
        return false;
      }
    };

    const firstTap = (event?: Event) => {
      const target = event?.target as Element | null;
      if (target && typeof (target as any).closest === "function" && target.closest("[data-mobile-voice-button]")) {
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
      const playedGreetingInGesture = !started && playGreetingInGesture();
      if (!playedGreetingInGesture) {
        // If the real greeting is not preloaded yet, unlock the audio element
        // with a silent sound before asking for microphone permission. This
        // preserves the user gesture for iPhone/Android audio playback.
        void unlockVoiceAudio().then((ok) => {
          setAudioUnlocked(ok);
          setMobileDebug((prev) => ({
            ...prev,
            audioUnlocked: ok ? "yes" : "no",
            exactError: ok ? prev.exactError : "mobile silent unlock failed",
          }));
          if (!ok) setMobileDebug((prev) => ({ ...prev, exactError: "mobile silent unlock failed" }));
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

    const armFirstTap = () => {
      bootstrapped = false;
      // Mobile browsers require a real user gesture before audible AI voice.
      // Show the required unlock button, while still allowing the fridge tap
      // event / first page interaction to start the same path.
      setShowMobileStart(true);
      window.addEventListener("pointerdown", firstTap, { capture: true, passive: true });
      window.addEventListener("touchstart", firstTap, { capture: true, passive: true });
      window.addEventListener("click", firstTap, { capture: true });
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
      setMobileDebug((prev) => ({ ...prev, tapReceived: "yes", audioPlaySuccess: "pending", exactError: "none" }));
      if (!pending) {
        void unlockVoiceAudio().then((ok) => {
          setAudioUnlocked(ok);
          setMobileDebug((prev) => ({ ...prev, audioUnlocked: ok ? "yes" : "no" }));
          setAudioDebug((prev) => [...prev.slice(-6), ok ? "audio unlocked by tap" : "audio unlock failed"]);
          if (!ok) setMobileDebug((prev) => ({ ...prev, audioPlaySuccess: "no", exactError: "mobile audio unlock failed" }));
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

    if (mobile) {
      // Mobile: wait for first tap. Do NOT auto-request mic — that blocks
      // the whole chain on iOS/Samsung and never plays the welcome.
      armFirstTap();
    } else {
      // Desktop: try auto path (works in Chrome/Edge/Firefox once permission
      // has been granted before, and prompts otherwise).
      (async () => {
        try {
          void unlockVoiceAudio();
          const status = await requestMicPermission();
          setMicState(status);
          if (status === "granted") {
            bootstrapped = true;
            void runFlow();
            return;
          }
        } catch {}
        armFirstTap();
      })();
    }

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
      try { recognizerRef.current?.stop(); } catch {}
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
      if (document.visibilityState !== "visible") return;
      if (!loopingRef.current || !bootstrapped) return;
      lastActivityRef.current = 0; // force watchdog next tick
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      loopingRef.current = false;
      setShowMobileStart(false);
      startVoiceFromTapRef.current = null;
      unlockHandlerRef.current = null;
      window.clearInterval(watchdog);
      document.removeEventListener("visibilitychange", onVisible);
      removeFirstTap();
      window.removeEventListener(FRIDGE_INTRO_VOICE_TAP_EVENT, onTap);
      try { recognizerRef.current?.stop(); } catch {}
      try { audioRef.current?.pause(); } catch {}
      delete (window as any).__tfcRestartVoiceLoop;
    };
  }, [chatFn, prefs]);

  const runMobileVoiceButtonGesture = (action: "start" | "unlock") => {
    const now = Date.now();
    if (now - mobileButtonGestureAtRef.current < 700) return;
    mobileButtonGestureAtRef.current = now;
    if (action === "start") startVoiceFromTapRef.current?.();
    else unlockHandlerRef.current?.();
  };

  const mobileDebugPanel = clientReady && voiceDebugMode && isMobileVoiceEnvironment() ? (
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
  const readyHint = voiceLoading && !audioBlocked ? (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-[220] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur"
    >
      Getting voice ready…
    </div>
  ) : null;

  const persistentMobileDebug = clientReady && voiceDebugMode && isMobileVoiceEnvironment() ? (
    <details open className="fixed bottom-3 left-3 z-[190] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-neutral-950/85 px-3 py-2 text-[11px] text-white/80 shadow-xl ring-1 ring-white/10 backdrop-blur">
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


  if (showMobileStart) {
    return (
      <>
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-[210] flex justify-center px-4">
          <button
            type="button"
            data-mobile-voice-button="true"
            disabled={!greetingReady}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!greetingReady) return;
              runMobileVoiceButtonGesture("start");
            }}
            onTouchStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!greetingReady) return;
              runMobileVoiceButtonGesture("start");
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!greetingReady) return;
              runMobileVoiceButtonGesture("start");
            }}
            className="pointer-events-auto rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-black/10 active:scale-95 disabled:opacity-60"
          >
            {greetingReady ? "🔊 Enable Voice" : "Getting voice ready…"}
          </button>
        </div>
        {mobileDebugPanel}
      </>
    );
  }


  if (audioBlocked) {

    return (
      <>
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] z-[210] flex justify-center px-4">
          <button
            type="button"
            data-mobile-voice-button="true"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              runMobileVoiceButtonGesture("unlock");
            }}
            onTouchStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
              runMobileVoiceButtonGesture("unlock");
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              runMobileVoiceButtonGesture("unlock");
            }}
            className="pointer-events-auto rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-black/10 active:scale-95"
          >
            🔊 Enable Voice
          </button>
        </div>
        {mobileDebugPanel}
      </>
    );
  }


  // Never render a blocking mic-permission popup. If the mic is denied or
  // unsupported, silently skip — permission will be requested when the user
  // actually starts talking.
  return <>{readyHint}{persistentMobileDebug}</>;

}
