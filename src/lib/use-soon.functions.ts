import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Urgency = "red" | "orange" | "yellow" | "green";

export type UseSoonItem = {
  name: string;
  category: string;
  urgency: Urgency;
  daysOld: number;
  reason: string;
  scanId: string;
  scanLabel: string; // "fridge" | "pantry" | "leftovers"
};

export type UseSoonSummary = {
  items: UseSoonItem[];
  redCount: number;
  orangeCount: number;
  yellowCount: number;
  totalPerishable: number;
  scanCount: number;
};

// Heuristic shelf life (days) by ingredient keyword. Lower bound only —
// we surface "use soon" once age > softLimit, "use now" once age > hardLimit.
const SHELF: Array<{ match: RegExp; soft: number; hard: number; cat: string }> = [
  { match: /\b(spinach|arugula|basil|cilantro|parsley|mint|dill|chive|herb|lettuce|kale|microgreen)\b/i, soft: 3, hard: 5, cat: "herbs" },
  { match: /\b(berr(y|ies)|strawberr|raspberr|blueberr|blackberr|cherr)\b/i, soft: 3, hard: 5, cat: "fruit" },
  { match: /\b(banana|peach|nectarine|plum|avocado|mango|kiwi|pear|grape|melon)\b/i, soft: 4, hard: 6, cat: "fruit" },
  { match: /\b(milk|cream|half[- ]?and[- ]?half|buttermilk)\b/i, soft: 5, hard: 8, cat: "dairy" },
  { match: /\b(yogurt|cottage|ricotta|sour cream|crème fraîche|creme fraiche)\b/i, soft: 7, hard: 12, cat: "dairy" },
  { match: /\b(cheese|brie|camembert|mozzarella|feta)\b/i, soft: 7, hard: 14, cat: "dairy" },
  { match: /\b(chicken|turkey|beef|pork|lamb|fish|salmon|shrimp|prawn|tuna|cod|sausage|bacon|ham|deli|cold cut|leftover)\b/i, soft: 2, hard: 4, cat: "meat" },
  { match: /\b(egg|eggs)\b/i, soft: 14, hard: 21, cat: "dairy" },
  { match: /\b(tomato|cucumber|pepper|zucchini|squash|eggplant|broccoli|cauliflower|asparagus|mushroom|green bean|snap pea|corn|celery)\b/i, soft: 5, hard: 8, cat: "vegetable" },
  { match: /\b(carrot|cabbage|beet|radish|turnip|leek|onion|garlic|potato|sweet potato|yam|squash)\b/i, soft: 14, hard: 21, cat: "vegetable" },
  { match: /\b(tofu|tempeh|hummus|salsa|guacamole|opened)\b/i, soft: 4, hard: 7, cat: "prepared" },
];

const PERISHABLE_CATS = new Set([
  "produce", "vegetable", "vegetables", "fruit", "fruits",
  "dairy", "meat", "seafood", "fish", "poultry", "herbs",
  "leftover", "leftovers", "prepared",
]);

function classify(name: string, category: string, daysOld: number, freshnessHint?: string) {
  // Honor explicit AI freshness hints first.
  const fh = (freshnessHint || "").toLowerCase();
  if (fh === "throw-out") return { urgency: "red" as Urgency, reason: "Marked spoiled at scan", cat: category || "item" };
  if (fh === "use-now" || fh === "use-today") return { urgency: "red" as Urgency, reason: "Flagged use-today at scan", cat: category || "item" };
  if (fh === "use-soon") return { urgency: "orange" as Urgency, reason: "Flagged use-soon at scan", cat: category || "item" };

  const text = `${name} ${category}`;
  const rule = SHELF.find((r) => r.match.test(text));
  const catLower = (category || "").toLowerCase();
  const isPerishable = !!rule || PERISHABLE_CATS.has(catLower);

  if (!isPerishable) return { urgency: "green" as Urgency, reason: "Shelf-stable", cat: category || "pantry" };

  const soft = rule?.soft ?? 5;
  const hard = rule?.hard ?? 8;
  const cat = rule?.cat ?? catLower ?? "perishable";

  if (daysOld >= hard) return { urgency: "red" as Urgency, reason: `${daysOld}d old — use today`, cat };
  if (daysOld >= soft) return { urgency: "orange" as Urgency, reason: `${daysOld}d old — eat in 1–2 days`, cat };
  if (daysOld >= Math.max(1, soft - 2)) return { urgency: "yellow" as Urgency, reason: `Watch it — ${daysOld}d old`, cat };
  return { urgency: "green" as Urgency, reason: "Still fresh", cat };
}

export const getUseSoonItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UseSoonSummary> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fridge_scans")
      .select("id, items, created_at, cuisine")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);

    const now = Date.now();
    const seen = new Set<string>();
    const items: UseSoonItem[] = [];

    for (const scan of data ?? []) {
      const created = scan.created_at ? new Date(scan.created_at).getTime() : now;
      const daysOld = Math.max(0, Math.floor((now - created) / 86_400_000));
      const arr = Array.isArray(scan.items) ? (scan.items as any[]) : [];

      // Detect scan "label" from cuisine field or item categories.
      const cuisine = (scan.cuisine ?? "").toString().toLowerCase();
      let scanLabel = "fridge";
      if (cuisine.includes("pantry") || cuisine.includes("cupboard")) scanLabel = "pantry";
      else if (cuisine.includes("leftover")) scanLabel = "leftovers";

      for (const it of arr) {
        const name = (it?.name ?? "").toString().trim();
        if (!name) continue;
        if (it?.unsafe === true) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const category = (it?.category ?? "").toString();
        const freshness = (it?.freshness ?? "").toString();
        const { urgency, reason, cat } = classify(name, category, daysOld, freshness);

        if (urgency === "green") continue; // only surface things worth attention

        items.push({
          name,
          category: cat,
          urgency,
          daysOld,
          reason,
          scanId: scan.id,
          scanLabel,
        });
      }
    }

    // Sort: red → orange → yellow, then oldest first.
    const order: Record<Urgency, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
    items.sort((a, b) => order[a.urgency] - order[b.urgency] || b.daysOld - a.daysOld);

    const redCount = items.filter((i) => i.urgency === "red").length;
    const orangeCount = items.filter((i) => i.urgency === "orange").length;
    const yellowCount = items.filter((i) => i.urgency === "yellow").length;

    return {
      items,
      redCount,
      orangeCount,
      yellowCount,
      totalPerishable: items.length,
      scanCount: data?.length ?? 0,
    };
  });
