import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Navigation, ShoppingCart, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { StoreMap } from "@/components/StoreMap";
import { ensureGuestSession } from "@/lib/guest";
import { getShoppingList } from "@/lib/shopping-list";
import { findNearbyStores, type NearbyStore } from "@/lib/nearby-stores.functions";

export const Route = createFileRoute("/nearby-stores")({
  component: NearbyStoresPage,
  head: () => ({
    meta: [
      { title: "Nearby Grocery Stores — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "See grocery stores near you on a map, with directions, so you can go straight from your fridge scan to the store with your list in hand.",
      },
      { property: "og:title", content: "Nearby Grocery Stores — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Map your shopping trip: nearby grocery stores, ratings, and one-tap directions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function NearbyStoresPage() {
  const run = useServerFn(findNearbyStores);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needCount, setNeedCount] = useState(0);

  useEffect(() => {
    setNeedCount(getShoppingList().filter((i) => !i.done).length);
  }, []);

  async function locate() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your browser can't share location, so we can't map stores near you.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(point);
        try {
          await ensureGuestSession();
          const res = await run({
            data: { latitude: point.lat, longitude: point.lng, radiusMeters: 6000 },
          });
          setStores(res.stores);
          if (res.stores.length === 0) {
            setError("No grocery stores found within a few miles of you.");
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not load nearby stores.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError("We need location permission to show stores near you.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }

  useEffect(() => {
    void locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        <Link
          to="/shopping-list"
          className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden /> Back to shopping list
        </Link>

        <header className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
            <MapPin className="h-8 w-8 text-primary" aria-hidden />
            Nearby Stores
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {needCount > 0
              ? `You have ${needCount} item${needCount === 1 ? "" : "s"} left to buy. Pick a store and go.`
              : "Find a grocery store near you and get directions."}
          </p>
        </header>

        {center && (
          <Card className="mb-5 overflow-hidden p-0">
            <StoreMap center={center} stores={stores} activeId={activeId} />
          </Card>
        )}

        {loading && (
          <Card className="mb-5 p-5 text-center text-lg text-muted-foreground">
            Finding stores near you…
          </Card>
        )}

        {error && (
          <Card className="mb-5 p-5">
            <p className="text-base">{error}</p>
            <Button className="mt-3" onClick={() => void locate()}>
              Try again
            </Button>
          </Card>
        )}

        <ul className="space-y-3">
          {stores.map((s, i) => (
            <li key={s.id}>
              <Card
                className="flex items-start gap-3 p-4"
                onMouseEnter={() => setActiveId(s.id)}
                onFocus={() => setActiveId(s.id)}
              >
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold leading-tight">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.address}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                    {typeof s.rating === "number" && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 text-primary" aria-hidden /> {s.rating.toFixed(1)}
                      </span>
                    )}
                    {typeof s.openNow === "boolean" && (
                      <span className={s.openNow ? "font-semibold text-primary" : "text-muted-foreground"}>
                        {s.openNow ? "Open now" : "Closed"}
                      </span>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a
                    href={
                      s.mapsUri ??
                      `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Directions to ${s.name}`}
                  >
                    <Navigation className="mr-1 h-4 w-4" aria-hidden /> Go
                  </a>
                </Button>
              </Card>
            </li>
          ))}
        </ul>

        <Card className="mt-6 p-4">
          <Button asChild size="lg" className="h-14 w-full text-lg font-bold">
            <Link to="/shopping-list">
              <ShoppingCart className="mr-2 h-5 w-5" aria-hidden /> Open my shopping list
            </Link>
          </Button>
        </Card>
      </main>
    </div>
  );
}
