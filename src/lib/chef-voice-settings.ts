// One synthesis profile for greetings, answers, scans, and cooking instructions.
// Relax the generated speech, not the listener timing or audio playback rate.
export const CHEF_VOICE_MODEL = "eleven_turbo_v2_5";
// Original custom voice is supplied by the existing server-side configuration.
export function originalChefVoiceId(configured: string | undefined): string {
  const voiceId = configured?.trim();
  if (!voiceId) throw new Error("Original Chef voice is not configured; no substitute voice will be used.");
  return voiceId;
}
export const CHEF_VOICE_SETTINGS = {
  speed: 0.94,
  stability: 0.8,
  style: 0,
  similarity_boost: 0.9,
  use_speaker_boost: true,
} as const;