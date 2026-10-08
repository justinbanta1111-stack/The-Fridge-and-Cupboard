export const WELCOME_GREETING = "Welcome to the Fridge and Cupboard. What can I do for you today?";

/** Preload and gesture recovery must never replace an owned speech channel. */
export function canPrepareWelcomeAudio(started: boolean, speaking: boolean, claimed: boolean): boolean {
  return !started && !speaking && !claimed;
}