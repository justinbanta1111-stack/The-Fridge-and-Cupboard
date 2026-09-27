import { useEffect, useState } from "react";
import { canSellHere, everythingUnlockedHere } from "@/lib/store-purchases";

/**
 * Whether plans, prices and purchase buttons may be shown on this device.
 * Decided after mount so the server-rendered page and the browser match.
 */
export function useCanSell(): boolean {
  const [canSell, setCanSell] = useState(true);
  useEffect(() => setCanSell(canSellHere()), []);
  return canSell;
}

/** Whether paid features should be open to everyone on this device. */
export function useEverythingUnlocked(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(everythingUnlockedHere()), []);
  return open;
}
