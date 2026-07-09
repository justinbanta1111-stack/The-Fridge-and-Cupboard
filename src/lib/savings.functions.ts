import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LogInput = z.object({
  recipeTitle: z.string().min(1).max(200),
  estimatedSavingsCents: z.number().int().min(0).max(50000).optional(),
  poundsRescued: z.number().min(0).max(50).optional(),
  source: z.enum(["recipe", "leftover", "manual"]).optional(),
  scanId: z.string().uuid().optional(),
});

export const logCookedMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LogInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("savings_events").insert({
      user_id: userId,
      recipe_title: data.recipeTitle,
      estimated_savings_cents: data.estimatedSavingsCents ?? 600,
      pounds_rescued: data.poundsRescued ?? 0.5,
      source: data.source ?? "recipe",
      scan_id: data.scanId ?? null,
    });
    if (error) throw new Error(`Couldn't log meal: ${error.message}`);
    return { ok: true };
  });

export type SavingsSummary = {
  totalCents: number;
  weekCents: number;
  monthCents: number;
  yearCents: number;
  totalPounds: number;
  weekPounds: number;
  mealsCount: number;
  weekMeals: number;
  monthMeals: number;
  streakDays: number;
  activeDays: number; // distinct days the user logged a meal (days using the app actively)
  firstCookedAt: string | null;
  daily: { date: string; cents: number; meals: number }[];
  weekly: { weekStart: string; cents: number; meals: number }[]; // last 8 weeks
  recent: { id: string; recipeTitle: string; estimatedSavingsCents: number; cookedAt: string }[];
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function weekStartKey(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday as week start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return dayKey(x);
}


export const getSavingsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavingsSummary> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("savings_events")
      .select("id, recipe_title, estimated_savings_cents, pounds_rescued, cooked_at")
      .eq("user_id", userId)
      .order("cooked_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekStartMs = weekStart.getTime();

    let totalCents = 0,
      weekCents = 0,
      monthCents = 0,
      yearCents = 0,
      totalPounds = 0,
      weekPounds = 0,
      weekMeals = 0,
      monthMeals = 0;
    let firstCookedAt: string | null = null;
    const dailyMap = new Map<string, { cents: number; meals: number }>();
    const weeklyMap = new Map<string, { cents: number; meals: number }>();
    const cookedDays = new Set<string>();

    for (const r of rows) {
      const cooked = new Date(r.cooked_at);
      const t = cooked.getTime();
      totalCents += r.estimated_savings_cents;
      totalPounds += Number(r.pounds_rescued ?? 0);
      if (t >= weekStartMs) {
        weekCents += r.estimated_savings_cents;
        weekPounds += Number(r.pounds_rescued ?? 0);
        weekMeals += 1;
      }
      if (t >= monthStart) {
        monthCents += r.estimated_savings_cents;
        monthMeals += 1;
      }
      if (t >= yearStart) yearCents += r.estimated_savings_cents;
      const k = dayKey(cooked);
      cookedDays.add(k);
      const e = dailyMap.get(k) ?? { cents: 0, meals: 0 };
      e.cents += r.estimated_savings_cents;
      e.meals += 1;
      dailyMap.set(k, e);
      const wk = weekStartKey(cooked);
      const we = weeklyMap.get(wk) ?? { cents: 0, meals: 0 };
      we.cents += r.estimated_savings_cents;
      we.meals += 1;
      weeklyMap.set(wk, we);
      if (!firstCookedAt || t < new Date(firstCookedAt).getTime()) {
        firstCookedAt = r.cooked_at;
      }
    }

    // Last 30 days timeline
    const daily: SavingsSummary["daily"] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const e = dailyMap.get(k);
      daily.push({ date: k, cents: e?.cents ?? 0, meals: e?.meals ?? 0 });
    }

    // Last 8 weeks
    const weekly: SavingsSummary["weekly"] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - i * 7);
      const k = weekStartKey(d);
      const e = weeklyMap.get(k);
      weekly.push({ weekStart: k, cents: e?.cents ?? 0, meals: e?.meals ?? 0 });
    }

    // Streak: consecutive days ending today (or yesterday) with a cooked meal
    let streak = 0;
    const cursor = new Date();
    if (!cookedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (cookedDays.has(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      totalCents,
      weekCents,
      monthCents,
      yearCents,
      totalPounds: Math.round(totalPounds * 10) / 10,
      weekPounds: Math.round(weekPounds * 10) / 10,
      mealsCount: rows.length,
      weekMeals,
      monthMeals,
      streakDays: streak,
      activeDays: cookedDays.size,
      firstCookedAt,
      daily,
      weekly,
      recent: rows.slice(0, 10).map((r) => ({
        id: r.id,
        recipeTitle: r.recipe_title,
        estimatedSavingsCents: r.estimated_savings_cents,
        cookedAt: r.cooked_at,
      })),
    };
  });


// Aggregate unique inventory across the user's recent scans so recipe
// suggestions can blend fridge + cupboard + leftovers automatically.
export type RecentInventory = {
  items: string[];
  fridgeCount: number;
  pantryCount: number;
  scanCount: number;
};

export const getRecentInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RecentInventory> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fridge_scans")
      .select("items, cuisine, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) throw new Error(error.message);

    const seen = new Set<string>();
    const items: string[] = [];
    let fridgeCount = 0;
    let pantryCount = 0;

    for (const scan of data ?? []) {
      const arr = Array.isArray(scan.items) ? (scan.items as any[]) : [];
      for (const it of arr) {
        const name = (it?.name ?? "").toString().trim();
        if (!name) continue;
        if (it?.unsafe === true || it?.freshness === "throw-out") continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(name);
        const cat = (it?.category ?? "").toString().toLowerCase();
        if (cat === "pantry" || cat === "spice" || cat === "baked") pantryCount += 1;
        else fridgeCount += 1;
      }
    }

    return { items, fridgeCount, pantryCount, scanCount: data?.length ?? 0 };
  });
