// Lightweight CC0-style synthesized sound effects via Web Audio API.
// No external files = no broken links, no licensing concerns, works offline.

const SFX_PREF_KEY = "tfc.sfx.enabled.v1";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    const c = ctx!;
    if (c.state === "suspended") {
      c.resume().catch(() => {});
    }
    return c;
  } catch {
    return null;
  }
}

export function getSfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SFX_PREF_KEY);
  return v === null ? true : v === "1";
}

export function setSfxEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SFX_PREF_KEY, enabled ? "1" : "0");
}

/** Soft fridge-door "thunk + suction" — short, warm. */
export function playFridgeOpen(): Promise<void> {
  return new Promise((resolve) => {
    const ac = getCtx();
    if (!ac || !getSfxEnabled()) return resolve();
    const t0 = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.35;
    master.connect(ac.destination);

    // Low "thunk" — sine thump
    const thump = ac.createOscillator();
    const tg = ac.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(120, t0);
    thump.frequency.exponentialRampToValueAtTime(45, t0 + 0.22);
    tg.gain.setValueAtTime(0.0001, t0);
    tg.gain.exponentialRampToValueAtTime(0.9, t0 + 0.02);
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    thump.connect(tg).connect(master);
    thump.start(t0);
    thump.stop(t0 + 0.4);

    // Suction "shhh" — filtered noise
    const noise = ac.createBufferSource();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    noise.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.7;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, t0 + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.5, t0 + 0.18);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    noise.connect(bp).connect(ng).connect(master);
    noise.start(t0 + 0.05);
    noise.stop(t0 + 0.6);

    setTimeout(resolve, 650);
  });
}

/** Subtle kitchen "sizzle" — short noise burst for recipe reveals. */
export function playSizzle() {
  const ac = getCtx();
  if (!ac || !getSfxEnabled()) return;
  const t0 = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.18;
  master.connect(ac.destination);

  const noise = ac.createBufferSource();
  const dur = 0.9;
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buf;

  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2500;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.8, t0 + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  noise.connect(hp).connect(g).connect(master);
  noise.start(t0);
  noise.stop(t0 + dur);
}

/** Soft cha-ching — two bright bell tones. */
export function playChaChing() {
  const ac = getCtx();
  if (!ac || !getSfxEnabled()) return;
  const t0 = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.28;
  master.connect(ac.destination);

  const tones: Array<[number, number]> = [
    [1318.5, 0.0], // E6
    [1760.0, 0.09], // A6
  ];

  for (const [freq, delay] of tones) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    const start = t0 + delay;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.9, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + 0.5);

    // Bright partial
    const o2 = ac.createOscillator();
    const g2 = ac.createGain();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0.0001, start);
    g2.gain.exponentialRampToValueAtTime(0.35, start + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    o2.connect(g2).connect(master);
    o2.start(start);
    o2.stop(start + 0.35);
  }

  // Tiny shimmer noise tail
  const noise = ac.createBufferSource();
  const buf = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
  noise.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6000;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, t0 + 0.1);
  ng.gain.exponentialRampToValueAtTime(0.25, t0 + 0.12);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
  noise.connect(hp).connect(ng).connect(master);
  noise.start(t0 + 0.1);
  noise.stop(t0 + 0.4);
}

// ---------- Soft kitchen ambience (optional, low volume) ----------
// A gentle warm pad + filtered noise "room tone" + light bell shimmer.
// Synthesized so we don't ship audio files. Loops until stopped.

const AMBIENCE_PREF_KEY = "tfc.ambience.enabled.v1";

export function getAmbienceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(AMBIENCE_PREF_KEY);
  // Default OFF — the low pad + brown noise was perceived as a fan/static hum.
  return v === "1";
}

export function setAmbienceEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AMBIENCE_PREF_KEY, enabled ? "1" : "0");
  if (!enabled) stopKitchenAmbience();
}

type AmbienceNodes = {
  master: GainNode;
  oscs: OscillatorNode[];
  noise?: AudioBufferSourceNode;
  timer?: number;
};
let ambience: AmbienceNodes | null = null;

export function startKitchenAmbience(volume = 0.06): void {
  if (ambience) return;
  if (!getAmbienceEnabled()) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;

  const master = ac.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(volume, t0 + 0.8);
  master.connect(ac.destination);

  // Warm pad: two detuned sines fifth apart.
  const oscs: OscillatorNode[] = [];
  const padFreqs = [196, 294]; // G3, D4
  for (const f of padFreqs) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 8;
    g.gain.value = 0.45;
    o.connect(g).connect(master);
    o.start(t0);
    oscs.push(o);
  }

  // Soft room-tone: brown-ish noise through a low-pass.
  const buf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  const ng = ac.createGain();
  ng.gain.value = 0.35;
  noise.connect(lp).connect(ng).connect(master);
  noise.start(t0);

  // Occasional faint bell shimmer.
  const sparkle = () => {
    if (!ambience) return;
    const ac2 = getCtx();
    if (!ac2) return;
    const tt = ac2.currentTime;
    const o = ac2.createOscillator();
    const g = ac2.createGain();
    o.type = "sine";
    const notes = [1318, 1568, 1760, 2093];
    o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    g.gain.setValueAtTime(0.0001, tt);
    g.gain.exponentialRampToValueAtTime(0.12, tt + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 1.8);
    o.connect(g).connect(master);
    o.start(tt);
    o.stop(tt + 2);
  };
  const timer = window.setInterval(sparkle, 4200 + Math.random() * 2000);

  ambience = { master, oscs, noise, timer };
}

export function stopKitchenAmbience(): void {
  if (!ambience) return;
  const ac = getCtx();
  const cur = ambience;
  ambience = null;
  if (cur.timer) clearInterval(cur.timer);
  try {
    if (ac) {
      const t = ac.currentTime;
      cur.master.gain.cancelScheduledValues(t);
      cur.master.gain.setValueAtTime(cur.master.gain.value, t);
      cur.master.gain.linearRampToValueAtTime(0.0001, t + 0.6);
      setTimeout(() => {
        try { cur.oscs.forEach((o) => o.stop()); } catch {}
        try { cur.noise?.stop(); } catch {}
        try { cur.master.disconnect(); } catch {}
      }, 700);
    } else {
      cur.oscs.forEach((o) => { try { o.stop(); } catch {} });
      try { cur.noise?.stop(); } catch {}
    }
  } catch {}
}

export function isKitchenAmbiencePlaying(): boolean {
  return ambience !== null;
}
