import { markMicStarted, markMicStopped } from "./mic-activity";

// Audio gate (barge-in detector).
//
// While Chef Super J is speaking, we listen to the microphone at a low level.
// If the user clearly starts talking, we immediately stop the in-progress
// ElevenLabs playback and announce a barge-in so any listener/recognition
// loop can restart cleanly instead of overlapping with Chef's own voice.

export const BARGE_IN_EVENT = "tfc:barge-in";

// Tuned to trigger on real speech, not on room noise or speaker bleed.
// Sensitive enough for a normal speaking voice, but a clatter, a cabinet
// door or a footstep never clears the voice-shape tests below.
const SPEECH_RMS = 0.042;
// Share of energy that must sit in the human voice band (~85Hz–3.4kHz).
const VOICE_BAND_RATIO = 0.6;
// Impulsive kitchen noise (pans, taps, drawers) is broadband and flat.
const MAX_FLATNESS = 0.42;
// Sustained voiced energy required before we treat it as "the user is talking".
// Real speech holds for a few hundred ms; a bang does not.
const SUSTAIN_MS = 320;
// Gentle ducking kicks in earlier so Chef yields quickly to a real voice.
const DUCK_MS = 140;
// Short gaps between syllables shouldn't reset the sustain counter.
const GAP_TOLERANCE_MS = 120;
// Ignore the first moments of playback (speaker ramp-up / echo settling).
const GRACE_MS = 300;

let ctx: AudioContext | null = null;
let stream: MediaStream | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let buffer: Float32Array | null = null;
let freqBuffer: Float32Array | null = null;
let rafId: number | null = null;
let armed = false;
let armedAt = 0;
let loudSince = 0;
let lastVoicedAt = 0;
let onDetect: (() => void) | null = null;
let onDuck: (() => void) | null = null;
let ducked = false;
let initInFlight: Promise<boolean> | null = null;
let micMarked = false;
let graphGeneration = 0;

function supported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!(window.AudioContext || (window as any).webkitAudioContext)
  );
}

async function ensureGraph(): Promise<boolean> {
  if (analyser && stream && stream.active) return true;
  if (!supported()) return false;
  if (initInFlight) return initInFlight;

  const generation = graphGeneration;
  initInFlight = (async () => {
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (generation !== graphGeneration) {
        nextStream.getTracks().forEach((track) => track.stop());
        return false;
      }
      stream = nextStream;
      if (!micMarked) {
        micMarked = true;
        markMicStarted();
      }
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      ctx = ctx ?? new Ctor();
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      buffer = new Float32Array(analyser.fftSize);
      freqBuffer = new Float32Array(analyser.frequencyBinCount);
      return true;
    } catch {
      // Mic unavailable (denied, or held by a native recognizer) — the gate
      // simply stays inactive; playback behaves exactly as before.
      teardown();
      return false;
    } finally {
      initInFlight = null;
    }
  })();

  return initInFlight;
}

function teardown() {
  graphGeneration += 1;
  if (micMarked) {
    micMarked = false;
    markMicStopped();
  }
  try {
    source?.disconnect();
  } catch {
    // ignore
  }
  try {
    stream?.getTracks().forEach((t) => t.stop());
  } catch {
    // ignore
  }
  source = null;
  analyser = null;
  buffer = null;
  freqBuffer = null;
  stream = null;
  const contextToClose = ctx;
  ctx = null;
  if (contextToClose && contextToClose.state !== "closed") {
    void contextToClose.close().catch(() => {});
  }
}

function rms(): number {
  if (!analyser || !buffer) return 0;
  analyser.getFloatTimeDomainData(buffer as any);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

/**
 * Voice-shape test. Human speech puts most of its energy in the 85Hz–3.4kHz
 * band and has a peaky (non-flat) spectrum. Pans, drawers, taps, footsteps,
 * rustling packaging and running water are broadband and spectrally flat, so
 * they fail this test even when they're loud.
 */
function looksLikeSpeech(): boolean {
  if (!analyser || !freqBuffer || !ctx) return false;
  analyser.getFloatFrequencyData(freqBuffer as any);
  const binHz = ctx.sampleRate / 2 / freqBuffer.length;
  const lo = Math.max(1, Math.floor(85 / binHz));
  const hi = Math.min(freqBuffer.length - 1, Math.ceil(3400 / binHz));

  let total = 0;
  let voice = 0;
  let logSum = 0;
  let count = 0;
  for (let i = 1; i < freqBuffer.length; i++) {
    // dB -> linear power
    const p = Math.pow(10, freqBuffer[i] / 10);
    total += p;
    if (i >= lo && i <= hi) voice += p;
    logSum += Math.log(p + 1e-12);
    count++;
  }
  if (total <= 0 || count === 0) return false;

  const voiceRatio = voice / total;
  const geometricMean = Math.exp(logSum / count);
  const arithmeticMean = total / count;
  const flatness = geometricMean / (arithmeticMean + 1e-12);

  return voiceRatio >= VOICE_BAND_RATIO && flatness <= MAX_FLATNESS;
}

function tick() {
  if (!armed) return;
  const now = Date.now();
  if (now - armedAt < GRACE_MS) {
    rafId = requestAnimationFrame(tick);
    return;
  }
  const level = rms();
  const voiced = level >= SPEECH_RMS && looksLikeSpeech();

  if (voiced) {
    // Allow brief syllable gaps without restarting the sustain window.
    if (!loudSince || now - lastVoicedAt > GAP_TOLERANCE_MS) loudSince = now;
    lastVoicedAt = now;

    if (!ducked && now - loudSince >= DUCK_MS) {
      // Gently duck Chef's voice once we're fairly sure it's a real voice,
      // before we're sure enough to fully stop. Feels like a person yielding.
      ducked = true;
      try {
        onDuck?.();
      } catch {
        // ignore
      }
    }
    if (now - loudSince >= SUSTAIN_MS) {
      const fire = onDetect;
      disarmAudioGate();
      try {
        window.dispatchEvent(new CustomEvent(BARGE_IN_EVENT));
      } catch {
        // ignore
      }
      fire?.();
      return;
    }
  } else if (now - lastVoicedAt > GAP_TOLERANCE_MS) {
    loudSince = 0;
  }
  rafId = requestAnimationFrame(tick);
}

/**
 * Start watching the mic for user speech. `onSpeechDetected` fires once,
 * then the gate disarms itself.
 */
export async function armAudioGate(
  onSpeechDetected: () => void,
  onSpeechDucking?: () => void,
): Promise<boolean> {
  disarmAudioGate();
  const ready = await ensureGraph();
  if (!ready) return false;
  armed = true;
  armedAt = Date.now();
  loudSince = 0;
  lastVoicedAt = 0;
  ducked = false;
  onDuck = onSpeechDucking ?? null;
  onDetect = onSpeechDetected;
  rafId = requestAnimationFrame(tick);
  return true;
}

export function disarmAudioGate() {
  armed = false;
  onDetect = null;
  onDuck = null;
  ducked = false;
  loudSince = 0;
  lastVoicedAt = 0;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  // Never retain a second microphone stream between voice turns. On iOS a
  // lingering capture stream can change the speaker route and create feedback.
  teardown();
}

/** Release the microphone entirely (e.g. leaving a voice screen). */
export function releaseAudioGate() {
  disarmAudioGate();
  teardown();
}

export function isAudioGateArmed() {
  return armed;
}
