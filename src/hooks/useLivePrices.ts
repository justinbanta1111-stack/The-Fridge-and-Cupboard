/**
 * Loads real grocery prices from the price database (national averages) plus
 * the cook's own store corrections, and feeds them into the cost estimator so
 * every meal cost shown is based on real data rather than a built-in guess.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  applyGroceryPrices,
  applyMyStorePrices,
  priceSourceNote,
  livePriceCount,
  type LivePriceRow,
} from "@/lib/grocery-prices";

export const ACTIVE_STORE_KEY = "tfc.store.active.v1";

export function getActiveStore(): string {
  if (typeof localStorage === "undefined") return "My store";
  try {
    return localStorage.getItem(ACTIVE_STORE_KEY) || "My store";
  } catch {
    return "My store";
  }
}

export function setActiveStore(name: string) {
  try {
    localStorage.setItem(ACTIVE_STORE_KEY, name.trim() || "My store");
  } catch {
    /* ignore */
  }
}

let loaded = false;
let loading: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  for (const fn of listeners) fn();
}

async function loadPrices(): Promise<void> {
  const { data } = await supabase
    .from("grocery_prices")
    .select("item_key, label, per_lb, per_each, per_cup, per_tbsp, source, checked_on");
  if (data) applyGroceryPrices(data as LivePriceRow[]);
  loaded = true;
  notify();

  const { data: session } = await supabase.auth.getSession();
  if (session.session) {
    const { data: mine } = await supabase
      .from("user_grocery_prices")
      .select("item_key, label, per_lb, per_each, per_cup, per_tbsp")
      .eq("store_name", getActiveStore());
    if (mine) applyMyStorePrices(mine as LivePriceRow[]);
    notify();
  }
}

export type LivePrices = {
  /** True once real database prices are in use. */
  ready: boolean;
  /** Plain-English note about where these prices came from. */
  note: string;
  /** How many grocery items the database covers. */
  count: number;
  /** Bumps every time prices change, so pages can re-price their meals. */
  version: number;
  /** The store these prices belong to. */
  store: string;
  /** Re-read prices, e.g. after saving a store price. */
  refresh: () => Promise<void>;
};

export function useLivePrices(): LivePrices {
  const [, bump] = useState(0);

  useEffect(() => {
    const onChange = () => bump((n) => n + 1);
    listeners.add(onChange);
    if (!loading) loading = loadPrices().catch(() => undefined);
    void loading.then(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return {
    ready: loaded,
    note: priceSourceNote(),
    count: livePriceCount(),
    version,
    store: getActiveStore(),
    refresh: async () => {
      loading = loadPrices().catch(() => undefined);
      await loading;
      bump((n) => n + 1);
    },
  };
}
