export type VoiceSessionOwner = "global" | "cooking";

export const VOICE_SESSION_EVENT = "tfc:voice-session-owner";

let owner: VoiceSessionOwner = "global";

export function getVoiceSessionOwner(): VoiceSessionOwner {
  return owner;
}

export function claimVoiceSession(nextOwner: VoiceSessionOwner): void {
  if (owner === nextOwner) return;
  owner = nextOwner;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VOICE_SESSION_EVENT, { detail: { owner } }));
  }
}

export function releaseVoiceSession(currentOwner: VoiceSessionOwner): void {
  if (owner !== currentOwner) return;
  owner = "global";
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VOICE_SESSION_EVENT, { detail: { owner } }));
  }
}

export function ownsVoiceSession(expectedOwner: VoiceSessionOwner): boolean {
  return owner === expectedOwner;
}