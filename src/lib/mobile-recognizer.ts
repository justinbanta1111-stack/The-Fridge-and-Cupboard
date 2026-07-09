// Mobile browser recognizer. Captures a single utterance as PCM and uploads a
// complete WAV to speech-to-text. This avoids iOS/Safari fragmented MP4 and
// MediaRecorder chunk issues while preserving the same hands-free loop.

import { transcribeVoice } from "./transcribe-voice.functions";

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
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
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
    this.hardCap = setTimeout(() => this.finishSoft(), 20000);

    let speechFrames = 0;
    let noiseFloor = 0.006;
    let audioFrames = 0;
    const SPEECH_FLOOR_RMS = 0.012;
    const MAYBE_SPEECH_RMS = 0.008;
    const SPEECH_FRAMES_REQUIRED = 2;
    const SILENCE_MS = 900;
    const MIN_WAIT_FOR_SPEECH_MS = 8000;

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

      const threshold = Math.max(SPEECH_FLOOR_RMS, noiseFloor * 2.2);
      if (rms >= threshold) {
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

    source.connect(processor);
    processor.connect(ctx.destination);

    window.setTimeout(() => {
      if (!this.stopped && audioFrames === 0) {
        this.forceTranscribe = true;
        this.finishSoft();
      }
    }, 1500);
    console.info("[voice] MOBILE_MIC_LISTENING", { mode: "pcm-wav", sampleRate: this.sampleRate });
  }

  private startMediaRecorderFallback(listener: MobileRecognizerListener) {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4"];
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
      this.recorder = mimeType ? new MediaRecorder(this.stream!, { mimeType }) : new MediaRecorder(this.stream!);
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
      console.info("[voice] MOBILE_MIC_LISTENING", { mode: "media-recorder", mimeType: this.mimeType });
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
        try { this.recorder.requestData(); } catch {}
        this.recorder.stop();
      } else {
        void this.handleStop();
      }
    } catch {
      void this.handleStop();
    }
  }

  private cleanupStream() {
    try { this.processor?.disconnect(); } catch {}
    try { this.source?.disconnect(); } catch {}
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
    this.cleanupStream();
    if (!listener) return;
    if (this.aborted) {
      listener.onEnd?.();
      return;
    }
    const shouldTranscribe = this.hasSpoken || this.forceTranscribe;
    if (!shouldTranscribe) {
      listener.onEnd?.();
      return;
    }

    const blob = this.pcmChunks.length > 0
      ? encodeWav(this.pcmChunks, this.sampleRate)
      : new Blob(this.chunks, { type: this.mimeType });
    this.chunks = [];
    this.pcmChunks = [];
    if (blob.size < 2048) {
      listener.onEnd?.();
      return;
    }
    try {
      console.info("[voice] MOBILE_TRANSCRIBE_SENT", { bytes: blob.size, mimeType: blob.type || this.mimeType });
      const base64 = await blobToBase64(blob);
      const { text } = await transcribeVoice({
        data: { audioBase64: base64, mimeType: blob.type || this.mimeType },
      });
      const cleaned = (text || "").trim();
      console.info("[voice] MOBILE_TRANSCRIBE_DONE", { hasText: !!cleaned, chars: cleaned.length });
      if (cleaned) listener.onFinal(cleaned);
    } catch (err) {
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

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
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
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  return btoa(binary);
}
