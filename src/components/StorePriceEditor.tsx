/**
 * "What does it cost at my store?" — lets a signed-in cook correct any grocery
 * price so every meal cost on the site uses their real numbers.
 */

import { useEffect, useMemo, useState } from "react";
import { Store, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { priceableItems, formatMoney } from "@/lib/grocery-prices";
import { useLivePrices, getActiveStore, setActiveStore } from "@/hooks/useLivePrices";

const LABELS: Record<string, string> = {};

function unitOf(entry: { perLb?: number; perEach?: number; perCup?: number; perTbsp?: number }) {
  if (entry.perLb) return { unit: "per lb" as const, value: entry.perLb, column: "per_lb" as const };
  if (entry.perEach) return { unit: "each" as const, value: entry.perEach, column: "per_each" as const };
  if (entry.perCup) return { unit: "per cup" as const, value: entry.perCup, column: "per_cup" as const };
  return { unit: "per tbsp" as const, value: entry.perTbsp ?? 0, column: "per_tbsp" as const };
}

function pretty(key: string): string {
  return LABELS[key] ?? key.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function StorePriceEditor() {
  const { note, refresh } = useLivePrices();
  const [signedIn, setSignedIn] = useState(false);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [stores, setStores] = useState<string[]>([]);
  const [store, setStore] = useState("My store");
  const [newStore, setNewStore] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      setSignedIn(Boolean(data.session));
      if (!data.session) return;
      setStore(getActiveStore());
      const { data: rows } = await supabase.from("user_stores").select("name").order("name");
      const names = (rows ?? []).map((r) => r.name as string);
      setStores(names.length ? names : ["My store"]);
    });
  }, []);

  async function chooseStore(name: string) {
    setStore(name);
    setActiveStore(name);
    setDrafts({});
    setSaved({});
    await refresh();
  }

  async function addStore() {
    const name = newStore.trim();
    if (!name) return;
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("user_stores").insert({ user_id: uid, name });
    if (error && !error.message.includes("duplicate")) {
      toast.error("Could not add that store.");
      return;
    }
    setStores((s) => (s.includes(name) ? s : [...s, name].sort()));
    setNewStore("");
    await chooseStore(name);
    toast.success(`${name} added. Prices you save now belong to this store.`);
  }

  const items = useMemo(() => {
    const all = priceableItems();
    const q = query.trim().toLowerCase();
    const filtered = q ? all.filter((i) => pretty(i.key).toLowerCase().includes(q)) : all;
    return filtered.slice(0, q ? 30 : 12);
  }, [query]);

  async function save(key: string, column: string, raw: string) {
    const value = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a price like 3.49");
      return;
    }
    const { error } = await supabase
      .from("user_grocery_prices")
      .upsert({ item_key: key, label: pretty(key), store_name: store, [column]: value } as never, {
        onConflict: "user_id,store_name,item_key",
      });
    if (error) {
      toast.error("Could not save that price. Try again.");
      return;
    }
    setSaved((s) => ({ ...s, [key]: true }));
    await refresh();
    toast.success(`${pretty(key)} saved at ${formatMoney(value)} for ${store}.`);
  }

  return (
    <Card className="mt-8 p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Store className="h-5 w-5 text-primary" aria-hidden />
        Prices at your store
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>

      {!signedIn ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to save what these cost at your own store, and every meal cost here switches to your numbers.
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-border p-3">
            <p className="text-sm font-semibold">Which store are these prices from?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {stores.map((name) => (
                <Button
                  key={name}
                  size="sm"
                  variant={name === store ? "default" : "outline"}
                  onClick={() => void chooseStore(name)}
                  aria-pressed={name === store}
                >
                  {name}
                </Button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
                placeholder="Add a store, like Safeway on 5th"
                aria-label="Add a store"
              />
              <Button variant="secondary" onClick={() => void addStore()}>
                Add
              </Button>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search an item, like chicken or milk"
              className="pl-9"
              aria-label="Search grocery items"
            />
          </div>

          <ul className="mt-4 space-y-2">
            {items.map(({ key, entry }) => {
              const u = unitOf(entry);
              return (
                <li key={key} className="flex items-center gap-3 rounded-xl border border-border p-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{pretty(key)}</span>
                  <span className="text-xs text-muted-foreground">{u.unit}</span>
                  <Input
                    inputMode="decimal"
                    className="h-9 w-24"
                    placeholder={u.value ? u.value.toFixed(2) : "0.00"}
                    value={drafts[key] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                    aria-label={`Your price for ${pretty(key)}`}
                  />
                  <Button size="sm" variant="secondary" onClick={() => void save(key, u.column, drafts[key] ?? "")}>
                    {saved[key] ? <Check className="h-4 w-4" /> : "Save"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
