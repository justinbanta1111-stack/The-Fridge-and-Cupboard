import { Link } from "@tanstack/react-router";
import { Camera, Images, Package, Soup, Bot, Shuffle, HeartHandshake, ShoppingBasket, ScanLine, PiggyBank, Refrigerator, Snowflake, ShoppingCart } from "lucide-react";
import { MoreInfo } from "@/components/MoreInfo";

/** The four starting points, always visible at the very top of the home screen. */
const PRIMARY = [
  {
    to: "/scan",
    title: "Fridge",
    sub: "Take a picture right now",
    aria: "Fridge — take a picture of your fridge",
    Icon: Refrigerator,
    tone: "border-jade/70 bg-gradient-to-br from-jade/40 via-jade/22 to-teal/20",
    iconTone: "border-jade/60 bg-jade/30 text-jade",
  },
  {
    to: "/cupboard",
    title: "Cupboard",
    sub: "Show me the pantry",
    aria: "Cupboard — take a picture of your pantry",
    Icon: Package,
    tone: "border-teal/60 bg-gradient-to-br from-teal/35 via-teal/18 to-jade/16",
    iconTone: "border-teal/55 bg-teal/25 text-teal",
  },
  {
    to: "/fridge-scan",
    title: "Freezer",
    sub: "See what's frozen",
    aria: "Freezer — take a picture of your freezer",
    Icon: Snowflake,
    tone: "border-white/35 bg-gradient-to-br from-white/22 via-teal/14 to-white/10",
    iconTone: "border-white/45 bg-white/18 text-ivory",
  },
  {
    to: "/store-scan",
    title: "Grocery Store",
    sub: "Snap shelves, produce or your cart",
    aria: "Grocery Store — take or upload pictures while you shop",
    Icon: ShoppingCart,
    tone: "border-gold/70 bg-gradient-to-br from-gold/40 via-gold/22 to-jade/16",
    iconTone: "border-gold/60 bg-gold/28 text-gold",
  },
] as const;

type Props = {
  /** Opens the phone photo library so the user can pick a picture they already took. */
  onUseExistingPhoto?: (storage: "fridge" | "pantry" | "counter") => void;
};

const SECONDARY = [
  {
    to: "/fun-mode",
    title: "Surprise Me",
    sub: "Let Chef Super J pick",
    Icon: Shuffle,
    tone: "text-gold border-gold/45 bg-gold/15",
  },
  {
    to: "/seniors",
    title: "Make It Easy For Mom",
    sub: "Simple meals, big steps",
    Icon: HeartHandshake,
    tone: "text-jade border-jade/45 bg-jade/15",
  },
  {
    to: "/chef-companion",
    title: "My Personal AI Chef",
    sub: "Just talk — he answers",
    Icon: Bot,
    tone: "text-teal border-teal/45 bg-teal/15",
  },
  {
    to: "/stretch-my-groceries",
    title: "Stretch My Groceries",
    sub: "More meals, less money",
    Icon: PiggyBank,
    tone: "text-gold border-gold/45 bg-gold/15",
  },
] as const;

const PANEL =
  "relative overflow-hidden rounded-[26px] border border-white/14 bg-ink-soft/85 backdrop-blur-xl";

