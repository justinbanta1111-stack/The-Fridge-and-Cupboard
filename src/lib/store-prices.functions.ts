import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { KrogerStore } from "./kroger-prices.server";

const ZipInput = z.object({ zip: z.string().regex(/^\d{5}$/) });

export type StoreLookupResult = {
  configured: boolean;
  stores: KrogerStore[];
  message: string;
};

/** Finds real nearby stores so Store Mode can show that store's live prices. */
export const findStoresNearZip = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ZipInput.parse(input))
  .handler(async ({ data }): Promise<StoreLookupResult> => {
    const { krogerConfigured, storesNearZip } = await import("./kroger-prices.server");
    if (!krogerConfigured()) {
      return {
        configured: false,
        stores: [],
        message: "Live store prices aren't set up yet.",
      };
    }
    try {
      const stores = await storesNearZip(data.zip);
      return {
        configured: true,
        stores,
        message: stores.length
          ? ""
          : "No Kroger-family stores found near that ZIP code. Prices will stay as estimates.",
      };
    } catch (error) {
      return {
        configured: true,
        stores: [],
        message: error instanceof Error ? error.message : "Couldn't reach the store right now.",
      };
    }
  });
