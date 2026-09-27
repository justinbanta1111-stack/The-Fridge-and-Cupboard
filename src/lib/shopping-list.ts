/**
 * Local-first shopping list. Works for guests and signed-in users alike
 * (localStorage), mirroring the pattern used by saved-items.ts.
 */

const KEY = "tfc_shopping_list_v1";

export type ShoppingListItem = {
  id: string;
  name: string;
  qty?: string;
  done: boolean;
  at: number;
};

function read(): ShoppingListItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShoppingListItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: ShoppingListItem[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 300)));
  } catch {
    /* ignore */
  }
}

export function getShoppingList(): ShoppingListItem[] {
  return read().sort((a, b) => Number(a.done) - Number(b.done) || b.at - a.at);
}

export function addShoppingItem(name: string, qty?: string): ShoppingListItem[] {
  const clean = name.trim();
  if (!clean) return getShoppingList();
  const items = read();
  const exists = items.find((i) => i.name.toLowerCase() === clean.toLowerCase());
  if (exists) {
    exists.done = false;
    if (qty) exists.qty = qty;
  } else {
    items.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: clean,
      qty: qty?.trim() || undefined,
      done: false,
      at: Date.now(),
    });
  }
  write(items);
  return getShoppingList();
}

export function toggleShoppingItem(id: string): ShoppingListItem[] {
  const items = read().map((i) => (i.id === id ? { ...i, done: !i.done } : i));
  write(items);
  return getShoppingList();
}

export function removeShoppingItem(id: string): ShoppingListItem[] {
  write(read().filter((i) => i.id !== id));
  return getShoppingList();
}

export function clearDoneShoppingItems(): ShoppingListItem[] {
  write(read().filter((i) => !i.done));
  return getShoppingList();
}

/** Loose match: "roma tomatoes" counts as having "tomato". */
export function haveInKitchen(name: string, kitchen: string[]): boolean {
  const n = name.toLowerCase().trim();
  if (!n) return false;
  const singular = n.endsWith("es") ? n.slice(0, -2) : n.endsWith("s") ? n.slice(0, -1) : n;
  return kitchen.some((raw) => {
    const k = raw.toLowerCase().trim();
    if (!k) return false;
    return (
      k.includes(n) ||
      n.includes(k) ||
      (singular.length > 2 && (k.includes(singular) || singular.includes(k)))
    );
  });
}
