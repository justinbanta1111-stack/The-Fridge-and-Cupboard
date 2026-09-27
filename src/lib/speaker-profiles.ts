// Voluntary voice profiles for multi-person kitchens.
//
// Design rules (non-negotiable):
//  - Enrollment is opt-in. Nothing is stored until the person says yes.
//  - Identification uses ONLY enrolled acoustic characteristics. Never
//    personality, accent, gender or tone.
//  - If the match is not clearly strong, we do NOT guess — the caller asks
//    "Who's speaking right now?" instead.
//  - Everything lives on this device (localStorage). No audio is uploaded or
//    stored; only a short numeric fingerprint of the enrolled samples.

export const SPEAKER_VECTOR_DIM = 26;

const STORE_KEY = "tfc.speakers.v2";
const CONSENT_KEY = "tfc.speakers.consent.v1";
const ACTIVE_KEY = "tfc.speakers.active.v1";

export const SPEAKER_PROFILES_EVENT = "tfc:speaker-profiles-changed";

export type SpeakerExperience = "unknown" | "beginner" | "some" | "confident";

export type SpeakerProfile = {
  id: string;
  name: string;
  /** Up to 5 enrolled fingerprints (retraining adds more). */
  vectors: number[][];
  createdAt: number;
  updatedAt: number;
  restrictions: string[];
  likes: string[];
  dislikes: string[];
  experience: SpeakerExperience;
  notes: string;
};

export type SpeakerMatch =
  | { status: "match"; profile: SpeakerProfile; score: number }
  | { status: "unsure"; score: number; profile?: SpeakerProfile }
  | { status: "none"; score: number };

// Deliberately strict: a weak match must fall through to "ask who's speaking".
const ACCEPT_SCORE = 0.9;
const ACCEPT_MARGIN = 0.035;
const CONSIDER_SCORE = 0.72;
const MAX_SAMPLES = 5;

function browser() {
  return typeof window !== "undefined";
}

export function hasSpeakerConsent(): boolean {
  if (!browser()) return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSpeakerConsent(allowed: boolean) {
  if (!browser()) return;
  try {
    if (allowed) localStorage.setItem(CONSENT_KEY, "1");
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function listSpeakerProfiles(): SpeakerProfile[] {
  if (!browser()) return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p: any) => p && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.vectors),
    ) as SpeakerProfile[];
  } catch {
    return [];
  }
}

function persist(profiles: SpeakerProfile[]) {
  if (!browser()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(profiles.slice(0, 8)));
  } catch {
    /* ignore */
  }
  emit();
}

function emit() {
  if (!browser()) return;
  try {
    window.dispatchEvent(new CustomEvent(SPEAKER_PROFILES_EVENT));
  } catch {
    /* ignore */
  }
}

