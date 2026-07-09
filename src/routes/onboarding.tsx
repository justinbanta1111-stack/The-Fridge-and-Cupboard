import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Camera,
  Archive,
  Recycle,
  PiggyBank,
  AlarmClock,
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  Mic,
  Package,
  Soup,
  ClipboardList,
  Heart,
  Wand2,
  Volume2,
  DollarSign,
} from "lucide-react";
import fridgeAsset from "@/assets/fridge-interior.jpg.asset.json";
import { InstallAppButton } from "@/components/InstallAppButton";
import { HeroSubscribeCTAs } from "@/components/HeroSubscribeCTAs";
import { CHEF_SUPER_J_IMG } from "@/components/ChefAvatar";
import { getSavingsTotals, formatMoney } from "@/lib/savings-hub";
const fridgeInterior = fridgeAsset.url;


export const ONBOARDING_KEY = "tfc.onboarding.completed.v1";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — The Fridge & Cupboard" },
      { name: "description", content: "Quick tour of The Fridge & Cupboard. Use what you already have. Save money. Waste less. Eat better." },
    ],
  }),
  component: OnboardingPage,
});

type Slide = {
  icon: typeof Sparkles;
  eyebrow?: string;
  title: string;
  body: string;
  accent: string;
  extra?: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    eyebrow: "What's hiding in your fridge?",
    title: "Snap your fridge. We'll tell you what you can make.",
    body: "Take a picture of your fridge, cupboard, or leftovers — get real meal ideas in seconds.",
    accent: "bg-white/25 ring-2 ring-white/40",
    extra: (
      <div className="mt-5 space-y-3">
        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-black text-white">
          <MiniStep n={1} label="Scan fridge" />
          <MiniStep n={2} label="Scan cupboard" />
          <MiniStep n={3} label="Get meals" />
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 mt-1">
          {[
            "Save money",
            "Waste less food",
            "Use what you have",
          ].map((b) => (
            <span
              key={b}
              className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/30 backdrop-blur shadow-sm"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    ),
  },

  {
    icon: Camera,
    eyebrow: "Step 1",
    title: "Scan your fridge",
    body: "One photo. We spot the produce, dairy, meat, drinks, and leftovers — automatically.",
    accent: "bg-white/25 ring-2 ring-white/40",
  },
  {
    icon: Archive,
    eyebrow: "Step 2",
    title: "Scan your cupboard",
    body: "Spices, sauces, cans, oils, herbs — we surface the pantry gold you already paid for.",
    accent: "bg-white/25 ring-2 ring-white/40",
  },
  {
    icon: Sparkles,
    eyebrow: "Step 3",
    title: "Get meal ideas instantly",
    body: "Real recipes from what you already have. Let's save dinner.",
    accent: "bg-white/25 ring-2 ring-white/40",
  },
  {
    icon: Recycle,
    eyebrow: "Bonus",
    title: "Use it before you lose it",
    body: "Turn leftovers into brand-new meals instead of tossing food (and money) in the trash.",
    accent: "bg-white/25 ring-2 ring-white/40",
  },
  {
    icon: PiggyBank,
    eyebrow: "Track the wins",
    title: "Watch the savings stack up",
    body: "See money saved, food rescued, and meals created — every single week.",
    accent: "bg-white/25 ring-2 ring-white/40",
    extra: (
      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-md ring-1 ring-white/25">
          <div className="text-2xl font-bold">$87</div>
          <div className="text-xs opacity-90">saved</div>
        </div>
        <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-md ring-1 ring-white/25">
          <div className="text-2xl font-bold">12 lb</div>
          <div className="text-xs opacity-90">rescued</div>
        </div>
        <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-md ring-1 ring-white/25">
          <div className="text-2xl font-bold">9</div>
          <div className="text-xs opacity-90">meals</div>
        </div>
      </div>
    ),
  },
  {
    icon: AlarmClock,
    eyebrow: "Smart alerts",
    title: "What's going bad first?",
    body: "We flag the ingredients on the edge so nothing — and no money — goes in the bin.",
    accent: "bg-white/25 ring-2 ring-white/40",
  },
  {
    icon: Sparkles,
    eyebrow: "You're ready",
    title: "Let's cook smarter",
    body: "Use what you already have. Save money. Waste less. Eat better.",
    accent: "bg-white/25 ring-2 ring-white/40",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const isLast = i === SLIDES.length - 1;

  const complete = (to: "/" | "/scan" | "/cupboard" | "/rescue" | "/before-you-shop" = "/") => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {}
    navigate({ to });
  };

  const next = () => {
    if (isLast) complete();
    else setI((v) => Math.min(v + 1, SLIDES.length - 1));
  };
  const back = () => setI((v) => Math.max(v - 1, 0));

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      <OnboardingStyles />
      {/* Fridge interior background — feels like stepping inside the fridge */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${fridgeInterior})` }}
        aria-hidden
      />
      {/* Closed fridge doors overlay (slide 0 only) — opens slowly to reveal interior */}
      {i === 0 && <FridgeDoors />}
      {/* Subtle top scrim — lighter on slide 0 so the fridge stays the hero */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 ${i === 0 ? "h-20 from-black/15" : "h-40 from-black/30"} bg-gradient-to-b to-transparent`}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-4 pb-5 pt-5 sm:px-6 sm:pb-8 sm:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {SLIDES.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
          {!isLast && (
            <button
              onClick={() => complete()}
              className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
            >
              Continue to App →
            </button>
          )}
        </div>

        {i === 0 ? (
          <Slide0 onPick={complete} />
        ) : (
        <div className={`relative text-center mt-6 p-5`}>
          {/* Subtle gradient behind text only — fades out quickly so the fridge stays the hero */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/15 to-transparent"
            aria-hidden
          />
          {/* AI scan pulse overlay on fridge — subtle, integrated */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
            <div className="absolute inset-[10%] rounded-lg"
              style={{
                border: "1.5px solid rgba(255,255,255,0.15)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(255,255,255,0.06)",
              }}
            />
            <div
              className="absolute inset-x-[10%] top-[10%] bottom-[10%] overflow-hidden"
            >
              <div
                className="absolute inset-x-0 h-[4%] rounded-sm"
                style={{
                  background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                  boxShadow: "0 0 24px rgba(255,255,255,0.25)",
                  animation: "ob-scan 2.4s ease-in-out 0.4s infinite",
                }}
              />
            </div>
            {(["tl","tr","bl","br"] as const).map((c) => (
              <CornerBracket key={c} corner={c} />
            ))}
          </div>
          {slide.eyebrow && (
            <div
              className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/80"
              style={{
                textShadow: "0 2px 10px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.65)",
              }}
            >
              {slide.eyebrow}
            </div>
          )}
          <h1
            className={`text-[2.1rem] font-black leading-tight text-white`}
            style={{
              fontFamily: "Fraunces, serif",
              textShadow: "0 2px 10px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.65)",
            }}
          >
            {slide.title}
          </h1>
          <p
            className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
          >
            {slide.body}
          </p>
          {slide.extra}
        </div>
        )}


        <div className="flex-1" />

        <div className={`${i === 0 ? "mt-3" : "mt-6"} flex items-center justify-between gap-3`}>
          <button
            onClick={back}
            disabled={i === 0}
            className={`${i === 0 ? "h-10 w-10" : "h-12 w-12"} flex items-center justify-center rounded-full bg-white/20 backdrop-blur transition disabled:opacity-0`}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={next}
            className={`flex ${i === 0 ? "h-12" : "h-16"} flex-1 items-center justify-center gap-2 rounded-full bg-white text-lg font-bold text-gray-900 shadow-2xl shadow-black/40 ring-2 ring-white/50 transition active:scale-95 ${
              isLast ? "text-xl" : ""
            }`}
          >
            {isLast ? "Let's Get Started" : "Next"}
            {!isLast && <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        {isLast && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <InstallAppButton label="Add to Phone" className="w-full justify-center py-3 text-sm" showDiagnostics />
            <p className="text-[11px] text-white/70" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
              Add to your home screen for one-tap scanning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CornerBracket({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const pos: Record<string, string> = {
    tl: "top-[11%] left-[11%] border-l border-t rounded-tl",
    tr: "top-[11%] right-[11%] border-r border-t rounded-tr",
    bl: "bottom-[11%] left-[11%] border-l border-b rounded-bl",
    br: "bottom-[11%] right-[11%] border-r border-b rounded-br",
  };
  return (
    <div
      className={`absolute ${pos[corner]} w-8 h-8 pointer-events-none`}
      style={{ borderColor: "rgba(255,255,255,0.35)", boxShadow: "0 0 10px rgba(255,255,255,0.15)" }}
    />
  );
}

function MiniStep({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-white/15 px-1.5 py-2 ring-1 ring-white/25 backdrop-blur">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-300 text-[11px] font-black text-stone-900">{n}</span>
      <span className="mt-1 leading-tight">{label}</span>
    </div>
  );
}

function StartButton({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full min-h-[56px] items-center justify-center gap-2.5 rounded-2xl px-3 py-2.5 text-[13px] font-black leading-tight shadow-xl shadow-black/30 ring-2 transition active:scale-95 hover:shadow-2xl hover:shadow-black/40",
        primary
          ? "bg-gradient-to-br from-rose-500 to-orange-500 text-white ring-white/50"
          : "bg-white text-gray-950 ring-white/70",
      )}
    >
      <span className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full shadow-sm",
        primary ? "bg-white/25 text-white" : "bg-amber-300 text-gray-950",
      )}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function OnboardingStyles() {
  return (
    <style>{`
      @keyframes ob-scan {
        0%   { transform: translateY(-10%); opacity: 0; }
        15%  { opacity: 1; }
        85%  { opacity: 1; }
        100% { transform: translateY(260%); opacity: 0; }
      }
      @keyframes ob-shimmer {
        0%   { transform: translateX(-120%); }
        100% { transform: translateX(220%); }
      }
      @keyframes ob-door-left {
        0%, 30%   { transform: translateX(0) rotateY(0deg); }
        100%      { transform: translateX(-102%) rotateY(-18deg); }
      }
      @keyframes ob-door-right {
        0%, 30%   { transform: translateX(0) rotateY(0deg); }
        100%      { transform: translateX(102%) rotateY(18deg); }
      }
      @keyframes ob-emblem-fade {
        0%, 55%   { opacity: 1; }
        85%, 100% { opacity: 0; }
      }
      @keyframes ob-tag-in {
        0%   { opacity: 0; transform: translateY(6px) scale(0.92); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes ob-tag-bob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-4px); }
      }
      @keyframes ob-blue-breathe {
        0%, 100% { background-position: 0% 50%; filter: brightness(1.04) saturate(1.1); }
        50%      { background-position: 100% 50%; filter: brightness(1.12) saturate(1.18); }
      }
      @keyframes ob-gold-shimmer {
        0%, 100% { background-position: 0% 50%; filter: brightness(1.05); }
        50%      { background-position: 100% 50%; filter: brightness(1.25); }
      }
      @keyframes ob-emblem-glow {
        0%, 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
        50%      { opacity: 1;   transform: translate(-50%,-50%) scale(1.14); }
      }
      @keyframes ob-text-sweep {
        0%   { transform: translateX(-130%); }
        100% { transform: translateX(230%); }
      }

    `}</style>
  );
}

function FridgeDoors() {
  // Total animation: hold closed ~2.4s, open over ~3.6s, stay open
  const common = "absolute top-0 bottom-0 w-1/2 will-change-transform";
  const doorBg =
    "linear-gradient(180deg, rgba(232,236,242,0.96) 0%, rgba(208,214,222,0.96) 45%, rgba(190,196,206,0.96) 100%)";
  const doorShadow =
    "inset 0 0 60px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.55), 0 8px 30px rgba(0,0,0,0.35)";
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden style={{ perspective: "1400px" }}>
      {/* Left door */}
      <div
        className={`${common} left-0`}
        style={{
          background: doorBg,
          boxShadow: doorShadow,
          borderRight: "1px solid rgba(0,0,0,0.25)",
          transformOrigin: "left center",
          animation: "ob-door-left 6s cubic-bezier(0.22, 1, 0.36, 1) 2.4s forwards",
        }}
      />
      {/* Right door */}
      <div
        className={`${common} right-0`}
        style={{
          background: doorBg,
          boxShadow: doorShadow,
          borderLeft: "1px solid rgba(0,0,0,0.25)",
          transformOrigin: "right center",
          animation: "ob-door-right 6s cubic-bezier(0.22, 1, 0.36, 1) 2.4s forwards",
        }}
      />
      {/* Emblem crest — upper-middle of doors, fades as they open */}
      <div
        className="absolute left-1/2 top-[42%] -translate-x-1/2"
        style={{ animation: "ob-emblem-fade 6s ease-out 2.4s forwards" }}
      >
        <div
          className="rounded-full p-[4px]"
          style={{
            background:
              "conic-gradient(from 140deg, #FFD24A, #FFC72C, #E0A800, #FFD24A)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.55)",
          }}
        >
          <img
            src={CHEF_SUPER_J_IMG}
            alt=""
            width={120}
            height={120}
            className="block h-24 w-24 rounded-full object-cover object-top ring-2 ring-[#0047AB]/70"
            draggable={false}
          />
        </div>
        <div
          className="mt-2 text-center font-display text-[10px] font-extrabold tracking-[0.32em] text-[#0047AB]"
          style={{ textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}
        >
          CHEF&nbsp;SUPER&nbsp;J
        </div>
      </div>
    </div>
  );
}



/* ───────────────────────── Slide 0 — reference layout ───────────────────────── */

type Dest = "/" | "/scan" | "/cupboard" | "/rescue" | "/before-you-shop";

const TILES: { to: Dest | string; title: string; sub: string; Icon: typeof Camera; grad: string; ring: string }[] = [
  { to: "/scan",             title: "Scan My Fridge",          sub: "Start here",            Icon: Camera,        grad: "from-rose-500 to-red-600",     ring: "ring-rose-300/40"   },
  { to: "/cupboard",         title: "Scan My Cupboard",        sub: "Pantry too",            Icon: Package,       grad: "from-amber-400 to-orange-500", ring: "ring-amber-300/40"  },
  { to: "/rescue",           title: "Use My Leftovers",        sub: "Save dinner",           Icon: Soup,          grad: "from-emerald-500 to-green-600", ring: "ring-emerald-300/40" },
  { to: "/type-ingredients", title: "I'll Type My Ingredients",sub: "No camera",             Icon: ClipboardList, grad: "from-sky-500 to-blue-600",     ring: "ring-sky-300/40"    },
  { to: "/health-companion", title: "Make It Easy For Mom",    sub: "Cancer / brain support", Icon: Heart,        grad: "from-violet-500 to-purple-600", ring: "ring-violet-300/40" },
  { to: "/kitchen-magic",    title: "Surprise Me",             sub: "Chef picks",            Icon: Wand2,         grad: "from-orange-500 to-red-600",   ring: "ring-orange-300/40" },
];

function Slide0({ onPick }: { onPick: (to?: Dest) => void }) {
  const [cents, setCents] = useState(0);
  useEffect(() => {
    try { setCents(getSavingsTotals().moneySavedCents); } catch {}
  }, []);
  const savingsLabel = cents > 0 ? formatMoney(cents) : "$127";

  return (
    <div className="mt-2 space-y-3">
      {/* Brand header banner — Chef Super J + title */}
      <div
        className="relative overflow-hidden rounded-2xl px-3 py-3 shadow-2xl"
        style={{
          background:
            "linear-gradient(100deg, #0047AB 0%, #1a63d6 22%, #2a7be8 42%, #1a63d6 60%, #C02020 82%, #B21E1E 100%)",
          backgroundSize: "260% 200%",
          boxShadow: "0 12px 44px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1.5px #FFC72C",
          animation: "ob-blue-breathe 14s ease-in-out infinite",
        }}

      >
        {/* Gold borders with slow shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, #E0A800 0%, #FFD24A 25%, #FFFFFF 50%, #FFD24A 75%, #E0A800 100%)",
            backgroundSize: "200% 100%",
            animation: "ob-gold-shimmer 6s ease-in-out infinite",
          }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, #E0A800 0%, #FFD24A 25%, #FFFFFF 50%, #FFD24A 75%, #E0A800 100%)",
            backgroundSize: "200% 100%",
            animation: "ob-gold-shimmer 6s ease-in-out 0.8s infinite",
          }} />
        {/* Slow shimmer sweep */}
        <div
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 50%, transparent)",
            animation: "ob-shimmer 5.5s ease-in-out 1.2s infinite",
          }}
          aria-hidden
        />
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 rounded-full p-[3px]"
            style={{ background: "conic-gradient(from 140deg, #FFD24A, #FFC72C, #E0A800, #FFD24A)", boxShadow: "0 6px 16px rgba(0,0,0,0.55)" }}>
            {/* Subtle glow pulse behind emblem */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 rounded-full -z-10"
              style={{
                background: "radial-gradient(closest-side, rgba(255,210,74,0.7), rgba(255,199,44,0.25) 55%, transparent 75%)",
                filter: "blur(8px)",
                animation: "ob-emblem-glow 4.5s ease-in-out infinite",
              }}
            />
            <img src={CHEF_SUPER_J_IMG} alt="Chef Super J" width={96} height={96}
              className="block h-14 w-14 rounded-full object-cover object-top ring-2 ring-[#0047AB]/70" draggable={false} />
          </div>
          <div className="relative min-w-0 flex-1 text-left overflow-hidden">
            {/* slow light sweep across the words */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.22) 50%, transparent)",
                animation: "ob-text-sweep 7s ease-in-out 2s infinite",
                mixBlendMode: "screen",
              }}
            />

            <div className="font-display text-[0.62rem] font-extrabold tracking-[0.32em] text-[#FFD24A]"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>CHEF&nbsp;SUPER&nbsp;J</div>
            <h1 className="mt-0.5 font-display text-[1.1rem] font-black tracking-tight leading-[1.02] text-white uppercase"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
              The Fridge <span className="text-[#FFC72C]">&amp;</span> Cupboard
            </h1>
            <p className="mt-1 text-[10px] font-bold leading-snug text-white/95 tracking-wide"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.75)" }}>
              Saving <span className="text-[#A7F3A7]">Food</span>. Saving{" "}
              <span className="text-[#FFC72C]">Money</span>. Saving{" "}
              <span className="text-[#FFB4B4]">Families</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Sign up / Subscription CTAs — placed directly under the banner */}
      <div className="rounded-xl border border-white/15 bg-gradient-to-br from-[#0b1530]/85 via-[#0e1a3a]/85 to-[#1a0e2e]/85 p-2.5 sm:p-3 shadow-2xl ring-1 ring-[#FFC72C]/40 backdrop-blur">
        <HeroSubscribeCTAs />
        <div className="mt-2 flex justify-center">
          <InstallAppButton label="Add App to Home Screen" className="w-full py-2.5 text-sm font-extrabold" />
        </div>
      </div>

      {/* Voice button + savings pill row */}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("tfc:open-chef-voice"))}
          className="flex flex-1 items-center gap-2 rounded-full px-3 py-2.5 text-left text-sm font-extrabold text-white shadow-xl ring-2 ring-white/40 transition active:scale-95"
          style={{ background: "linear-gradient(90deg,#F97316,#EF4444)", boxShadow: "0 8px 28px rgba(239,68,68,0.55)" }}
          aria-label="Talk to Chef Super J"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/25 ring-1 ring-white/40">
            <Volume2 className="h-4 w-4" />
          </span>
          <span className="truncate">Talk to Chef Super J</span>
        </button>
        <div className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-2 text-sm font-bold text-white ring-1 ring-white/15 backdrop-blur shadow-lg">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400/90 text-emerald-950 ring-1 ring-white/40">
            <DollarSign className="h-3.5 w-3.5" />
          </span>
          <span className="text-emerald-300 tabular-nums">{savingsLabel}</span>
          <span className="text-[11px] font-medium text-white/80">saved {cents > 0 ? "" : "this month"}</span>
        </div>
      </div>

      {/* 1-2-3 step pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {[
          { n: 1, label: "Scan fridge" },
          { n: 2, label: "Scan cupboard" },
          { n: 3, label: "Get meals" },
        ].map((s) => (
          <div key={s.n}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20 backdrop-blur">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-amber-950">{s.n}</span>
            {s.label}
          </div>
        ))}
      </div>

      {/* 6 colored action tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TILES.map((t) => (
          <button
            key={t.title}
            type="button"
            onClick={() => onPick(t.to as Dest)}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.grad} p-3 text-left text-white shadow-lg ring-1 ${t.ring} transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]`}
          >
            <div className="flex items-start gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                <t.Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-[13px] font-bold leading-tight drop-shadow-sm">{t.title}</div>
                <div className="text-[11px] text-white/85">{t.sub}</div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
          </button>
        ))}
      </div>
    </div>
  );
}

