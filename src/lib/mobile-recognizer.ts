// Mobile browser recognizer. Captures a single utterance as PCM and uploads a
// complete WAV to speech-to-text. This avoids iOS/Safari fragmented MP4 and
// MediaRecorder chunk issues while preserving the same hands-free loop.

import { transcribeVoice } from "./transcribe-voice.functions";
import { markMicStarted, markMicStopped } from "./mic-activity";
import { releaseAudioGate } from "./audio-gate";

export type MobileRecognizerListener = {
  onPartial?: (t: string) => void;
  onFinal: (t: string) => void;
  onError?: (e: string) => void;
  onEnd?: () => void;
};

export class MobileRecognizer {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sink: GainNode | null = null;
  private micMarked = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private hardCap: ReturnType<typeof setTimeout> | null = null;
  private chunks: BlobPart[] = [];
  private pcmChunks: Float32Array[] = [];
  private mimeType = "audio/webm";
  private sampleRate = 44100;
  private startedAt = 0;
  private hasSpoken = false;
  private stopped = false;
  private aborted = false;
  private forceTranscribe = false;
  private maxRms = 0;
  private listener: MobileRecognizerListener | null = null;

  isActive() {
    return !!this.recorder && !this.stopped;
  }

  async start(listener: MobileRecognizerListener) {
    this.listener = listener;
    // Release the barge-in monitor's microphone first: two concurrent capture
    // streams on iOS can force the loud speaker route and cause howling.
    try {
      releaseAudioGate();
    } catch {
      /* ignore */
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.micMarked = true;
      markMicStarted();
    } catch {
      listener.onError?.("Microphone access blocked. Allow microphone, then try again.");
      listener.onEnd?.();
      return;
    }

    try {
      await this.startPcmCapture(listener);
    } catch (err) {
      console.warn("[voice] mobile PCM recognizer failed; trying recorder fallback", err);
      if (!this.stream) {
        listener.onError?.("Recording isn't supported in this browser.");
        listener.onEnd?.();
        return;
      }
      this.startMediaRecorderFallback(listener);
    }
  }

