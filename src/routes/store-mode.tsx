import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ScanLine,
  ShoppingBasket,
  PackageOpen,
  ShoppingCart,
  MapPin,
  Apple,
  DollarSign,
  Wallet,

} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { StorePriceEditor } from "@/components/StorePriceEditor";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/store-mode")({
  head: () => ({
    meta: [
      { title: "Store Mode — Shop Smarter With Chef Super J" },
      {
        name: "description",
        content:
          "Use your camera anywhere in the grocery store: identify unfamiliar items, check produce quality, compare options, and see what meals you could make.",
      },
      { property: "og:title", content: "Store Mode — Shop Smarter With Chef Super J" },
      {
        property: "og:description",
        content:
          "Point your camera at a shelf, cart, or single item and get straight answers while you shop.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreModePage,
});

const TILES = [
  {
    to: "/store-scan",
    title: "Scan Something Here",
    sub: "A shelf, the cart, produce, meat, a jar you don't recognize",
    Icon: ScanLine,
  },
  {
    to: "/store-help",
    title: "Help Me Choose",
    sub: "Compare two options and pick the better one",
    Icon: ShoppingBasket,
  },
  {
    to: "/bulk-shopping",
    title: "Bulk / Costco Trip",
    sub: "Buy big only where it makes sense",
    Icon: PackageOpen,
  },
  {
    to: "/shopping-list",
    title: "My Shopping List",
    sub: "Sorted by aisle, share or print it",
    Icon: ShoppingCart,
  },
  {
    to: "/meal-costs",
    title: "Cost Per Meal",
    sub: "What each dinner costs, cheapest first",
    Icon: DollarSign,
  },
  {
    to: "/budget-plan",
    title: "Budget Plan",
    sub: "Meals that fit your weekly budget",
    Icon: Wallet,
  },

  {
    to: "/nearby-stores",
    title: "Stores Near Me",
    sub: "Map and directions",
    Icon: MapPin,
  },
  {
    to: "/before-you-shop",
    title: "Before You Shop",
    sub: "What you already have at home",
    Icon: Apple,
  },
] as const;

function StoreModePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-3 sm:pt-4">
        <header className="mb-4 text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden sm:h-28 sm:w-28">
            <BrandMark className="h-full w-full scale-[1.8] object-contain" />
          </div>
          <div className="mx-auto max-w-2xl min-w-0">
            <h1 className="mt-1 flex items-center justify-center gap-2 font-display text-2xl font-semibold sm:text-3xl">
              <ShoppingBasket className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              Store Mode
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Photograph an item, shelf, produce display, meat case, package, or cart. I'll identify
              what I see and suggest meals.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">If a price isn't clearly visible, I'll say so.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TILES.map(({ to, title, sub, Icon }) => (
            <Link key={to} to={to}>
              <Card className="flex h-full items-center gap-3 p-4 transition hover:border-primary/60">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight">{title}</p>
                  <p className="text-sm text-muted-foreground">{sub}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-6 p-4">
          <h2 className="text-lg font-bold">What I can check on produce</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bruising, mold, shriveling, discoloration, and roughly how ripe something looks — from
            what's visible in the photo. For anything I can't see clearly, I'll tell you instead of
            guessing.
          </p>
        </Card>

        <StorePriceEditor />

      </main>
    </div>
  );
}
