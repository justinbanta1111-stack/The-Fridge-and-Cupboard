import { useEffect, useState } from "react";
import { nativeIsOnline, onNativeNetworkChange } from "@/lib/native-bridge";

/**
 * Connection state that works both in the browser and inside the
 * iOS / Android app (where Capacitor's Network plugin is authoritative).
 * Starts optimistic so nothing flashes during SSR/hydration.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine !== false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    void nativeIsOnline().then((v) => {
      if (typeof v === "boolean") setOnline(v);
    });
    const stopNative = onNativeNetworkChange((v) => setOnline(v));

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      stopNative();
    };
  }, []);

  return online;
}
