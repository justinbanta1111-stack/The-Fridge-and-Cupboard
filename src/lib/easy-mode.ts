// Simple client-side Easy Mode preference. When on, recipe surfaces should
// prefer fewer ingredients, shorter steps, and beginner-friendly instructions.
const KEY = "tfc.easy-mode.v1";
const EVENT = "tfc:easy-mode-changed";

export function isEasyMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setEasyMode(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
    window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
  } catch {}
}

export function subscribeEasyMode(cb: (on: boolean) => void): () => void {
  const handler = () => cb(isEasyMode());
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
