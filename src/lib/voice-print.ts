// Lightweight, on-device voice fingerprinting.
//
// Captures a short numeric signature of a spoken turn (spectral band energies
// plus pitch statistics) so an enrolled person can be recognised again. No
// audio is recorded, saved or uploaded — only these numbers, and only when the
// person has opted in to voice profiles.
//
// It also flags when two people appear to be talking at the same time, so the
// assistant can politely ask for one at a time instead of guessing.

import { SPEAKER_VECTOR_DIM } from "./speaker-profiles";

const BANDS = 24; // 24 log-spaced bands + pitch mean + pitch spread = 26
const FRAME_MS = 55;
const VOICED_RMS = 0.02;

export type VoicePrintResult = {
  vector: number[] | null;
  /** True when two clearly different pitch tracks interleave in the same turn. */
  overlap: boolean;
  voicedFrames: number;
};

export type VoicePrintCapture = {
  stop: () => VoicePrintResult;
};

function supported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!(window.AudioContext || (window as any).webkitAudioContext)
  );
}

function estimatePitch(time: Float32Array, sampleRate: number): number {
  // Simple autocorrelation over the human speech range (70–320 Hz).
  const minLag = Math.floor(sampleRate / 320);
  const maxLag = Math.floor(sampleRate / 70);
  let bestLag = 0;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i + lag < time.length; i += 2) corr += time[i] * time[i + lag];
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  if (!bestLag || bestCorr <= 0) return 0;
  return sampleRate / bestLag;
}

export async function startVoicePrint(): Promise<VoicePrintCapture | null> {
  if (!supported()) return null;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
  } catch {
    return null;
  }

  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctor();
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    /* ignore */
  }
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.1;
  source.connect(analyser);

  const freq = new Float32Array(analyser.frequencyBinCount);
  const time = new Float32Array(analyser.fftSize);
  const sums = new Array(BANDS).fill(0);
  const pitches: number[] = [];
  let voiced = 0;

  const nyquist = ctx.sampleRate / 2;
  const edges: number[] = [];
  for (let i = 0; i <= BANDS; i++) {
    // Log-spaced 80 Hz .. 5 kHz
    edges.push(80 * Math.pow(5000 / 80, i / BANDS));
  }

  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(time as any);
    let sum = 0;
    for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
    const rms = Math.sqrt(sum / time.length);
    if (rms < VOICED_RMS) return;
    voiced++;
    analyser.getFloatFrequencyData(freq as any);
    for (let b = 0; b < BANDS; b++) {
      const lo = Math.floor((edges[b] / nyquist) * freq.length);
      const hi = Math.max(lo + 1, Math.floor((edges[b + 1] / nyquist) * freq.length));
      let acc = 0;
      let n = 0;
      for (let i = lo; i < hi && i < freq.length; i++) {
        acc += Math.max(-100, freq[i]);
        n++;
      }
      sums[b] += n ? acc / n : -100;
    }
    const f0 = estimatePitch(time, ctx.sampleRate);
    if (f0 > 0) pitches.push(f0);
  }, FRAME_MS);

  const stop = (): VoicePrintResult => {
    window.clearInterval(timer);
    try {
      source.disconnect();
    } catch {
      /* ignore */
    }
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    if (ctx.state !== "closed") void ctx.close().catch(() => {});

    if (voiced < 8) return { vector: null, overlap: false, voicedFrames: voiced };

    const bandsAvg = sums.map((s) => s / voiced);
    const pitchMean = pitches.length ? pitches.reduce((a, b) => a + b, 0) / pitches.length : 0;
    const pitchSpread = pitches.length
      ? Math.sqrt(pitches.reduce((a, b) => a + (b - pitchMean) ** 2, 0) / pitches.length)
      : 0;

    const vector = [...bandsAvg, pitchMean / 100, pitchSpread / 100].slice(0, SPEAKER_VECTOR_DIM);

    return { vector, overlap: detectOverlap(pitches), voicedFrames: voiced };
  };

  return { stop };
}

/**
 * Conservative two-voice detector. Only fires when the turn keeps flipping
 * between two clearly separated pitch tracks — the signature of two people
 * talking over each other, not of one person's normal intonation.
 */
function detectOverlap(pitches: number[]): boolean {
  if (pitches.length < 20) return false;
  const sorted = [...pitches].sort((a, b) => a - b);
  const lowMed = sorted[Math.floor(sorted.length * 0.15)];
  const highMed = sorted[Math.floor(sorted.length * 0.85)];
  if (!lowMed || !highMed) return false;
  // Two tracks must be at least ~an octave-ish apart in relative terms.
  if (highMed / lowMed < 1.6) return false;

  const mid = (lowMed + highMed) / 2;
  let low = 0;
  let high = 0;
  let flips = 0;
  let prev: "low" | "high" | null = null;
  for (const p of pitches) {
    const side = p < mid ? "low" : "high";
    if (side === "low") low++;
    else high++;
    if (prev && side !== prev) flips++;
    prev = side;
  }
  const minShare = Math.min(low, high) / pitches.length;
  return minShare >= 0.3 && flips >= 6;
}
