import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import fridgeInteriorAsset from "@/assets/fridge-interior.jpg.asset.json";

import { BrandMark } from "@/components/BrandMark";
import { FRIDGE_INTRO_VOICE_TAP_EVENT } from "@/lib/voice-assistant";




/**
 * Cinematic fridge intro:
 * - Brushed stainless steel double-door fridge with chrome handles.
 * - Doors slowly part, revealing a brightly lit, color-packed interior.
 * - A subtle camera scan sweeps the shelves to telegraph "snap what's inside".
 * - Three primary CTAs appear: Scan Fridge / Scan Cupboard / Use Leftovers.
 * Plays every time the homepage loads.
 */

const CLOSED_HOLD_MS = 120;     // brief pause with closed doors
const DOOR_DURATION_MS = 2200;  // slower, more dramatic door opening (unchanged)
const OPEN_HOLD_MS = 7400;      // hold the open fridge ~2s longer before transitioning
const FADE_MS = 1600;           // slower, smoother cross-fade into the main page
const INTRO_DISMISSED_EVENT = "tfc:fridge-intro-dismissed";



export function FridgeIntro({ onDismissed, onClosing }: { onDismissed?: () => void; onClosing?: () => void } = {}) {
  const [show, setShow] = useState(true);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [doorMotionStarted, setDoorMotionStarted] = useState(false);
  const [closing, setClosing] = useState(false);

  // Render visible from the first paint — toggling opacity caused a brief
  // startup flicker on mobile. Hydration mismatch is not a concern here
  // because the intro is client-only.
  const [visible] = useState(true);

  useEffect(() => {
    const tStartOpening = setTimeout(() => {
      setDoorMotionStarted(true);
    }, CLOSED_HOLD_MS);
    const tOpen = setTimeout(() => {
      setDoorsOpen(true);
      // Auto-trigger the silent background voice flow when the fridge opens.
      // No button, no overlay — VoiceGreeting handles greeting → listen → reply.
      try {
        window.dispatchEvent(
          new CustomEvent(FRIDGE_INTRO_VOICE_TAP_EVENT, {
            detail: { source: "auto-doors-open", tappedAt: Date.now() },
          }),
        );
      } catch {}
    }, CLOSED_HOLD_MS + DOOR_DURATION_MS);
    const tCtas = setTimeout(dismiss, CLOSED_HOLD_MS + DOOR_DURATION_MS + OPEN_HOLD_MS);
    return () => { clearTimeout(tStartOpening); clearTimeout(tOpen); clearTimeout(tCtas); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setClosing(true);
    onClosing?.();
    setTimeout(() => {
      setShow(false);
      onDismissed?.();
      try { window.dispatchEvent(new CustomEvent(INTRO_DISMISSED_EVENT)); } catch {}
    }, FADE_MS);
  }

  if (!show) return null;


  return (
    <div
      aria-hidden={closing}
      data-fridge-intro=""
      className={`fixed inset-0 z-[100] overflow-x-hidden overflow-y-auto transition-all ease-in-out ${
        closing ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ perspective: "2000px", backgroundColor: "#fdfaf4", transitionDuration: `${FADE_MS}ms`, transform: closing ? "translateY(-12px) scale(1.01)" : undefined, opacity: visible ? undefined : 0, transition: visible ? undefined : "opacity 80ms ease", scrollbarGutter: "stable both-edges" as any }}
    >
      {/* Light kitchen backdrop — soft, no dark layer over the fridge */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f5efe4 60%, #e9e1d1 100%)",
        }}
      />

      {/* Full refrigerator body behind the opening doors */}
      <FridgeShell />

      {/* Interior (revealed behind doors) */}
      <FridgeInterior revealing={doorMotionStarted || doorsOpen} />

      {/* Voice flow runs silently in the background — no button, no overlay. */}




      <div className="absolute left-1/2 top-1 sm:top-1 -translate-x-1/2 z-[115] w-full max-w-3xl pointer-events-none">
        <div
          className="relative mx-2 mt-0 overflow-hidden rounded-xl px-2 py-1 sm:mt-1 sm:px-5 sm:py-2 shadow-2xl"
          style={{
            background:
              "linear-gradient(100deg, #001f5c 0%, #003d99 25%, #0047AB 45%, #0066cc 70%, #B21E1E 100%)",
            boxShadow:
              "0 12px 44px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1.5px #FFC72C",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, #FFD24A 30%, #FFC72C 70%, transparent)" }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, #FFC72C 30%, #FFD24A 70%, transparent)" }}
          />
          <div className="flex items-center gap-2 sm:gap-5 pr-14 sm:pr-0">
            <div
              className="relative shrink-0 rounded-full p-[2px]"
              style={{
                background: "conic-gradient(from 140deg, #FFD24A, #FFC72C, #E0A800, #FFD24A)",
                boxShadow: "0 6px 16px rgba(0,0,0,0.55)",
              }}
            >
              <BrandMark className="block h-[42px] w-[42px] rounded-full bg-white object-contain ring-2 ring-[#0047AB]/70 sm:h-[76px] sm:w-[76px]" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div
                className="font-display text-[0.68rem] sm:text-[0.88rem] font-extrabold tracking-[0.28em] text-[#FFD24A]"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
              >
                CHEF&nbsp;SUPER&nbsp;J
              </div>
              <h1
                className="mt-0 font-display text-[1.05rem] sm:text-[2.05rem] font-black tracking-tight leading-[1.05] text-white uppercase"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}
              >
                The Fridge <span className="text-[#FFC72C]">&amp;</span> Cupboard
              </h1>
              <p
                className="mt-0.5 text-[10px] sm:text-[0.95rem] font-bold leading-snug text-white/95 tracking-wide"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.75)" }}
              >
                Saving <span className="text-[#A7F3A7]">Food</span>. Saving{" "}
                <span className="text-[#FFC72C]">Money</span>. Saving{" "}
                <span className="text-[#FFB4B4]">Families</span>.
              </p>
            </div>
          </div>
        </div>


      </div>

      {/* Doors */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[88px] bottom-[24px] sm:top-[132px] sm:bottom-[24px] w-[85%] max-w-[360px] sm:max-w-[440px] flex z-[95] pointer-events-none" style={{ marginLeft: 0, marginRight: 0 }}>
        <div
          className="relative h-full w-1/2 origin-left"
          style={{
            transform: doorMotionStarted ? "perspective(2000px) rotateY(-100deg)" : "perspective(2000px) rotateY(0deg)",
            transition: `transform ${DOOR_DURATION_MS}ms cubic-bezier(0.45,0.05,0.25,1)`,
            backfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
          }}
        >
          <DoorFace side="left" />
        </div>
        <div
          className="relative h-full w-1/2 origin-right"
          style={{
            transform: doorMotionStarted ? "perspective(2000px) rotateY(100deg)" : "perspective(2000px) rotateY(0deg)",
            transition: `transform ${DOOR_DURATION_MS}ms cubic-bezier(0.45,0.05,0.25,1)`,
            backfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
          }}
        >
          <DoorFace side="right" />
        </div>
      </div>

      {/* Intro intentionally clean below the fridge — no emblem, no caption */}

      <style>{`
        @keyframes fc-glow { 0% { opacity: 0; } 100% { opacity: 1; } }
        .fc-glow { animation: fc-glow 1.2s ease-out 0.2s both; }

        @keyframes fc-scan {
          0%   { transform: translateY(-10%); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(110%); opacity: 0; }
        }
        .fc-scan { animation: fc-scan 2s ease-in-out 0.2s 1 both; }
        @keyframes fc-grid-pulse { 0%,100% { opacity: .22; } 50% { opacity: .5; } }
        .fc-grid { animation: fc-grid-pulse 2s ease-in-out 0.2s 1 both; }

        @keyframes fc-ctas-in { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .fc-ctas { animation: fc-ctas-in 1.2s cubic-bezier(0.22,1,0.36,1) 0.15s both; }

        @keyframes fc-gate-in { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        .fc-gate { animation: fc-gate-in 0.45s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes fc-item-in { from { opacity: 0; transform: translateY(8px) scale(.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .fc-item { animation: fc-item-in 0.55s ease-out both; }

        @keyframes fc-reveal-glow { 0% { opacity: 0; } 100% { opacity: 1; } }
        .fc-reveal-glow { animation: fc-reveal-glow 1.6s ease-out 0.1s both; }

        @keyframes fc-shelf-shimmer {
          0%   { opacity: 0; transform: translateX(-30%); }
          40%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(30%); }
        }
        .fc-shelf-shimmer { animation: fc-shelf-shimmer 1.6s ease-in-out both; }

        @keyframes fc-ingredient-in {
          0%   { opacity: 0; transform: translateY(10px) scale(0.7); }
          70%  { transform: translateY(-2px) scale(1.06); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fc-ingredient { animation: fc-ingredient-in 0.7s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes fc-led-pulse {
          0%, 100% { opacity: 0.55; box-shadow: 0 0 4px rgba(120,200,255,0.55); }
          50%      { opacity: 1;    box-shadow: 0 0 10px rgba(140,210,255,1); }
        }
        .fc-led-pulse { animation: fc-led-pulse 2.8s ease-in-out infinite; }

        @keyframes fc-led-glow {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.9; }
        }
        .fc-led-glow { animation: fc-led-glow 3.4s ease-in-out infinite; }

        @keyframes fc-water-shimmer {
          0%   { opacity: 0; transform: translate(-50%, -4px) scaleY(0.6); }
          40%  { opacity: 0.9; transform: translate(-50%, 0) scaleY(1); }
          70%  { opacity: 0.5; transform: translate(-50%, 2px) scaleY(1.05); }
          100% { opacity: 0; transform: translate(-50%, 6px) scaleY(0.7); }
        }
        .fc-water-shimmer { animation: fc-water-shimmer 5.5s ease-in-out infinite; }

        @keyframes fc-door-shine {
          0%   { opacity: 0; transform: translateX(-40%); }
          40%  { opacity: 0.55; }
          100% { opacity: 0; transform: translateX(40%); }
        }
        .fc-door-shine { animation: fc-door-shine 2.4s ease-out 0.3s 1 both; }
      `}</style>
    </div>
  );
}

/* ───────────────────────── Fridge interior ───────────────────────── */

function FridgeShell() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-[85] top-[82px] bottom-[18px] sm:top-[126px] sm:bottom-[18px] w-[calc(85%+18px)] max-w-[378px] sm:max-w-[458px] rounded-[34px] pointer-events-none"
      style={{
        background:
          "linear-gradient(180deg, #eef2f4 0%, #c7cdd2 18%, #f8fafb 34%, #b7bec4 56%, #e1e6e9 78%, #aeb5bb 100%)",
        border: "2px solid rgba(66,72,78,0.55)",
        boxShadow:
          "0 26px 70px rgba(70,55,35,0.28), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -18px 30px rgba(55,60,66,0.22)",
      }}
      aria-hidden
    >
      <div
        className="absolute inset-[7px] rounded-[28px]"
        style={{ border: "1px solid rgba(255,255,255,0.7)", boxShadow: "inset 0 0 0 1px rgba(40,45,50,0.18)" }}
      />
      <div
        className="absolute inset-x-[16%] bottom-[-10px] h-3 rounded-full"
        style={{ background: "rgba(70,74,78,0.45)", filter: "blur(6px)" }}
      />
    </div>
  );
}

function FridgeInterior({ revealing }: { revealing: boolean }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-[90] top-[88px] bottom-[24px] sm:top-[132px] sm:bottom-[24px] w-[85%] max-w-[360px] sm:max-w-[440px] overflow-hidden rounded-[28px] ring-1 ring-stone-300/40 shadow-2xl"
      style={{ opacity: revealing ? 1 : 0, transition: `opacity ${DOOR_DURATION_MS}ms ease-out` }}
    >
      {/* Real fridge interior photo — show the whole image */}
      <img
        src={fridgeInteriorAsset.url}
        alt="Inside a refrigerator filled with fresh produce"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        style={{
          objectPosition: "center center",
          // Boost brightness/contrast/saturation so food reads clearly on mobile and outdoors.
          filter: "brightness(1.18) contrast(1.12) saturate(1.15)",
        }}
      />
      {/* Warm interior glow overlay (brighter) */}
      <div
        className="fc-glow absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(255,245,215,0.55) 0%, rgba(255,225,170,0.25) 40%, transparent 78%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Top light bar */}
      <div
        className="fc-glow absolute inset-x-[8%] top-[4%] h-2 rounded-full pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, #ffffff 30%, #ffffff 70%, transparent)",
          boxShadow: "0 0 60px 14px rgba(255,245,215,1), 0 0 120px 28px rgba(255,225,165,0.7)",
        }}
      />
      {/* Vignette removed — keep fridge fully visible. */}


      {/* Doors-open reveal: keep fridge interior clean — no scan grid, no green
          brackets, no foggy overlays. The brighter food photo speaks for itself. */}
      {revealing && null}
    </div>
  );
}


function Bracket({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const pos: Record<string, string> = {
    tl: "top-[9%] left-[9%] border-l-2 border-t-2 rounded-tl-md",
    tr: "top-[9%] right-[9%] border-r-2 border-t-2 rounded-tr-md",
    bl: "bottom-[9%] left-[9%] border-l-2 border-b-2 rounded-bl-md",
    br: "bottom-[9%] right-[9%] border-r-2 border-b-2 rounded-br-md",
  };
  return (
    <div
      className={`absolute ${pos[corner]} w-10 h-10 pointer-events-none`}
      style={{ borderColor: "rgba(74,222,128,0.9)", boxShadow: "0 0 14px rgba(74,222,128,0.55)" }}
    />
  );
}

/* ───────────────────────── Doors (brushed stainless steel) ───────────────────────── */

function DoorFace({ side }: { side: "left" | "right" }) {
  const handleSide = side === "left" ? "right-3" : "left-3";
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          // Brushed stainless steel gradient — cool silvers with subtle warm highlight
          "linear-gradient(180deg, #d8dde2 0%, #b8bfc6 18%, #e6eaee 35%, #aab1b8 55%, #c8cfd5 75%, #9aa1a8 100%)",
        boxShadow:
          side === "left"
            ? "inset -8px 0 24px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(40,45,50,0.45), 0 20px 50px rgba(0,0,0,0.4)"
            : "inset 8px 0 24px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(40,45,50,0.45), 0 20px 50px rgba(0,0,0,0.4)",
        borderTop: "2px solid rgba(30,35,40,0.6)",
        borderBottom: "2px solid rgba(30,35,40,0.6)",
        [side === "left" ? "borderLeft" : "borderRight" as any]: "2px solid rgba(30,35,40,0.6)",
      }}
    >
      {/* Brushed metal vertical grain */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, rgba(0,0,0,0.06) 1px 2px, transparent 2px 4px)",
        }}
      />
      {/* Glossy highlight sweep */}
      <div
        className="absolute inset-0 opacity-55 pointer-events-none"
        style={{
          background:
            side === "left"
              ? "linear-gradient(115deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)"
              : "linear-gradient(245deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
        }}
      />
      {/* Gentle one-time shine as door opens */}
      <div
        className="absolute inset-0 pointer-events-none fc-door-shine"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Realistic in-door water & ice dispenser — left door */}
      {side === "left" && (
        <div
          className="absolute left-1/2 top-[38%] -translate-x-1/2 w-[66px] h-[108px] rounded-[7px] overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, #d8dde2 0%, #b8bfc6 40%, #9aa1a8 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 1px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.35)",
          }}
        >
          {/* Top control strip with small display + buttons */}
          <div
            className="absolute inset-x-1 top-1 h-[14px] rounded-[3px] flex items-center justify-between px-1"
            style={{
              background:
                "linear-gradient(180deg, #0c1014 0%, #16191e 100%)",
              boxShadow:
                "inset 0 1px 2px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Tiny LCD */}
            <div
              className="h-[8px] w-[20px] rounded-[1px] flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(180deg, #0a1f2c 0%, #06131c 100%)",
                boxShadow: "inset 0 0 3px rgba(120,200,255,0.45)",
              }}
            >
              <span
                className="fc-led-glow text-[5px] font-black tracking-[0.1em]"
                style={{
                  color: "#7cc8ff",
                  textShadow: "0 0 3px rgba(120,200,255,0.9)",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                COLD
              </span>
            </div>
            {/* Two micro buttons */}
            <div className="flex gap-[2px]">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className="block h-[4px] w-[4px] rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, #5a6068, #1a1d22)",
                    boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Recessed dispenser alcove */}
          <div
            className="absolute left-1 right-1 top-[18px] bottom-[16px] rounded-[3px] overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, #0a0c10 0%, #14181d 55%, #1c2026 100%)",
              boxShadow:
                "inset 0 3px 6px rgba(0,0,0,0.95), inset 0 -1px 2px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.6)",
            }}
          >
            {/* Chrome nozzle */}
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 w-[10px] h-[7px] rounded-b-[3px]"
              style={{
                background:
                  "linear-gradient(180deg, #f2f4f6 0%, #aab0b6 55%, #5a6066 100%)",
                boxShadow:
                  "inset 0 -1px 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.7)",
              }}
            >
              <span
                className="absolute left-1/2 bottom-[1px] -translate-x-1/2 block h-[2px] w-[3px] rounded-full"
                style={{ background: "#05080b", boxShadow: "inset 0 0 1px rgba(0,0,0,0.9)" }}
              />
            </div>
            {/* Water drip shimmer */}
            <div
              className="absolute left-1/2 top-[7px] -translate-x-1/2 w-[1.5px] h-4 rounded-full fc-water-shimmer"
              style={{
                background:
                  "linear-gradient(180deg, rgba(170,215,255,0.85), rgba(100,170,230,0))",
                filter: "blur(0.5px)",
              }}
            />
            {/* Paddle / back wall */}
            <div
              className="absolute inset-x-1.5 bottom-3 top-[26px] rounded-[2px]"
              style={{
                background:
                  "linear-gradient(180deg, #1a1e23 0%, #0d1014 100%)",
                boxShadow:
                  "inset 0 1px 2px rgba(0,0,0,0.9), inset 0 -1px 0 rgba(255,255,255,0.03)",
              }}
            />
            {/* Blue LED under-glow */}
            <div
              className="absolute inset-x-2 bottom-[10px] h-[2px] rounded-full fc-led-glow"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(120,200,255,0.85), transparent)",
                filter: "blur(1.2px)",
              }}
            />
            {/* Drip-tray grille */}
            <div className="absolute inset-x-1 bottom-0 h-[8px] flex items-end justify-center gap-[1px] px-1 pb-[2px]"
              style={{
                background:
                  "linear-gradient(180deg, #2a2e34 0%, #14171b 100%)",
                boxShadow:
                  "inset 0 1px 1px rgba(0,0,0,0.8)",
              }}
            >
              {Array.from({ length: 11 }).map((_, i) => (
                <span
                  key={i}
                  className="block w-[1px] h-[4px] rounded-full"
                  style={{ background: "rgba(0,0,0,0.7)" }}
                />
              ))}
            </div>
          </div>

          {/* Status LED */}
          <span
            className="absolute right-[5px] bottom-[4px] inline-block h-[3px] w-[3px] rounded-full fc-led-pulse"
            style={{
              background: "#7cc8ff",
              boxShadow: "0 0 4px rgba(120,200,255,0.95)",
            }}
          />
        </div>
      )}
      {/* Inset panel outline */}
      <div
        className="absolute inset-5 rounded-lg pointer-events-none"
        style={{ border: "1.5px solid rgba(30,35,40,0.45)", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)" }}
      />
      {/* Door seam shadow on inner edge */}
      <div
        className="absolute top-0 bottom-0 w-3 pointer-events-none"
        style={{
          [side === "left" ? "right" : "left" as any]: 0,
          background:
            side === "left"
              ? "linear-gradient(270deg, rgba(0,0,0,0.55), transparent)"
              : "linear-gradient(90deg, rgba(0,0,0,0.55), transparent)",
        }}
      />
      {/* Chrome handle */}
      <div
        className={`absolute top-[14%] ${handleSide} h-[68%] w-[10px] rounded-full`}
        style={{
          background:
            "linear-gradient(90deg, #6a6f74 0%, #f4f6f8 25%, #ffffff 45%, #c2c7cc 65%, #5a5f64 100%)",
          boxShadow:
            "0 0 14px rgba(255,250,235,0.5), 0 6px 14px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(30,35,40,0.4)",
        }}
      />
      {/* Handle mounts */}
      <div
        className={`absolute top-[14%] ${handleSide} w-[10px] h-3 rounded-sm`}
        style={{ background: "linear-gradient(90deg, #4a4f54, #9aa1a8, #4a4f54)", transform: "translateY(-6px)" }}
      />
      <div
        className={`absolute bottom-[18%] ${handleSide} w-[10px] h-3 rounded-sm`}
        style={{ background: "linear-gradient(90deg, #4a4f54, #9aa1a8, #4a4f54)" }}
      />
    </div>
  );
}


/* ───────────────────────── CTA ───────────────────────── */

function CTA({
  to, icon, label, hint, tone, onPick, requireAuth, signedIn, onGate,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  tone: "primary" | "amber" | "green" | "blue";
  onPick: () => void;
  requireAuth?: boolean;
  signedIn?: boolean | null;
  onGate?: () => void;
}) {
  const toneCls =
    tone === "primary"
      ? "bg-gradient-to-br from-rose-500 to-orange-500 text-white"
      : tone === "amber"
        ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-stone-900"
        : tone === "green"
          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
          : "bg-gradient-to-br from-sky-500 to-indigo-600 text-white";
  const cls = `group inline-flex min-h-[64px] items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-left text-[13px] sm:text-sm font-black shadow-xl ring-2 ring-white/40 transition-transform hover:scale-[1.02] active:scale-[0.99] ${toneCls}`;
  const inner = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/25 backdrop-blur">
        {icon}
      </span>
      <span className="leading-tight">
        <span className="block">{label}</span>
        <span className="mt-0.5 block text-[10px] font-bold opacity-80">{hint}</span>
      </span>
    </>
  );
  if (requireAuth && signedIn === false) {
    return (
      <button type="button" onClick={() => onGate?.()} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to} onClick={onPick} className={cls}>
      {inner}
    </Link>
  );
}


function StepCard({ n, icon, label }: { n: number; icon: React.ReactNode; label: string }) {
  return (
    <div className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl bg-black/50 px-1.5 py-2 ring-1 ring-white/30 backdrop-blur">
      <span className="inline-flex items-center gap-1 text-amber-200">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-[10px] text-stone-900">{n}</span>
        {icon}
      </span>
      <span className="leading-tight">{label}</span>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/30 backdrop-blur"
    >
      {icon}
      {label}
    </span>
  );
}

function StepPill({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-white font-semibold ring-1 ring-white/30 backdrop-blur">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-[10px] font-black text-stone-900">{n}</span>
      {label}
    </span>
  );
}

void FADE_MS;
