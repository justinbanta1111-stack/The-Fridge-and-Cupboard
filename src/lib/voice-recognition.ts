// Web Speech API recognition wrapper. Works on Chrome/Edge desktop, Chrome Android,
// Safari iOS 14.5+. Falls back gracefully when unsupported.
import { Capacitor } from "@capacitor/core";
import { MobileRecognizer } from "./mobile-recognizer";
import { isMobileVoiceEnvironment } from "./voice-assistant";

type Listener = {
  onPartial?: (t: string) => void;
  onFinal: (t: string) => void;
  onError?: (e: string) => void;
  onEnd?: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function isRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isMobileVoiceEnvironment() && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
    return true;
  }
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition) || isAndroidNativeApp();
}

function isAndroidNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export class VoiceRecognizer {
  private rec: any | null = null;
  private listener: Listener | null = null;
  private stopping = false;
  private nativeActive = false;
  private nativeStopRequested = false;
  private mobileRec: MobileRecognizer | null = null;

  start(listener: Listener) {
    const webSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    // Mobile browsers: use MediaRecorder + Lovable AI transcription. iOS
    // Safari's webkitSpeechRecognition is unreliable, and this gives the
    // same audible loop on both iPhone and Android web.
    const mobileWeb =
      isMobileVoiceEnvironment() &&
      !isAndroidNativeApp() &&
      typeof MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";
    if (mobileWeb) {
      this.stop();
      this.mobileRec = new MobileRecognizer();
      void this.mobileRec.start(listener);
      return true;
    }
    if (!webSupported && isAndroidNativeApp()) {
      this.stop();
      this.startAndroidNative(listener);
      return true;
    }
    if (!webSupported) {
      listener.onError?.("Voice recognition isn't supported in this browser. Try Chrome on Android or Safari on iPhone.");
      return false;
    }
    this.stop();
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    // Continuous keeps the mic open across short pauses so users can finish
    // a full sentence (or two) without getting cut off mid-thought.
    rec.continuous = true;
    rec.maxAlternatives = 3;
    this.listener = listener;
    this.rec = rec;
    this.stopping = false;

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingFinal = "";
    let lastPartial = "";
    let lastLive = "";
    let lastChangeAt = Date.now();
    // Adaptive end-of-speech thresholds. Longer wait when the user sounds
    // like they're still forming a thought; shorter when they sound done.
    const SILENCE_SHORT_MS = 550;   // clearly finished (ends with . ! ?)
    const SILENCE_BASE_MS = 900;    // normal pause between thoughts
    const SILENCE_LONG_MS = 1400;   // trailing filler / continuation word
    const HARD_CAP_MS = 15000;      // never hold a partial forever

    // Words that suggest the user hasn't finished the sentence yet.
    const CONTINUATION_WORDS =
      /\b(and|or|but|so|because|with|the|a|an|to|for|of|from|by|in|on|at|is|are|was|were|i|we|you|they|it|my|our|their|his|her|um|uh|like|then|plus|also|maybe|kind|sort|about)$/i;
    const SENTENCE_END = /[.!?]$/;

    const pickDelay = (text: string): number => {
      const trimmed = text.trim();
      if (!trimmed) return SILENCE_BASE_MS;
      const words = trimmed.split(/\s+/);
      // Short one-word replies ("yes", "no", "chicken") are usually complete
      // answers to Chef's question — respond quickly (~0.7s).
      if (words.length === 1) return SILENCE_SHORT_MS + 150;
      if (CONTINUATION_WORDS.test(trimmed)) return SILENCE_LONG_MS;
      if (SENTENCE_END.test(trimmed) && words.length >= 3) return SILENCE_SHORT_MS;
      return SILENCE_BASE_MS;
    };

    const clearSilence = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    const flushFinal = () => {
      const text = (pendingFinal + " " + lastPartial).trim();
      pendingFinal = "";
      lastPartial = "";
      lastLive = "";
      clearSilence();
      if (text) listener.onFinal(text);
    };

    const armSilence = (delay: number) => {
      clearSilence();
      silenceTimer = setTimeout(flushFinal, delay);
    };

    rec.onresult = (e: any) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) pendingFinal += r[0].transcript + " ";
        else partial += r[0].transcript;
      }
      lastPartial = partial;
      const live = (pendingFinal + " " + partial).trim();
      if (live) listener.onPartial?.(live);

      // Only re-arm the silence timer if the transcript actually advanced.
      // This prevents the engine's idle chatter from cancelling a valid
      // end-of-speech countdown, and it prevents cutting the user off when
      // the recognizer stutters mid-word.
      if (live !== lastLive) {
        lastLive = live;
        lastChangeAt = Date.now();
        armSilence(pickDelay(live));
      } else if (Date.now() - lastChangeAt > HARD_CAP_MS) {
        // Nothing has changed for a long time — flush whatever we have.
        flushFinal();
      }
    };
    rec.onerror = (e: any) => {
      const code = e?.error ?? "unknown";
      if (code === "no-speech" || code === "aborted") return; // common, ignore
      listener.onError?.(friendlyError(code));
    };
    rec.onend = () => {
      clearSilence();
      // Flush anything we caught before the engine stopped.
      const leftover = (pendingFinal + " " + lastPartial).trim();
      pendingFinal = "";
      lastPartial = "";
      this.rec = null;
      if (leftover) listener.onFinal(leftover);
      listener.onEnd?.();
    };
    try {
      rec.start();
      return true;
    } catch (err) {
      listener.onError?.("Couldn't start the microphone. Tap again.");
      return false;
    }
  }

  stop() {
    this.stopping = true;
    this.nativeStopRequested = true;
    const rec = this.rec;
    this.rec = null;
    if (rec) {
      try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.stop(); } catch {}
    }
    if (this.mobileRec) {
      try { this.mobileRec.stop(); } catch {}
      this.mobileRec = null;
    }
    if (this.nativeActive) {
      this.nativeActive = false;
      void import("@capacitor-community/speech-recognition")
        .then(({ SpeechRecognition }) => SpeechRecognition.stop().catch(() => {}))
        .catch(() => {});
    }
  }

  isActive() {
    return !!this.rec || this.nativeActive || !!this.mobileRec;
  }

  private startAndroidNative(listener: Listener) {
    this.listener = listener;
    this.nativeActive = true;
    this.nativeStopRequested = false;

    void (async () => {
      try {
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        const availability = await SpeechRecognition.available();
        if (!availability.available) {
          this.nativeActive = false;
          listener.onError?.("Voice recognition isn't available on this Android device.");
          listener.onEnd?.();
          return;
        }

        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== "granted") {
          this.nativeActive = false;
          listener.onError?.("Microphone access blocked. Allow microphone permission, then try again.");
          listener.onEnd?.();
          return;
        }

        let silenceTimer: ReturnType<typeof setTimeout> | null = null;
        let latest = "";
        let finalized = false;
        const clearSilence = () => {
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
        };
        const finish = async (text: string | null) => {
          if (finalized) return;
          finalized = true;
          clearSilence();
          this.nativeActive = false;
          try { await SpeechRecognition.removeAllListeners(); } catch {}
          try { await SpeechRecognition.stop(); } catch {}
          const cleaned = (text ?? latest).trim();
          if (cleaned && !this.nativeStopRequested) listener.onFinal(cleaned);
          listener.onEnd?.();
        };

        await SpeechRecognition.removeAllListeners().catch(() => {});
        await SpeechRecognition.addListener("partialResults", (data) => {
          const next = (data.matches?.[0] ?? "").trim();
          if (!next) return;
          latest = next;
          listener.onPartial?.(latest);
          clearSilence();
          // Android native speech usually pauses after an utterance; this
          // short silence window makes Chef respond once the user stops,
          // without cutting off natural mid-sentence pauses.
          silenceTimer = setTimeout(() => void finish(latest), 1000);
        });
        await SpeechRecognition.addListener("listeningState", (data) => {
          if (data.status === "stopped" && latest) void finish(latest);
        });

        await SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
      } catch (err) {
        this.nativeActive = false;
        const message = err instanceof Error ? err.message : String(err || "");
        listener.onError?.(message || "Couldn't start the microphone. Tap again.");
        listener.onEnd?.();
      }
    })();
  }
}

function friendlyError(code: string) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access blocked. Tap the lock icon in your address bar, allow microphone, then try again.";
    case "audio-capture":
      return "No microphone detected. Check that your device has a working microphone.";
    case "network":
      return "Network hiccup — try again.";
    case "aborted":
      return "";
    default:
      return "Sorry, I didn't catch that. Try speaking clearly or type your question.";
  }
}

/**
 * Request microphone permission explicitly via getUserMedia.
 * This gives us a clear yes/no before SpeechRecognition tries,
 * and lets us show helpful guidance when blocked.
 */
export async function requestMicPermission(): Promise<"granted" | "denied" | "unsupported"> {
  if (isAndroidNativeApp()) {
    try {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      const availability = await SpeechRecognition.available();
      if (!availability.available) return "unsupported";
      const permission = await SpeechRecognition.requestPermissions();
      return permission.speechRecognition === "granted" ? "granted" : "denied";
    } catch {
      return "unsupported";
    }
  }
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch (e: unknown) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
      return "denied";
    }
    return "unsupported";
  }
}
