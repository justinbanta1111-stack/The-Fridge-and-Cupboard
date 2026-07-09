import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveScanInput = z.object({
  imageDataUrl: z.string().min(10),
  items: z.array(z.any()),
  summary: z.string().optional(),
  recipes: z.array(z.any()).optional(),
  cuisine: z.string().optional(),
});

function dataUrlToBuffer(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid image data URL");
  return Buffer.from(base64, "base64");
}

export const saveScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveScanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const scanId = crypto.randomUUID();
    const imagePath = `${userId}/${scanId}.jpg`;

    const buffer = dataUrlToBuffer(data.imageDataUrl);

    const { error: uploadError } = await supabase.storage
      .from("fridge-photos")
      .upload(imagePath, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { error: insertError } = await supabase.from("fridge_scans").insert({
      user_id: userId,
      image_path: imagePath,
      summary: data.summary,
      items: data.items as any,
      recipes: data.recipes ? (data.recipes as any) : null,
      cuisine: data.cuisine ?? null,
    });

    if (insertError) {
      throw new Error(`Save failed: ${insertError.message}`);
    }

    return { id: scanId, imagePath };
  });

export const getMyScans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("fridge_scans")
      .select("id, image_path, summary, items, recipes, cuisine, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Fetch failed: ${error.message}`);
    }

    // Generate signed URLs for each image
    const scansWithUrls = await Promise.all(
      (data ?? []).map(async (scan) => {
        const { data: signed, error: signError } = await supabase.storage
          .from("fridge-photos")
          .createSignedUrl(scan.image_path, 60 * 60); // 1 hour

        return {
          ...scan,
          imageUrl: signError ? null : signed?.signedUrl,
        };
      })
    );

    return { scans: scansWithUrls };
  });

// Aggregate the most urgent items across the user's recent scans.
export type UrgentItem = {
  name: string;
  category: string;
  freshness: "use-soon" | "questionable" | "throw-out";
  timeLeftLabel: string;
  notes: string;
  unsafe: boolean;
  scanId: string;
  scanCreatedAt: string;
  imageUrl: string | null;
};

const URGENT_ORDER: Record<string, number> = { questionable: 0, "use-soon": 1, "throw-out": 2 };

export const getUrgentItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("fridge_scans")
      .select("id, image_path, items, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw new Error(`Fetch failed: ${error.message}`);

    const seen = new Set<string>();
    const urgent: UrgentItem[] = [];

    for (const scan of data ?? []) {
      const items = Array.isArray(scan.items) ? (scan.items as any[]) : [];
      let signedUrl: string | null = null;
      let signed = false;

      for (const it of items) {
        const freshness = it?.freshness;
        const safetyHit = it?.unsafe === true;
        if (
          !safetyHit &&
          freshness !== "use-soon" &&
          freshness !== "questionable" &&
          freshness !== "throw-out"
        ) continue;

        const name: string = (it?.name ?? "").toString().trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        if (!signed) {
          const { data: s } = await supabase.storage
            .from("fridge-photos")
            .createSignedUrl(scan.image_path, 60 * 60);
          signedUrl = s?.signedUrl ?? null;
          signed = true;
        }

        const normalizedFreshness =
          freshness === "use-soon" || freshness === "questionable" ? freshness : "throw-out";


        urgent.push({
          name,
          category: (it?.category ?? "other").toString(),
          freshness: normalizedFreshness,
          timeLeftLabel: (it?.timeLeftLabel ?? "").toString(),
          notes: (it?.notes ?? "").toString(),
          unsafe: !!safetyHit,
          scanId: scan.id,
          scanCreatedAt: scan.created_at,
          imageUrl: signedUrl,
        });
      }
    }

    urgent.sort((a, b) => {
      const fa = URGENT_ORDER[a.freshness] ?? 9;
      const fb = URGENT_ORDER[b.freshness] ?? 9;
      if (fa !== fb) return fa - fb;
      const la = a.category.toLowerCase() === "leftover" ? 0 : 1;
      const lb = b.category.toLowerCase() === "leftover" ? 0 : 1;
      return la - lb;
    });

    return {
      items: urgent.slice(0, 24),
      scanCount: data?.length ?? 0,
      latestScanAt: data?.[0]?.created_at ?? null,
    };
  });

// ---------- Smart Food Rescue Center ----------
// Aggregates everything the user has scanned + saved into one command-center payload:
// Use Today / Use This Week / Forgotten Treasures / Recently Scanned, money-at-risk,
// top priority ingredients for one-tap meals, rescue score, and a weekly family
// challenge (this week vs. last week).

