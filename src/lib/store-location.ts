/** The store the shopper picked, remembered on this device. */
export type SavedStore = {
  locationId: string;
  name: string;
  city: string;
  state: string;
  zip: string;
};

const KEY = "fc.store.location";

export function getSavedStore(): SavedStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedStore;
    return parsed && typeof parsed.locationId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStore(store: SavedStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable */
  }
}

export function clearSavedStore() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getSavedZip(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("fc.store.zip") ?? "";
  } catch {
    return "";
  }
}

export function saveZip(zip: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("fc.store.zip", zip);
  } catch {
    /* storage unavailable */
  }
}
