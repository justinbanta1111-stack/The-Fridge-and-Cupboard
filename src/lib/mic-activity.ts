// Tiny shared signal: is the microphone actively capturing right now?
// Used so background music ducks (and never feeds back) while listening.

export const MIC_ACTIVE_EVENT = "tfc:mic-active";

let activeCount = 0;

export function isMicActive(): boolean {
  return activeCount > 0;
}

function emit() {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(MIC_ACTIVE_EVENT, { detail: isMicActive() }));
    }
  } catch {
    /* ignore */
  }
}

export function markMicStarted() {
  activeCount += 1;
  emit();
}

export function markMicStopped() {
  activeCount = Math.max(0, activeCount - 1);
  emit();
}

/** Safety net for screen changes / signout — force the counter back to zero. */
export function resetMicActivity() {
  if (activeCount === 0) return;
  activeCount = 0;
  emit();
}