export function HomeFourCards({ onUseExistingPhoto }: Props = {}) {
  return (
  <section className="mt-3 sm:mt-8">
      {/* ---- PRIMARY: four equal starting points, always visible ---- */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        {PRIMARY.map((c, idx) => (
          <Link
            key={c.to}
            to={c.to}
            aria-label={c.aria}
            data-reveal
            style={{ ["--reveal-delay" as any]: `${idx * 60}ms` }}
            className={`press-lift sheen group relative flex h-full flex-col items-center justify-start gap-2 overflow-hidden rounded-[24px] border-2 ${c.tone} p-3 text-center sm:p-5`}
          >
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border sm:h-14 sm:w-14 ${c.iconTone}`}>
              <c.Icon className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[0.98rem] font-bold leading-tight tracking-tight text-ivory sm:text-xl">
                {c.title}
              </div>
              <div className="mt-0.5 text-[11px] font-medium leading-snug text-ivory/80 sm:text-[13px]">
                {c.sub}
              </div>
            </div>
          </Link>
        ))}
      </div>


      {/* ---- SECONDARY: use a photo you already took ---- */}
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:gap-4">
        <button
          type="button"
          data-reveal
          style={{ ["--reveal-delay" as any]: "70ms" }}
          onClick={() => onUseExistingPhoto?.("fridge")}
          aria-label="Use A Photo I Have — choose a picture from your phone"
          className={`press-lift surface-satin group w-full ${PANEL} border-gold/35 p-3 text-left sm:p-5`}
        >
          <div className="relative z-[2] flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-gold/45 bg-gold/18 text-gold">
              <Images className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[1.05rem] font-semibold leading-tight tracking-tight text-ivory sm:text-xl">
                Use A Photo I Have
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-ivory/75 sm:text-[15px]">
                Choose a picture from your phone
              </div>
            </div>
          </div>
        </button>

      </div>



      {/* ---- NEXT: leftovers ---- */}
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:mt-4 sm:grid-cols-2 sm:gap-4">


        <div
          data-reveal
          style={{ ["--reveal-delay" as any]: "210ms" }}
          className={`surface-satin glow-gold ${PANEL} border-gold/40 p-3 sm:p-5`}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-gold/50 bg-gold/22 text-gold">
              <Soup className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[1.05rem] font-semibold leading-tight tracking-tight text-ivory sm:text-xl">
                Use My Leftovers
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-ivory/80 sm:text-[15px]">
                Turn what you already have into dinner
              </div>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Link
              to="/rescue"
          aria-label="Use My Leftovers — take a photo of your leftovers"
              className="press-lift inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gold/55 bg-gold/22 px-2.5 py-2 text-[12px] font-semibold text-gold sm:text-[15px]"
            >
              <Camera className="h-3.5 w-3.5" /> Take a photo
            </Link>
            <button
              type="button"
              onClick={() => onUseExistingPhoto?.("counter")}
              className="press-lift inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/22 bg-white/12 px-2.5 py-2 text-[12px] font-semibold text-ivory sm:text-[15px]"
            >
              <Images className="h-3.5 w-3.5" /> Use a photo
            </button>
          </div>
        </div>
      </div>

      {/* ---- SECONDARY: tucked behind a simple See More so the first view stays clean ---- */}
      <MoreInfo label="More ways to cook" hideLabel="Show less" className="mt-2.5 sm:mt-5">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-5">
        <Link
          to="/store-mode"
          aria-label="Store Mode — help while you shop"
          data-reveal
          style={{ ["--reveal-delay" as any]: "260ms" }}
          className={`press-lift surface-satin glow-jade group ${PANEL} border-jade/45 p-3 text-left sm:p-5`}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-jade/50 bg-jade/22 text-jade">
              <ScanLine className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[1.05rem] font-semibold leading-tight tracking-tight text-ivory sm:text-xl">
                Store Mode
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-ivory/80 sm:text-[15px]">
                Use the camera while you shop
              </div>
            </div>
          </div>
        </Link>

        <Link
          to="/shopping-list"
          aria-label="Shopping List — see and share your list"
          data-reveal
          style={{ ["--reveal-delay" as any]: "300ms" }}
          className={`press-lift surface-satin glow-gold group ${PANEL} border-gold/45 p-3 text-left sm:p-5`}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-gold/50 bg-gold/22 text-gold">
              <ShoppingBasket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[1.05rem] font-semibold leading-tight tracking-tight text-ivory sm:text-xl">
                Shopping List
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-ivory/80 sm:text-[15px]">
                Sorted by aisle — share or print
              </div>
            </div>
          </div>
        </Link>
      </div>


      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SECONDARY.map((c, idx) => (
          <Link
            key={c.to}
            to={c.to}
            data-reveal
            style={{ ["--reveal-delay" as any]: `${280 + idx * 60}ms` }}
            className="press-lift surface-satin group relative flex items-center gap-2.5 overflow-hidden rounded-2xl border border-white/16 bg-ink-soft/75 p-2.5 text-left backdrop-blur-md transition hover:bg-ink-soft/90"
          >
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${c.tone}`}
            >
              <c.Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[0.95rem] font-semibold leading-tight tracking-tight text-ivory">
                {c.title}
              </div>
              <div className="text-[11px] font-medium text-ivory/75">{c.sub}</div>
            </div>
          </Link>
        ))}
      </div>
      </MoreInfo>
    </section>
  );
}

export default HomeFourCards;
