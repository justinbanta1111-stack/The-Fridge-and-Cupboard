import { useEffect, useRef } from "react";
import type { NearbyStore } from "@/lib/nearby-stores.functions";

declare global {
  interface Window {
    google?: any;
    __tfcMapsReady?: boolean;
    __tfcInitMap?: () => void;
  }
}

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.__tfcMapsReady && window.google?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("tfc-google-maps") as HTMLScriptElement | null;
    const done = () => resolve();
    if (existing) {
      if (window.google?.maps) return done();
      existing.addEventListener("load", () => {
        const t = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(t);
            done();
          }
        }, 50);
      });
      existing.addEventListener("error", () => reject(new Error("Maps failed to load")));
      return;
    }
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ?? "";
    if (!key) return reject(new Error("Maps key missing"));
    window.__tfcInitMap = () => {
      window.__tfcMapsReady = true;
      done();
    };
    const script = document.createElement("script");
    script.id = "tfc-google-maps";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__tfcInitMap&channel=${channel}`;
    script.onerror = () => reject(new Error("Maps failed to load"));
    document.head.appendChild(script);
  });
}

export function StoreMap({
  center,
  stores,
  activeId,
}: {
  center: { lat: number; lng: number };
  stores: NearbyStore[];
  activeId?: string | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.maps) return;
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(ref.current, {
            center,
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true,
          });
        }
        const map = mapRef.current;
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        new window.google.maps.Marker({
          position: center,
          map,
          title: "You",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(center);
        stores.forEach((s, i) => {
          const marker = new window.google.maps.Marker({
            position: { lat: s.latitude, lng: s.longitude },
            map,
            title: s.name,
            label: { text: String(i + 1), color: "#ffffff", fontWeight: "700" },
          });
          markersRef.current.push(marker);
          bounds.extend({ lat: s.latitude, lng: s.longitude });
        });
        if (stores.length > 0) map.fitBounds(bounds, 48);
      })
      .catch((err) => console.error("Map load error", err));
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, stores]);

  useEffect(() => {
    if (!activeId || !mapRef.current) return;
    const idx = stores.findIndex((s) => s.id === activeId);
    if (idx < 0) return;
    mapRef.current.panTo({ lat: stores[idx].latitude, lng: stores[idx].longitude });
    mapRef.current.setZoom(15);
  }, [activeId, stores]);

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Map of nearby grocery stores"
      className="h-[320px] w-full overflow-hidden rounded-2xl bg-muted sm:h-[420px]"
    />
  );
}
