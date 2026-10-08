// One synthesis profile for greetings, answers, scans, and cooking instructions.
// Relax the generated speech, not the listener timing or audio playback rate.
export const CHEF_VOICE_MODEL = "eleven_turbo_v2_5";
export const CHEF_VOICE_SETTINGS = {
  speed: 0.94,
  stability: 0.65,
  style: 0.1,
  similarity_boost: 0.9,
  use_speaker_boost: true,
} as const;