export type RescueItem = {
  name: string;
  category: string;
  freshness: "fresh" | "use-soon" | "questionable" | "throw-out";
  timeLeftLabel: string;
  notes: string;
  unsafe: boolean;
  forgotten: boolean;
  scanId: string;
};

export type RescueDashboard = {
  useToday: RescueItem[];
  useThisWeek: RescueItem[];
  forgottenTreasures: RescueItem[];
  recentlyScanned: RescueItem[];
  moneyAtRiskCents: number;
  topPriorityIngredients: string[];
  rescueScore: {
    totalSavedCents: number;
    totalPoundsRescued: number;
    mealsCooked: number;
    score: number;
  };
  weekChallenge: {
    thisWeekCents: number;
    lastWeekCents: number;
    thisWeekMeals: number;
    lastWeekMeals: number;
    thisWeekPounds: number;
    lastWeekPounds: number;
    beatingLastWeek: boolean;
  };
  scanCount: number;
  latestScanAt: string | null;
};

// Rough per-item dollar value used to estimate "money at risk".
const RISK_VALUE_CENTS: Record<string, number> = {
  meat: 600,
  seafood: 700,
  leftover: 400,
  dairy: 350,
  produce: 250,
  baked: 250,
  frozen: 400,
  pantry: 200,
  spice: 150,
  herb: 200,
  canned: 200,
  grain: 200,
  baking: 150,
  beverage: 300,
  condiment: 200,
  other: 250,
};

function isForgotten(notes: string) {
  return /easy to forget|forgotten|push(ed)? to the back|hidden/i.test(notes || "");
}

export const getRescueDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RescueDashboard> => {
    const { supabase, userId } = context;

    const [scansRes, savingsRes] = await Promise.all([
      supabase
        .from("fridge_scans")
        .select("id, items, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("savings_events")
        .select("estimated_savings_cents, pounds_rescued, cooked_at")
        .eq("user_id", userId)
        .order("cooked_at", { ascending: false })
        .limit(500),
    ]);

    if (scansRes.error) throw new Error(scansRes.error.message);
    if (savingsRes.error) throw new Error(savingsRes.error.message);

    const scans = scansRes.data ?? [];
    const savings = savingsRes.data ?? [];

    const seen = new Set<string>();
    const useToday: RescueItem[] = [];
    const useThisWeek: RescueItem[] = [];
    const forgottenTreasures: RescueItem[] = [];
    const recentlyScanned: RescueItem[] = [];
    let moneyAtRiskCents = 0;

    for (const scan of scans) {
      const items = Array.isArray(scan.items) ? (scan.items as any[]) : [];
      for (const it of items) {
        const name: string = (it?.name ?? "").toString().trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const freshness = (it?.freshness ?? "fresh") as RescueItem["freshness"];
        const category = (it?.category ?? "other").toString().toLowerCase();
        const notes = (it?.notes ?? "").toString();
        const unsafe = !!it?.unsafe;
        const forgotten = isForgotten(notes);

        const rescueItem: RescueItem = {
          name,
          category,
          freshness,
          timeLeftLabel: (it?.timeLeftLabel ?? "").toString(),
          notes,
          unsafe,
          forgotten,
          scanId: scan.id,
        };

        if (recentlyScanned.length < 12) recentlyScanned.push(rescueItem);

        if (freshness === "questionable" || freshness === "throw-out" || unsafe) {
          if (useToday.length < 8 && !unsafe) useToday.push(rescueItem);
          moneyAtRiskCents += RISK_VALUE_CENTS[category] ?? 250;
        } else if (freshness === "use-soon") {
          if (useThisWeek.length < 8) useThisWeek.push(rescueItem);
          moneyAtRiskCents += Math.round((RISK_VALUE_CENTS[category] ?? 250) * 0.6);
        }

        if (forgotten && forgottenTreasures.length < 8) {
          forgottenTreasures.push(rescueItem);
        }
      }
    }

    // Top-priority ingredients for one-tap meals: use-today first, then use-this-week,
    // then forgotten treasures, then most recent.
    const priority: string[] = [];
    const pushUnique = (n: string) => {
      const k = n.toLowerCase();
      if (priority.some((p) => p.toLowerCase() === k)) return;
      priority.push(n);
    };
    [...useToday, ...useThisWeek, ...forgottenTreasures, ...recentlyScanned].forEach((i) =>
      pushUnique(i.name),
    );
    const topPriorityIngredients = priority.slice(0, 12);

    // Savings rollups.
    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const thisWeekStart = now - WEEK;
    const lastWeekStart = now - 2 * WEEK;
    let totalSavedCents = 0;
    let totalPoundsRescued = 0;
    let thisWeekCents = 0;
    let lastWeekCents = 0;
    let thisWeekMeals = 0;
    let lastWeekMeals = 0;
    let thisWeekPounds = 0;
    let lastWeekPounds = 0;

    for (const s of savings) {
      const t = new Date(s.cooked_at).getTime();
      totalSavedCents += s.estimated_savings_cents;
      totalPoundsRescued += Number(s.pounds_rescued ?? 0);
      if (t >= thisWeekStart) {
        thisWeekCents += s.estimated_savings_cents;
        thisWeekMeals += 1;
        thisWeekPounds += Number(s.pounds_rescued ?? 0);
      } else if (t >= lastWeekStart) {
        lastWeekCents += s.estimated_savings_cents;
        lastWeekMeals += 1;
        lastWeekPounds += Number(s.pounds_rescued ?? 0);
      }
    }

    const mealsCooked = savings.length;
    // Rescue score: simple weighted blend, capped large to feel rewarding.
    const score = Math.round(
      totalSavedCents / 100 + totalPoundsRescued * 10 + mealsCooked * 5,
    );

    return {
      useToday,
      useThisWeek,
      forgottenTreasures,
      recentlyScanned,
      moneyAtRiskCents,
      topPriorityIngredients,
      rescueScore: {
        totalSavedCents,
        totalPoundsRescued: Math.round(totalPoundsRescued * 10) / 10,
        mealsCooked,
        score,
      },
      weekChallenge: {
        thisWeekCents,
        lastWeekCents,
        thisWeekMeals,
        lastWeekMeals,
        thisWeekPounds: Math.round(thisWeekPounds * 10) / 10,
        lastWeekPounds: Math.round(lastWeekPounds * 10) / 10,
        beatingLastWeek: thisWeekCents >= lastWeekCents && thisWeekCents > 0,
      },
      scanCount: scans.length,
      latestScanAt: scans[0]?.created_at ?? null,
    };
  });

