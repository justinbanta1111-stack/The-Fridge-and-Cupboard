/**
 * Thin, SSR-safe bridge to the real iOS / Android device features.
 *
 * Every function is a no-op on the website, so web behaviour is unchanged.
 * All Capacitor plugins are imported dynamically inside the functions so the
 * server render and the browser bundle never pull native code eagerly.
 */

import { isNativeApp } from "@/lib/native-runtime";

/* ------------------------------------------------------------------ haptics */

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export async function haptic(style: HapticStyle = "light"): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (style === "success" || style === "warning" || style === "error") {
      const type =
        style === "success"
          ? NotificationType.Success
          : style === "warning"
            ? NotificationType.Warning
            : NotificationType.Error;
      await Haptics.notification({ type });
      return;
    }
    const impact =
      style === "heavy" ? ImpactStyle.Heavy : style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light;
    await Haptics.impact({ style: impact });
  } catch {
    /* device without haptics — ignore */
  }
}

/* -------------------------------------------------------------------- share */

export async function nativeShareSheet(opts: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({
      title: opts.title,
      text: opts.text,
      url: opts.url,
      dialogTitle: opts.dialogTitle ?? opts.title ?? "Share",
    });
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------- local notifications */

export type NativeNotifPermission = "granted" | "denied" | "prompt" | "unsupported";

export async function nativeNotificationPermission(): Promise<NativeNotifPermission> {
  if (!isNativeApp()) return "unsupported";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.checkPermissions();
    return res.display === "granted" ? "granted" : res.display === "denied" ? "denied" : "prompt";
  } catch {
    return "unsupported";
  }
}

export async function requestNativeNotificationPermission(): Promise<NativeNotifPermission> {
  if (!isNativeApp()) return "unsupported";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.requestPermissions();
    return res.display === "granted" ? "granted" : res.display === "denied" ? "denied" : "prompt";
  } catch {
    return "unsupported";
  }
}

/** Fire (or schedule) a real device notification. `at` in the future schedules it. */
export async function scheduleNativeNotification(opts: {
  id?: number;
  title: string;
  body: string;
  at?: Date;
}): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return false;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: opts.id ?? Math.floor(Math.random() * 100000) + 1,
          title: opts.title,
          body: opts.body,
          schedule: opts.at ? { at: opts.at } : { at: new Date(Date.now() + 1500) },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- app state */

/** Runs the callback each time the app returns to the foreground. */
export function onAppResume(cb: () => void): () => void {
  if (!isNativeApp()) return () => {};
  let remove: (() => void) | null = null;
  let cancelled = false;
  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) cb();
      });
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    } catch {
      /* ignore */
    }
  })();
  return () => {
    cancelled = true;
    remove?.();
  };
}

/* ------------------------------------------------------------------ network */

export async function nativeIsOnline(): Promise<boolean | null> {
  if (!isNativeApp()) return null;
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return null;
  }
}

export function onNativeNetworkChange(cb: (online: boolean) => void): () => void {
  if (!isNativeApp()) return () => {};
  let remove: (() => void) | null = null;
  let cancelled = false;
  void (async () => {
    try {
      const { Network } = await import("@capacitor/network");
      const handle = await Network.addListener("networkStatusChange", (s) => cb(s.connected));
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    } catch {
      /* ignore */
    }
  })();
  return () => {
    cancelled = true;
    remove?.();
  };
}

/* -------------------------------------------------- durable device storage */

/**
 * Mirrors a localStorage key into native Preferences so the value survives
 * a force-quit, an iOS webview data purge, and offline launches.
 */
export async function persistToDevice(key: string, value: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
  } catch {
    /* ignore */
  }
}

export async function readFromDevice(key: string): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } catch {
    return null;
  }
}

/** Keys whose contents must survive offline launches and force-quits. */
export const DEVICE_BACKED_KEYS = [
  "tfc_shopping_list_v1",
  "tfc_expiry_reminders_v1",
  "tfc.saved.recipes.v1",
  "tfc.inventory.v1",
  "tfc.kitchen.items.v1",
  "tfc.cooking.progress.v1",
  "tfc.chef.memory.v1",
];

/** Copy any device-backed values back into localStorage on a cold start. */
export async function restoreDeviceBackedKeys(): Promise<void> {
  if (!isNativeApp() || typeof localStorage === "undefined") return;
  for (const key of DEVICE_BACKED_KEYS) {
    try {
      if (localStorage.getItem(key) != null) continue;
      const value = await readFromDevice(key);
      if (value != null) localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }
}

/** Push the current localStorage values down to the device store. */
export async function syncDeviceBackedKeys(): Promise<void> {
  if (!isNativeApp() || typeof localStorage === "undefined") return;
  for (const key of DEVICE_BACKED_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value != null) await persistToDevice(key, value);
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------- camera */

/**
 * Opens the real iOS / Android camera (not the browser file input) and
 * returns the captured photo as a File. Returns null on the website, or
 * when the user cancels. The existing "Use this photo / Retake" review
 * screen still handles the result, unchanged.
 */
export async function nativeCapturePhoto(): Promise<File | null> {
  if (!isNativeApp()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      quality: 82,
      allowEditing: false,
      correctOrientation: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
    });
    if (!photo?.dataUrl) return null;
    const res = await fetch(photo.dataUrl);
    const blob = await res.blob();
    return new File([blob], `fridge-photo-${Date.now()}.jpg`, {
      type: blob.type || "image/jpeg",
    });
  } catch (err) {
    const msg = String((err as Error)?.message ?? err ?? "");
    // User tapped Cancel — not an error worth surfacing.
    if (/cancel/i.test(msg)) return null;
    throw err;
  }
}

/** Opens the native iOS / Android photo library and returns selected images. */
export async function nativePickPhotos(): Promise<File[]> {
  if (!isNativeApp()) return [];
  try {
    const { Camera } = await import("@capacitor/camera");
    const selection = await Camera.pickImages({
      quality: 82,
      limit: 0,
    });
    const files = await Promise.all(
      selection.photos.map(async (photo, index) => {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        return new File([blob], `fridge-library-${Date.now()}-${index + 1}.jpg`, {
          type: blob.type || "image/jpeg",
        });
      }),
    );
    return files;
  } catch (err) {
    const message = String((err as Error)?.message ?? err ?? "");
    if (/cancel/i.test(message)) return [];
    throw err;
  }
}
