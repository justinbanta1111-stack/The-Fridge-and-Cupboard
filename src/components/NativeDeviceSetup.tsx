import { useEffect } from "react";
import {
  onAppResume,
  restoreDeviceBackedKeys,
  syncDeviceBackedKeys,
} from "@/lib/native-bridge";
import { isNativeApp } from "@/lib/native-runtime";
import { registerNativeAuthListener } from "@/lib/native-auth";

/**
 * Headless. Inside the iOS / Android app it keeps the on-device copy of the
 * kitchen, saved recipes, shopping list and cooking progress in sync so the
 * app opens fully usable with no connection, and restores state on resume.
 * Renders nothing and does nothing at all on the website.
 */
export function NativeDeviceSetup() {
  useEffect(() => {
    if (!isNativeApp()) return;

    void restoreDeviceBackedKeys();
    const stopAuthListener = registerNativeAuthListener();

    const push = () => void syncDeviceBackedKeys();
    const interval = window.setInterval(push, 20000);
    const stopResume = onAppResume(() => {
      void restoreDeviceBackedKeys();
      void syncDeviceBackedKeys();
    });
    window.addEventListener("pagehide", push);
    window.addEventListener("blur", push);

    return () => {
      push();
      window.clearInterval(interval);
      stopResume();
      stopAuthListener();
      window.removeEventListener("pagehide", push);
      window.removeEventListener("blur", push);
    };
  }, []);

  return null;
}
