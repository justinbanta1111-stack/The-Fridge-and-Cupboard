/**
 * Permission consent helpers.
 *
 * Apple requires that camera / microphone / photo prompts appear only when the
 * person actually chooses a feature that needs them — never on launch. These
 * helpers record that the user has opted into a capability so we can start the
 * hands-free voice loop (and the camera) at the right moment, and only then.
 */

export type Capability = "microphone" | "camera" | "photos";

const KEY: Record<Capability, string> = {
  microphone: "tfc.consent.microphone.v1",
  camera: "tfc.consent.camera.v1",
  photos: "tfc.consent.photos.v1",
};

export const VOICE_CONSENT_EVENT = "tfc:voice-consent";

export function hasConsent(cap: Capability): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY[cap]) === "1";
  } catch {
    return false;
  }
}

export function grantConsent(cap: Capability) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY[cap], "1");
  } catch {
    /* private mode — consent lives for this session only */
  }
  if (cap === "microphone") {
    window.dispatchEvent(new CustomEvent(VOICE_CONSENT_EVENT));
  }
}

export function revokeConsent(cap: Capability) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY[cap]);
  } catch {
    /* ignore */
  }
}

/** Plain-language reason shown before the system prompt appears. */
export const PERMISSION_REASON: Record<Capability, string> = {
  camera:
    "The camera is used to take a photo of your fridge, cupboard or a store shelf so Chef Super J can see what food you have.",
  microphone:
    "The microphone is used only while you are talking to Chef Super J, so you can ask cooking questions hands-free.",
  photos:
    "Photo access is used only to read the picture you choose, so it can be scanned for ingredients.",
};

/** What to tell someone who said no and wants to change their mind. */
export const PERMISSION_HELP: Record<Capability, string[]> = {
  camera: [
    "Open the iPhone Settings app.",
    "Scroll down and tap The Fridge & Cupboard.",
    "Turn Camera on.",
    "Come back to the app and try the scan again.",
    "You can always use Choose from Photos instead of the camera.",
  ],
  microphone: [
    "Open the iPhone Settings app.",
    "Scroll down and tap The Fridge & Cupboard.",
    "Turn Microphone and Speech Recognition on.",
    "Come back and tap Talk to Chef again.",
    "You can always type your question instead of speaking.",
  ],
  photos: [
    "Open the iPhone Settings app.",
    "Scroll down and tap The Fridge & Cupboard.",
    "Tap Photos and choose Selected Photos or All Photos.",
    "Come back and choose your photo again.",
  ],
};