  private async startPcmCapture(listener: MobileRecognizerListener) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) throw new Error("AudioContext unavailable");
    const stream = this.stream;
    if (!stream) throw new Error("no stream");

    const ctx: AudioContext = new AC();
    this.ctx = ctx;
    this.sampleRate = ctx.sampleRate || 44100;
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => undefined);
    }
    if (ctx.state === "suspended") {
      throw new Error("AudioContext stayed suspended");
    }

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    this.source = source;
    this.processor = processor;

    this.startedAt = Date.now();
    // On hard cap ALWAYS transcribe whatever we captured — iPhone Safari's
    // aggressive echo-cancellation can keep RMS below any speech threshold
    // even when the user is clearly talking. Sending silence to Whisper is
    // cheap and returns empty text; NOT sending means the loop stalls with
    // no assistant response, which is the exact bug we're fixing.
    this.hardCap = setTimeout(() => {
      this.forceTranscribe = true;
      this.finishSoft();
    }, 10000);

    let speechFrames = 0;
    let noiseFloor = 0.004;
    let audioFrames = 0;
    const SPEECH_FLOOR_RMS = 0.008;
    const MAYBE_SPEECH_RMS = 0.005;
    // Three frames (~280ms) of voice-shaped audio. A pan clatter, a drawer or
    // a footstep is shorter and much noisier than this, so it never counts.
    const SPEECH_FRAMES_REQUIRED = 3;
    // Zero-crossing rate window that human speech lives in. Impulsive kitchen
    // noise and hiss sit well above it; hums and thuds sit well below it.
    const ZCR_MIN = 0.015;
    const ZCR_MAX = 0.32;
    // A natural pause commits the turn quickly, while still leaving enough
    // room for a brief mid-sentence breath.
    const SILENCE_MS = 1100;
    const MIN_WAIT_FOR_SPEECH_MS = 6000;

    processor.onaudioprocess = (event) => {
      if (this.stopped) return;
      audioFrames += 1;
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      this.pcmChunks.push(copy);

      // Keep the output silent; connecting the processor to destination is
      // required by Safari for callbacks, but we never play mic audio back.
      try {
        event.outputBuffer.getChannelData(0).fill(0);
      } catch {
        /* ignore */
      }

      let sum = 0;
      for (let i = 0; i < input.length; i += 1) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / Math.max(1, input.length));
      this.maxRms = Math.max(this.maxRms, rms);
      const elapsed = Date.now() - this.startedAt;

      if (!this.hasSpoken) {
        noiseFloor = noiseFloor * 0.96 + Math.min(rms, 0.03) * 0.04;
      }

      let crossings = 0;
      for (let i = 1; i < input.length; i += 1) {
        if ((input[i - 1] < 0 && input[i] >= 0) || (input[i - 1] >= 0 && input[i] < 0)) {
          crossings += 1;
        }
      }
      const zcr = crossings / Math.max(1, input.length);
      const voiceShaped = zcr >= ZCR_MIN && zcr <= ZCR_MAX;

      const threshold = Math.max(SPEECH_FLOOR_RMS, noiseFloor * 2.2);
      if (rms >= threshold && voiceShaped) {
        speechFrames += 1;
        if (speechFrames >= SPEECH_FRAMES_REQUIRED) {
          this.hasSpoken = true;
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        }
      } else {
        speechFrames = 0;
        if (this.hasSpoken && !this.silenceTimer) {
          this.silenceTimer = setTimeout(() => this.finishSoft(), SILENCE_MS);
        }
      }

      if (!this.hasSpoken && elapsed > MIN_WAIT_FOR_SPEECH_MS) {
        // If the mic clearly captured energy but the threshold never crossed,
        // transcribe once anyway; this is the mobile failure mode where users
        // speak but VAD is too conservative. Pure silence still retries free.
        this.forceTranscribe = this.maxRms >= MAYBE_SPEECH_RMS;
        this.finishSoft();
      }
    };

    // Safari only fires onaudioprocess when the node is connected, but the
    // mic must NEVER reach the speaker. Route through a fully muted sink so
    // there is no possible mic-to-speaker feedback path.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    this.sink = sink;
    source.connect(processor);
    processor.connect(sink);
    sink.connect(ctx.destination);

    window.setTimeout(() => {
      if (!this.stopped && audioFrames === 0) {
        this.forceTranscribe = true;
        this.finishSoft();
      }
    }, 1500);
    console.info("[voice] MOBILE_MIC_LISTENING", { mode: "pcm-wav", sampleRate: this.sampleRate });
  }

  private startMediaRecorderFallback(listener: MobileRecognizerListener) {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
    ];
    let mimeType = "";
    if (typeof MediaRecorder !== "undefined") {
      for (const m of candidates) {
        try {
          if ((MediaRecorder as any).isTypeSupported && MediaRecorder.isTypeSupported(m)) {
            mimeType = m;
            break;
          }
        } catch {
          /* ignore */
        }
      }
    }

    try {
      this.recorder = mimeType
        ? new MediaRecorder(this.stream!, { mimeType })
        : new MediaRecorder(this.stream!);
      this.mimeType = this.recorder.mimeType || mimeType || "audio/webm";
    } catch {
      this.cleanupStream();
      listener.onError?.("Recording isn't supported in this browser.");
      listener.onEnd?.();
      return;
    }

    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.onstop = () => {
      void this.handleStop();
    };

    try {
      this.recorder.start();
      this.startedAt = Date.now();
      this.hasSpoken = true;
      this.forceTranscribe = true;
      this.hardCap = setTimeout(() => this.finishSoft(), 7000);
      console.info("[voice] MOBILE_MIC_LISTENING", {
        mode: "media-recorder",
        mimeType: this.mimeType,
      });
    } catch {
      this.cleanupStream();
      listener.onError?.("Couldn't start the microphone. Tap again.");
      listener.onEnd?.();
    }
  }

  stop() {
    // Cancel this session without transcribing.
    this.aborted = true;
    this.finishSoft();
  }

  private finishSoft() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
    if (this.hardCap) clearTimeout(this.hardCap);
    this.hardCap = null;
    try {
      if (this.recorder && this.recorder.state !== "inactive") {
        try {
          this.recorder.requestData();
        } catch {}
        this.recorder.stop();
      } else {
        void this.handleStop();
      }
    } catch {
      void this.handleStop();
    }
  }

  private cleanupStream() {
    if (this.micMarked) {
      this.micMarked = false;
      markMicStopped();
    }
    try {
      this.sink?.disconnect();
    } catch {}
    this.sink = null;
    try {
      this.processor?.disconnect();
    } catch {}
    try {
      this.source?.disconnect();
    } catch {}
    this.processor = null;
    this.source = null;
    try {
      this.stream?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    this.stream = null;
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }

  private async handleStop() {
    const listener = this.listener;
    this.listener = null;
    const captured = {
      pcmChunks: this.pcmChunks.length,
      mediaChunks: this.chunks.length,
      maxRms: this.maxRms,
      hasSpoken: this.hasSpoken,
      forced: this.forceTranscribe,
      elapsedMs: Date.now() - this.startedAt,
    };
    console.info("[voice] MOBILE_RECORDING_STOPPED", captured);
    this.cleanupStream();
    if (!listener) return;
    if (this.aborted) {
      console.info("[voice] MOBILE_ABORTED — user cancel, skipping transcription");
      listener.onEnd?.();
      return;
    }

    const blob =
      this.pcmChunks.length > 0
        ? encodeWav(this.pcmChunks, this.sampleRate)
        : new Blob(this.chunks, { type: this.mimeType });
    this.chunks = [];
    this.pcmChunks = [];
    if (blob.size < 2048) {
      console.warn("[voice] MOBILE_BLOB_TOO_SMALL — skipping transcription", { bytes: blob.size });
      listener.onEnd?.();
      return;
    }
    try {
      console.info("[voice] MOBILE_TRANSCRIBE_SENT", {
        bytes: blob.size,
        mimeType: blob.type || this.mimeType,
      });
      const base64 = await blobToBase64(blob);
      const { text } = await transcribeVoice({
        data: { audioBase64: base64, mimeType: blob.type || this.mimeType },
      });
      const cleaned = (text || "").trim();
      console.info("[voice] MOBILE_TRANSCRIBE_DONE", {
        hasText: !!cleaned,
        chars: cleaned.length,
        preview: cleaned.slice(0, 80),
      });
      if (cleaned) listener.onFinal(cleaned);
    } catch (err) {
      console.error("[voice] MOBILE_TRANSCRIBE_FAILED", err);
      listener.onError?.(err instanceof Error ? err.message : "Transcription failed.");
    } finally {
      listener.onEnd?.();
    }
  }
}

function encodeWav(chunks: Float32Array[], inputSampleRate: number): Blob {
  const targetSampleRate = 16000;
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const downsampled = downsampleBuffer(merged, inputSampleRate, targetSampleRate);
  const buffer = new ArrayBuffer(44 + downsampled.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + downsampled.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, downsampled.length * 2, true);

  let pos = 44;
  for (let i = 0; i < downsampled.length; i += 1, pos += 2) {
    const sample = Math.max(-1, Math.min(1, downsampled[i]));
    view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
}

function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Float32Array {
  if (inputSampleRate <= outputSampleRate) return buffer;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.max(1, Math.round(buffer.length / ratio));
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = count ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}
