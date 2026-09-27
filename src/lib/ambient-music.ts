const PREF_KEY = "tfc.music.enabled.v1";

export function getMusicEnabled(): boolean {
  return false;
}

export function setMusicEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  void enabled;
  localStorage.setItem(PREF_KEY, "0");
  stopAmbientMusic();
  window.dispatchEvent(new CustomEvent("tfc:music-pref", { detail: false }));
}

export function isAmbientMusicPlaying(): boolean {
  return false;
}

export async function startAmbientMusic(): Promise<void> {
  stopAmbientMusic();
}

export function stopAmbientMusic(): void {
  // Background music is intentionally disabled so it cannot enter the mic.
}
