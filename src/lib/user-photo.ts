/**
 * An optional profile photo so Chef Super J can show the person's face in the
 * greeting. Stored on the device only (never uploaded), as a small square JPEG
 * data URL so it stays tiny in localStorage.
 */

const KEY = "tfc.user.photo.v1";
export const USER_PHOTO_EVENT = "tfc:user-photo";
const MAX_SIZE = 256;

export function getSavedUserPhoto(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(KEY);
    return raw && raw.startsWith("data:image/") ? raw : "";
  } catch {
    return "";
  }
}

function announce(value: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USER_PHOTO_EVENT, { detail: value }));
}

export function clearSavedUserPhoto() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  announce("");
}

/** Reads the file, crops it to a centred square, shrinks it, and saves it. */
export async function saveUserPhotoFromFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't a photo. Pick a picture instead.");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("We couldn't read that photo. Try another one."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("We couldn't open that photo. Try another one."));
    el.src = dataUrl;
  });

  const side = Math.min(img.naturalWidth || MAX_SIZE, img.naturalHeight || MAX_SIZE);
  const canvas = document.createElement("canvas");
  canvas.width = MAX_SIZE;
  canvas.height = MAX_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("We couldn't prepare that photo on this device.");
  ctx.drawImage(
    img,
    ((img.naturalWidth || side) - side) / 2,
    ((img.naturalHeight || side) - side) / 2,
    side,
    side,
    0,
    0,
    MAX_SIZE,
    MAX_SIZE,
  );
  const small = canvas.toDataURL("image/jpeg", 0.82);
  try {
    localStorage.setItem(KEY, small);
  } catch {
    throw new Error("There isn't room to save that photo on this device.");
  }
  announce(small);
  return small;
}