export function createSpeakerProfile(name: string, vector: number[]): SpeakerProfile {
  const now = Date.now();
  const profile: SpeakerProfile = {
    id: `spk_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 40) || "Friend",
    vectors: [normalize(vector)],
    createdAt: now,
    updatedAt: now,
    restrictions: [],
    likes: [],
    dislikes: [],
    experience: "unknown",
    notes: "",
  };
  persist([...listSpeakerProfiles(), profile]);
  return profile;
}

export function renameSpeakerProfile(id: string, name: string) {
  const next = listSpeakerProfiles().map((p) =>
    p.id === id ? { ...p, name: name.trim().slice(0, 40) || p.name, updatedAt: Date.now() } : p,
  );
  persist(next);
}

/** Retraining: add another fingerprint so recognition improves over time. */
export function addSpeakerSample(id: string, vector: number[]) {
  const v = normalize(vector);
  const next = listSpeakerProfiles().map((p) =>
    p.id === id
      ? { ...p, vectors: [...p.vectors, v].slice(-MAX_SAMPLES), updatedAt: Date.now() }
      : p,
  );
  persist(next);
}

/** Replace all fingerprints (full retrain from scratch). */
export function resetSpeakerSamples(id: string, vector: number[]) {
  const next = listSpeakerProfiles().map((p) =>
    p.id === id ? { ...p, vectors: [normalize(vector)], updatedAt: Date.now() } : p,
  );
  persist(next);
}

export function updateSpeakerDetails(
  id: string,
  details: Partial<Pick<SpeakerProfile, "restrictions" | "likes" | "dislikes" | "experience" | "notes">>,
) {
  const next = listSpeakerProfiles().map((p) =>
    p.id === id ? { ...p, ...details, updatedAt: Date.now() } : p,
  );
  persist(next);
}

export function deleteSpeakerProfile(id: string) {
  persist(listSpeakerProfiles().filter((p) => p.id !== id));
  if (getActiveSpeakerId() === id) setActiveSpeaker(null);
}

export function deleteAllSpeakerProfiles() {
  persist([]);
  setActiveSpeaker(null);
}

export function getActiveSpeakerId(): string | null {
  if (!browser()) return null;
  try {
    return sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveSpeaker(id: string | null) {
  if (!browser()) return;
  try {
    if (id) sessionStorage.setItem(ACTIVE_KEY, id);
    else sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function getSpeakerProfile(id: string | null): SpeakerProfile | null {
  if (!id) return null;
  return listSpeakerProfiles().find((p) => p.id === id) ?? null;
}

/** Match a spoken-name answer ("it's Sarah") against enrolled names. */
export function findSpeakerBySpokenName(said: string): SpeakerProfile | null {
  const text = said.toLowerCase();
  const profiles = listSpeakerProfiles();
  let best: SpeakerProfile | null = null;
  for (const p of profiles) {
    const n = p.name.toLowerCase().trim();
    if (!n) continue;
    if (new RegExp(`\\b${n.replace(/[^a-z0-9 ]/g, "")}\\b`).test(text)) {
      if (!best || n.length > best.name.length) best = p;
    }
  }
  return best;
}

export function normalize(vector: number[]): number[] {
  const v = vector.slice(0, SPEAKER_VECTOR_DIM);
  while (v.length < SPEAKER_VECTOR_DIM) v.push(0);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const centered = v.map((x) => x - mean);
  const norm = Math.sqrt(centered.reduce((a, b) => a + b * b, 0)) || 1;
  return centered.map((x) => x / norm);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Compare a fresh fingerprint against enrolled profiles.
 * Returns "unsure" whenever the evidence is not clearly strong — callers must
 * then ask who is speaking rather than guessing.
 */
export function matchSpeaker(vector: number[] | null): SpeakerMatch {
  if (!vector) return { status: "none", score: 0 };
  const profiles = listSpeakerProfiles();
  if (!profiles.length) return { status: "none", score: 0 };
  const probe = normalize(vector);

  const scored = profiles
    .map((profile) => ({
      profile,
      score: profile.vectors.reduce((best, v) => Math.max(best, cosine(probe, v)), -1),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const runnerUp = scored[1];
  if (!top || top.score < CONSIDER_SCORE) return { status: "none", score: top?.score ?? 0 };
  const margin = runnerUp ? top.score - runnerUp.score : 1;
  if (top.score >= ACCEPT_SCORE && margin >= ACCEPT_MARGIN) {
    return { status: "match", profile: top.profile, score: top.score };
  }
  return { status: "unsure", score: top.score, profile: top.profile };
}

/** Compact, spoken-friendly summary of who is in the kitchen. */
export function speakerContextLines(activeId: string | null): string[] {
  const profiles = listSpeakerProfiles();
  if (!profiles.length) return [];
  const lines: string[] = ["PEOPLE IN THIS KITCHEN (enrolled voice profiles):"];
  for (const p of profiles) {
    const bits: string[] = [];
    if (p.restrictions.length) bits.push(`must avoid: ${p.restrictions.join(", ")}`);
    if (p.likes.length) bits.push(`likes: ${p.likes.join(", ")}`);
    if (p.dislikes.length) bits.push(`dislikes: ${p.dislikes.join(", ")}`);
    if (p.experience !== "unknown") bits.push(`cooking experience: ${p.experience}`);
    if (p.notes) bits.push(p.notes);
    lines.push(`- ${p.name}${bits.length ? ` — ${bits.join("; ")}` : ""}`);
  }
  const active = getSpeakerProfile(activeId);
  if (active) {
    lines.push(
      `The person speaking right now is ${active.name}. Answer for ${active.name}'s needs. Use their name naturally, not in every sentence.`,
    );
  }
  return lines;
}
