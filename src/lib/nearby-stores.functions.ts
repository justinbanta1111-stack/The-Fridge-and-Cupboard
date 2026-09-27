import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().min(500).max(20000).default(6000),
});

export type NearbyStore = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  openNow?: boolean;
  mapsUri?: string;
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const findNearbyStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ stores: NearbyStore[] }> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) {
      throw new Error("Google Maps is not configured yet.");
    }

    const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.location",
          "places.rating",
          "places.currentOpeningHours.openNow",
          "places.googleMapsUri",
        ].join(","),
      },
      body: JSON.stringify({
        includedTypes: ["grocery_store", "supermarket"],
        maxResultCount: 12,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: data.latitude, longitude: data.longitude },
            radius: data.radiusMeters,
          },
        },
      }),
    });

    if (response.status === 403) {
      const details: Array<{ reason?: string }> =
        (await response.json().catch(() => null))?.error?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
        throw new Error(
          'Google Maps server key is referrer-restricted. In Google Cloud Console, set the server key\'s application restrictions to "None" or "IP addresses".',
        );
      }
      if (reason === "API_KEY_SERVICE_BLOCKED") {
        throw new Error(
          "Google Maps server key does not allow the Places API. Add it to the server key's allowed-APIs list in Google Cloud Console.",
        );
      }
      throw new Error("Google Maps request was denied (403). Check the server key's restrictions.");
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`Places searchNearby failed [${response.status}]: ${body}`);
      throw new Error(`Could not load nearby stores (${response.status}).`);
    }

    const json = (await response.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        rating?: number;
        currentOpeningHours?: { openNow?: boolean };
        googleMapsUri?: string;
      }>;
    };

    const stores: NearbyStore[] = (json.places ?? [])
      .filter((p) => p.location?.latitude != null && p.location?.longitude != null)
      .map((p) => ({
        id: p.id ?? `${p.location!.latitude},${p.location!.longitude}`,
        name: p.displayName?.text ?? "Grocery store",
        address: p.formattedAddress ?? "",
        latitude: p.location!.latitude!,
        longitude: p.location!.longitude!,
        rating: p.rating,
        openNow: p.currentOpeningHours?.openNow,
        mapsUri: p.googleMapsUri,
      }));

    return { stores };
  });
