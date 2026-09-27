/**
 * Soft refrigerator-door opening sound.
 *
 * Deliberately synthesized with WebAudio instead of an <audio> element so it
 * can never compete with, delay, or block the ElevenLabs greeting playback
 * (which owns the single unlocked HTMLAudio element on mobile). If the audio
 * context is suspended (no user gesture yet), this silently does nothing.
 */
let played = false;

export function playFridgeOpenSound(): void {
  if (played) return;
  played = true;
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === "suspended") {
      // No gesture yet — stay silent rather than queueing a late blast of sound.
      void ctx.close?.();
      return;
    }
    const now = ctx.currentTime;
    const dur = 1.1;

    // Airy seal-release: filtered noise swelling then settling.
    const frames = Math.floor(ctx.sampleRate * dur);
    const noiseBuf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(320, now);
    band.frequency.exponentialRampToValueAtTime(900, now + dur * 0.6);
    band.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Low thunk of the magnetic seal letting go.
    const thunk = ctx.createOscillator();
    thunk.type = "sine";
    thunk.frequency.setValueAtTime(120, now);
    thunk.frequency.exponentialRampToValueAtTime(58, now + 0.3);
    const thunkGain = ctx.createGain();
    thunkGain.gain.setValueAtTime(0.0001, now);
    thunkGain.gain.exponentialRampToValueAtTime(0.045, now + 0.04);
    thunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    noise.connect(band).connect(gain).connect(ctx.destination);
    thunk.connect(thunkGain).connect(ctx.destination);

    noise.start(now);
    noise.stop(now + dur);
    thunk.start(now);
    thunk.stop(now + 0.45);

    window.setTimeout(() => {
      try { void ctx.close?.(); } catch {}
    }, (dur + 0.4) * 1000);
  } catch {
    // Sound is decorative — never let it affect the intro or the greeting.
  }
}