// ---------- Best-by reminders ----------
// What to use next, sorted by soonest best-by date computed from the item's
// scan date + its AI-estimated shelf life (timeLeftMaxDays).

export type BestByReminder = {
  name: string;
  category: string;
  freshness: "fresh" | "use-soon" | "questionable" | "throw-out";
  timeLeftLabel: string;
  notes: string;
  scanId: string;
  scanCreatedAt: string;
  bestByISO: string;
  daysUntilBestBy: number;
  urgency: "overdue" | "today" | "soon" | "later";
};

export const getBestByReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: BestByReminder[]; scanCount: number; latestScanAt: string | null }> => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("fridge_scans")
      .select("id, items, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw new Error(`Fetch failed: ${error.message}`);

    const seen = new Set<string>();
    const out: BestByReminder[] = [];
    const now = Date.now();
    const DAY = 86400000;

    for (const scan of data ?? []) {
      const items = Array.isArray(scan.items) ? (scan.items as any[]) : [];
      const scanTime = new Date(scan.created_at).getTime();
      for (const it of items) {
        const name: string = (it?.name ?? "").toString().trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const freshness = (it?.freshness ?? "fresh") as BestByReminder["freshness"];
        if (freshness === "throw-out" || it?.unsafe) continue;

        const maxDays = Number(it?.timeLeftMaxDays);
        const minDays = Number(it?.timeLeftMinDays);
        const shelf = Number.isFinite(maxDays) && maxDays > 0
          ? maxDays
          : Number.isFinite(minDays) && minDays > 0 ? minDays : 3;

        const bestByMs = scanTime + shelf * DAY;
        const daysUntil = Math.round((bestByMs - now) / DAY);

        const urgency: BestByReminder["urgency"] =
          daysUntil < 0 ? "overdue" : daysUntil === 0 ? "today" : daysUntil <= 2 ? "soon" : "later";

        out.push({
          name,
          category: (it?.category ?? "other").toString(),
          freshness,
          timeLeftLabel: (it?.timeLeftLabel ?? "").toString(),
          notes: (it?.notes ?? "").toString(),
          scanId: scan.id,
          scanCreatedAt: scan.created_at,
          bestByISO: new Date(bestByMs).toISOString(),
          daysUntilBestBy: daysUntil,
          urgency,
        });
      }
    }

    out.sort((a, b) => a.daysUntilBestBy - b.daysUntilBestBy);

    return {
      items: out.slice(0, 30),
      scanCount: data?.length ?? 0,
      latestScanAt: data?.[0]?.created_at ?? null,
    };
  });
