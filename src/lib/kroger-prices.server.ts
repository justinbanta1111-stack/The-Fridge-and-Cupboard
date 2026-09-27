/**
 * Live grocery prices from the Kroger Developer API (Fred Meyer, QFC, Ralphs,
 * Fry's, King Soopers, Kroger and the rest of the Kroger family of stores).
 *
 * Server-only. Needs KROGER_CLIENT_ID and KROGER_CLIENT_SECRET.
 */

const BASE = "https://api.kroger.com/v1";

export type KrogerStore = {
  locationId: string;
  name: string;
  chain: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type LivePrice = {
  /** Regular shelf price for the item at this store. */
  regular: number;
  /** Sale price when the store has one running. */
  promo: number | null;
  /** The price a shopper actually pays today. */
  price: number;
  productName: string;
  brand: string | null;
  size: string | null;
};

export function krogerConfigured(): boolean {
  return Boolean(process.env["KROGER_CLIENT_ID"] && process.env["KROGER_CLIENT_SECRET"]);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;

  const id = process.env["KROGER_CLIENT_ID"];
  const secret = process.env["KROGER_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("KROGER_NOT_CONFIGURED");

  const res = await fetch(`${BASE}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kroger auth failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 1800) * 1000,
  };
  return cachedToken.token;
}

async function krogerGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = await accessToken();
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kroger request failed [${res.status}]: ${body}`);
  }
  return (await res.json()) as T;
}

type LocationsResponse = {
  data?: Array<{
    locationId: string;
    chain?: string;
    name?: string;
    address?: {
      addressLine1?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  }>;
};

/** Stores near a US ZIP code, closest first. */
export async function storesNearZip(zip: string, limit = 8): Promise<KrogerStore[]> {
  const json = await krogerGet<LocationsResponse>("/locations", {
    "filter.zipCode.near": zip,
    "filter.limit": String(Math.min(Math.max(limit, 1), 20)),
  });
  return (json.data ?? []).map((loc) => ({
    locationId: loc.locationId,
    name: loc.name ?? loc.chain ?? "Kroger store",
    chain: loc.chain ?? "",
    address: loc.address?.addressLine1 ?? "",
    city: loc.address?.city ?? "",
    state: loc.address?.state ?? "",
    zip: loc.address?.zipCode ?? "",
  }));
}

type ProductsResponse = {
  data?: Array<{
    description?: string;
    brand?: string;
    items?: Array<{
      size?: string;
      price?: { regular?: number; promo?: number };
    }>;
  }>;
};

/** Cheap in-memory cache so one scan doesn't re-ask for the same term. */
const priceCache = new Map<string, { value: LivePrice | null; at: number }>();
const PRICE_TTL_MS = 15 * 60_000;

/** The current shelf price for a search term at one store, or null if unknown. */
export async function livePriceFor(term: string, locationId: string): Promise<LivePrice | null> {
  const clean = term.replace(/\s+/g, " ").trim().slice(0, 60);
  if (!clean || !locationId) return null;

  const key = `${locationId}|${clean.toLowerCase()}`;
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.at < PRICE_TTL_MS) return hit.value;

  let value: LivePrice | null = null;
  try {
    const json = await krogerGet<ProductsResponse>("/products", {
      "filter.term": clean,
      "filter.locationId": locationId,
      "filter.limit": "12",
    });
    const priced = (json.data ?? [])
      .flatMap((product) =>
        (product.items ?? []).map((item) => ({
          regular: item.price?.regular ?? 0,
          promo: item.price?.promo && item.price.promo > 0 ? item.price.promo : null,
          productName: product.description ?? clean,
          brand: product.brand ?? null,
          size: item.size ?? null,
        })),
      )
      .filter((row) => row.regular > 0);

    if (priced.length) {
      // Median-ish pick: avoids a single odd bulk or clearance listing skewing things.
      priced.sort((a, b) => (a.promo ?? a.regular) - (b.promo ?? b.regular));
      const pick = priced[Math.floor(priced.length / 2)]!;
      value = { ...pick, price: pick.promo ?? pick.regular };
    }
  } catch {
    value = null;
  }

  priceCache.set(key, { value, at: Date.now() });
  return value;
}

/** Prices for several terms at once, keyed by the term passed in. */
export async function livePricesFor(
  terms: string[],
  locationId: string,
): Promise<Map<string, LivePrice>> {
  const out = new Map<string, LivePrice>();
  if (!krogerConfigured() || !locationId) return out;
  const unique = [...new Set(terms.map((t) => t.trim()).filter(Boolean))].slice(0, 12);
  const results = await Promise.all(
    unique.map(async (term) => [term, await livePriceFor(term, locationId)] as const),
  );
  for (const [term, price] of results) if (price) out.set(term, price);
  return out;
}
