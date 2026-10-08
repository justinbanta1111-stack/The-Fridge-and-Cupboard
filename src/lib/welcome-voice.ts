export const WELCOME_GREETING = "Welcome to The Fridge & Cupboard. What can I help you cook today?";

/** Preload and gesture recovery must never replace an owned speech channel. */
export function canPrepareWelcomeAudio(started: boolean, speaking: boolean, claimed: boolean): boolean {
  return !started && !speaking && !claimed;
}