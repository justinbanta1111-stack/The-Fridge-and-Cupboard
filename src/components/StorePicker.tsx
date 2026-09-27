import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { MapPin, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findStoresNearZip } from "@/lib/store-prices.functions";
import {
  getSavedStore,
  getSavedZip,
  saveStore,
  saveZip,
  clearSavedStore,
  type SavedStore,
} from "@/lib/store-location";

type Props = {
  store: SavedStore | null;
  onChange: (store: SavedStore | null) => void;
};

/** Lets the shopper pick their real store so prices come from that store's shelves. */
export function StorePicker({ store, onChange }: Props) {
  const lookup = useServerFn(findStoresNearZip);
  const [open, setOpen] = useState(false);
  const [zip, setZip] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    onChange(getSavedStore());
    setZip(getSavedZip());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = useMutation({
    mutationFn: async (value: string) => lookup({ data: { zip: value } }),
    onSuccess: (res) => {
      setNote(
        res.configured
          ? res.message
          : "Real store prices aren't switched on yet, so you'll see estimates.",
      );
    },
    onError: () => setNote("I couldn't reach the store list just now. Prices stay as estimates."),
  });

  function pick(found: {
    locationId: string;
    name: string;
    city: string;
    state: string;
    zip: string;
  }) {
    const next: SavedStore = {
      locationId: found.locationId,
      name: found.name,
      city: found.city,
      state: found.state,
      zip: found.zip,
    };
    saveStore(next);
    saveZip(zip);
    onChange(next);
    setOpen(false);
    setNote("");
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
          {store ? (
            <span>
              Prices from <span className="font-semibold">{store.name}</span>
              {store.city ? `, ${store.city}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">
              Pick your store to see today's real prices instead of estimates.
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-full px-3 text-[13px]"
          onClick={() => setOpen((v) => !v)}
        >
          {store ? "Change store" : "Choose my store"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{5}$/.test(zip)) search.mutate(zip);
              else setNote("Please enter a 5-digit ZIP code.");
            }}
          >
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              placeholder="ZIP code"
              aria-label="ZIP code"
              className="h-9 w-32 rounded-md border border-border bg-background px-3 text-sm"
            />
            <Button type="submit" size="sm" className="h-9" disabled={search.isPending}>
              {search.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                "Find stores"
              )}
            </Button>
            {store && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 text-[13px]"
                onClick={() => {
                  clearSavedStore();
                  onChange(null);
                  setNote("");
                }}
              >
                Use estimates
              </Button>
            )}
          </form>

          {note && <p className="text-xs text-muted-foreground">{note}</p>}

          {(search.data?.stores.length ?? 0) > 0 && (
            <ul className="space-y-1">
              {search.data!.stores.map((found) => (
                <li key={found.locationId}>
                  <button
                    type="button"
                    onClick={() => pick(found)}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:border-primary"
                  >
                    <span>
                      <span className="font-semibold">{found.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[found.address, found.city, found.state].filter(Boolean).join(", ")}
                      </span>
                    </span>
                    {store?.locationId === found.locationId && (
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
