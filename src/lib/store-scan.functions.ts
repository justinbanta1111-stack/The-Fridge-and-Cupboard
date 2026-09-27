import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { DISHES } from "@/lib/seo/content";
import { matchDishes } from "@/lib/recipe-match";
import { resolveProduct, formatPackSize, PACK_FORM_LABEL } from "@/lib/grocery-products";
import { AISLE_LABEL } from "@/lib/aisles";
import { productNutrition } from "@/lib/food-nutrition";


const Input = z.object({
  imageDataUrl: z.string().min(10),
  storeLocationId: z.string().max(40).default(""),
  question: z.string().max(300).default(""),
  haveAtHome: z.array(z.string()).max(60).default([]),
  useUpSoon: z.array(z.string()).max(20).default([]),
  kitchenSummary: z.string().max(400).default(""),
  dietary: z.array(z.string()).max(30).default([]),
});

const OutputSchema = z.object({
  itemName: z.string(),
  whatItIs: z.string(),
  howToChoose: z.string(),
  whereToFind: z.string(),
  howToCook: z.string(),
  goesWellWith: z.array(z.string()).default([]),
  productsSeen: z
    .array(
      z.object({
        labelText: z.string(),
        brand: z.string().default(""),
        packSize: z.string().default(""),
        count: z.number().int().min(1).max(99).default(1),
      }),
    )
    .default([]),
  mealIdeas: z
    .array(
      z.object({
        name: z.string(),
        recipeSlug: z.string(),
        why: z.string(),
        needToBuy: z.array(z.string()).default([]),
        alreadyHave: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  storageTip: z.string(),
  answer: z.string(),
});

export type ScannedProduct = {
  summary: string;
  name: string;
  brand: string | null;
  brandTier: "value" | "mainstream" | "premium" | null;
  packSize: string;
  sizeSource: "label" | "typical" | "unknown";
  count: number;
  form: string;
  totalPounds: number | null;
  estimatedPrice: number | null;
  estimatedPerPound: number | null;
  aisle: string | null;
  /** Estimated servings in the package(s). */
  servings: number | null;
  servingLabel: string | null;
  pricePerServing: number | null;
  caloriesPerServing: number | null;
  /** Today's real shelf price at the shopper's chosen store, when available. */
  livePrice: number | null;
  /** The matched product at that store, e.g. "Kroger Whole Milk, 1 gal". */
  livePriceLabel: string | null;
  priceSource: "live" | "estimate";
};

export type StoreScanResult = z.infer<typeof OutputSchema> & {
  products: ScannedProduct[];
  /** True when at least one price came from the shopper's real store. */
  pricesAreLive: boolean;
  estimatedBasketTotal: number | null;
};

/** Replaces our own estimates with the store's real shelf prices when we can. */
async function withLivePrices(
  products: ScannedProduct[],
  storeLocationId: string,
): Promise<ScannedProduct[]> {
  if (!storeLocationId || products.length === 0) return products;
  try {
    const { livePricesFor } = await import("./kroger-prices.server");
    const terms = products.map((p) => [p.brand, p.name].filter(Boolean).join(" ").trim());
    const prices = await livePricesFor(terms, storeLocationId);
    if (prices.size === 0) return products;
    return products.map((product, i) => {
      const live = prices.get(terms[i] ?? "");
      if (!live) return product;
      const price = Number(live.price.toFixed(2));
      return {
        ...product,
        livePrice: price,
        livePriceLabel: [live.brand, live.productName, live.size].filter(Boolean).join(" · "),
        priceSource: "live" as const,
        pricePerServing: product.servings
          ? Number((price / product.servings).toFixed(2))
          : product.pricePerServing,
      };
    });
  } catch {
    return products;
  }
}


const SYSTEM = [
  "You are Chef Super J, standing next to a shopper in a grocery store.",
  "They photographed something in the store: one item, a shelf, a produce display, a meat case, packages, or their whole shopping cart.",
  "Identify what you see from the photo only. If you truly can't tell, say your best guess plainly in itemName and explain in whatItIs.",
  "itemName: if it's a single food, the specific food (include variety/cut if visible). If the photo shows several foods, a shelf, a display or a cart, name the scene briefly, e.g. 'Your cart: chicken, rice, broccoli, yogurt'.",
  "whatItIs: 1-2 warm plain sentences — what it is (or list the main items you can see) and what it tastes like.",
  "howToChoose: how to pick a good one right there in the store (ripeness, color, smell, label, cut, fat, freshness).",
  "For produce, meat, seafood or cheese, look closely at THIS photo and name any visible bruising, mold, shriveling, wilting, discoloration or over/under-ripeness you can actually see, and say plainly if it looks good to buy.",
  "If the photo is blurry, dark or too far away to judge quality, say so instead of guessing — never claim certainty the image doesn't support.",
  "Never state a price unless it is clearly legible on a shelf tag in the photo.",
  "whereToFind: name the most likely grocery-store section for the photographed ingredient or product, such as produce, meat, seafood, dairy, frozen foods, baking, canned goods, spices, international foods, or household supplies. If there are several items, briefly locate each main item. Never invent an aisle number. Clearly say that aisle numbers vary by location when the exact store layout is unavailable.",
  "howToCook: the simplest reliable way to cook or prep it, with rough heat and time.",
  "goesWellWith: 4-7 short flavor partners.",
  "mealIdeas: choose 3 meals ONLY from the REAL RECIPE CATALOG below. Copy each recipe name and recipeSlug exactly. Never invent or rename a meal. For each, needToBuy lists ONLY the extra items to grab in the store — never the photographed item itself, they already have it in hand. alreadyHave may ONLY name items from their kitchen list; leave it empty if their kitchen is unknown.",
  "productsSeen: list every distinct packaged or loose product you can actually read or clearly see, up to 12. labelText = the food as written (e.g. 'penne pasta', 'whole milk'). brand = the brand printed on the package, exactly as printed, or empty string if none is legible. packSize = the net weight/volume/count printed on the package, exactly as printed (e.g. '16 oz', '1 gal', '12 ct'), or empty string if not legible. count = how many identical packages are visible. Never invent a brand or a size you cannot read.",
  "storageTip: how to store it and roughly how long it keeps.",
  "answer: one friendly closing sentence answering their specific question if they asked one.",
  "Honor dietary restrictions absolutely. No medical claims. Warm, calm, no lecturing, no invented brands or prices.",
  "REAL RECIPE CATALOG:",
  ...DISHES.map((dish) => `${dish.slug} | ${dish.name} | ${dish.ingredients.join(", ")}`),
].join("\n");

type AiOutput = z.infer<typeof OutputSchema>;

function canonicalMealIdeas(output: AiOutput, haveAtHome: string[]) {
  const bySlug = new Map(DISHES.map((dish) => [dish.slug, dish]));
  const seen = new Set<string>();
  const ideas: AiOutput["mealIdeas"] = [];


  for (const idea of output.mealIdeas) {
    const dish = bySlug.get(idea.recipeSlug);
    if (!dish || seen.has(dish.slug)) continue;
    seen.add(dish.slug);
    ideas.push({ ...idea, name: dish.name, recipeSlug: dish.slug });
  }

  const matches = matchDishes([output.itemName, ...haveAtHome], 8);
  for (const match of matches) {
    if (ideas.length >= 3 || seen.has(match.dish.slug)) continue;
    seen.add(match.dish.slug);
    ideas.push({
      name: match.dish.name,
      recipeSlug: match.dish.slug,
      why: `A real recipe that uses ${match.have.slice(0, 2).join(" and ") || output.itemName}.`,
      needToBuy: match.missing.slice(0, 6),
      alreadyHave: match.have.slice(0, 6),
    });
  }

  return ideas.slice(0, 3);
}

/** Turns the raw label text the model read into real products. */
function resolveScannedProducts(output: AiOutput): ScannedProduct[] {
  const seen = new Set<string>();
  const rows = output.productsSeen.length
    ? output.productsSeen
    : [{ labelText: output.itemName, brand: "", packSize: "", count: 1 }];

  return rows
    .map((row): ScannedProduct | null => {
      const text = [row.brand, row.labelText, row.packSize].filter(Boolean).join(" ").trim();
      if (!text) return null;
      const product = resolveProduct(text, row.count);
      const name = product.ingredient?.name ?? row.labelText.trim();
      const key = `${product.brand?.id ?? ""}|${name.toLowerCase()}|${row.packSize}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const nutrition = productNutrition({
        ingredientId: product.ingredient?.id,
        aisle: product.aisle,
        totalOunces: product.totalOunces,
        totalFluidOunces: product.totalFluidOunces,
      });
      return {
        summary: product.summary,
        name,
        brand: product.brand?.name ?? (row.brand.trim() || null),
        brandTier: product.brand?.tier ?? null,
        packSize: formatPackSize(product.packSize, product.count) || row.packSize.trim(),
        sizeSource: product.sizeSource,
        count: product.count,
        form: PACK_FORM_LABEL[product.form],
        totalPounds:
          product.totalOunces === null ? null : Number((product.totalOunces / 16).toFixed(2)),
        estimatedPrice: product.estimatedPrice,
        estimatedPerPound: product.estimatedPerPound,
        aisle: product.aisle ? AISLE_LABEL[product.aisle] : null,
        servings: nutrition?.servings ?? null,
        servingLabel: nutrition?.servingLabel ?? null,
        pricePerServing:
          nutrition && product.estimatedPrice !== null
            ? Number((product.estimatedPrice / nutrition.servings).toFixed(2))
            : null,
        caloriesPerServing: nutrition?.caloriesPerServing ?? null,
        livePrice: null as number | null,
        livePriceLabel: null as string | null,
        priceSource: "estimate" as const,
      } satisfies ScannedProduct;
    })
    .filter((row): row is ScannedProduct => row !== null)
    .slice(0, 12);
}

export const scanStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<StoreScanResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const context = [
      data.question ? `Their question: ${data.question}` : "They didn't ask anything specific.",
      `Already at home: ${data.haveAtHome.length ? data.haveAtHome.join(", ") : "unknown"}`,
      `Needs using up soon: ${data.useUpSoon.length ? data.useUpSoon.join(", ") : "nothing flagged"}`,
      data.kitchenSummary ? `Kitchen notes: ${data.kitchenSummary}` : "",
      `Dietary preferences / restrictions: ${data.dietary.length ? data.dietary.join(", ") : "none"}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: OutputSchema }),
        timeout: { totalMs: 40_000 },
        maxRetries: 1,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `Tell me about this item.\n${context}` },
              { type: "image", image: data.imageDataUrl },
            ],
          },
        ],
      });
      const parsed = OutputSchema.parse({
        ...output,
        mealIdeas: canonicalMealIdeas(output, data.haveAtHome),
      });
      const products = await withLivePrices(
        resolveScannedProducts(parsed),
        data.storeLocationId,
      );
      const pricedTotal = products.reduce(
        (sum, p) => sum + (p.livePrice ?? p.estimatedPrice ?? 0),
        0,
      );
      return {
        ...parsed,
        products,
        pricesAreLive: products.some((p) => p.priceSource === "live"),
        estimatedBasketTotal: pricedTotal > 0 ? Number(pricedTotal.toFixed(2)) : null,
      };
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      if (/\b429\b|rate.?limit/i.test(raw))
        throw new Error("RATE_LIMITED: Too many scans right now — try again in a minute.");

      if (/\b402\b|credits?/i.test(raw))
        throw new Error("CREDITS_EXHAUSTED: Daily AI credits used up. Try again tomorrow.");
      throw new Error(`Store scan failed: ${raw}`);
    }
  });
