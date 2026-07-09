// Funny Chef Mode — optional playful tone toggle. Stored client-side.

const KEY = "tfc.funny-chef.v1";

export function getFunnyMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setFunnyMode(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
    window.dispatchEvent(new CustomEvent("tfc:funny-chef:update"));
  } catch {
    // ignore
  }
}

export const FUNNY_QUIPS = [
  "That sour cream is living on borrowed time.",
  "Your spinach has questions. We have answers.",
  "Leftovers aren't sad — they're auditioning.",
  "If the cheese has a beard, we're not using it.",
  "Eggs first, regrets later.",
  "That banana is one day from a smoothie or a song.",
  "Old rice has a second act called fried rice.",
  "We can save this. Probably. Yes.",
  "Pantry diving counts as cardio.",
  "Chef's rule: if it sniffs back, toss it.",
];

export function pickQuip(seed?: number): string {
  const i = (seed ?? Date.now()) % FUNNY_QUIPS.length;
  return FUNNY_QUIPS[i];
}
