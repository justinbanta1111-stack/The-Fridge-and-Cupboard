import { CHEF_VOICE_SETTINGS } from "./chef-voice-settings";

export const WELCOME_GREETING = "Welcome to The Fridge & Cupboard. I’m Chef Super J. How can I help you today?";
// Greeting and responses share the same natural conversational delivery.
export const WELCOME_VOICE_SETTINGS = CHEF_VOICE_SETTINGS;
export const WELCOME_PLAYBACK_VOLUME = 0.82;
export function configureWelcomePlayback(audio: Pick<HTMLAudioElement, "volume" | "playbackRate" | "defaultPlaybackRate" | "preservesPitch">): void {
  audio.volume = WELCOME_PLAYBACK_VOLUME;
  audio.defaultPlaybackRate = 1;
  audio.playbackRate = 1;
  audio.preservesPitch = true;
}

/** Preload and gesture recovery must never replace an owned speech channel. */
export function canPrepareWelcomeAudio(started: boolean, speaking: boolean, claimed: boolean): boolean {
  return !started && !speaking && !claimed;
}