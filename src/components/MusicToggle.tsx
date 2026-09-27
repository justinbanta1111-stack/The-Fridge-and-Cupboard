import { useEffect } from "react";
import { startAmbientMusic, stopAmbientMusic } from "@/lib/ambient-music";

/**
 * Headless background-music starter. There is no visible music button: the
 * soft blues atmosphere fades in on its own once audio is allowed, and if the
 * browser blocks autoplay it silently starts on the first interaction.
 */
export function MusicToggle() {
  useEffect(() => {
    // Start softly a moment after the welcome begins.
    const kickoff = window.setTimeout(() => {
      void startAmbientMusic();
    }, 2600);

    // Fallback: browsers that block audio until a gesture.
    const onGesture = () => {
      void startAmbientMusic();
    };
    const onPageHide = () => stopAmbientMusic();
    const onPageShow = () => void startAmbientMusic();
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.clearTimeout(kickoff);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
