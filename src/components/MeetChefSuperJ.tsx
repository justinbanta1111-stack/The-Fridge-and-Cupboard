import { useEffect, useState } from "react";
import { User, ChevronDown, ChevronUp } from "lucide-react";

/**
 * "Meet Chef Super J" story card.
 * Replaces the voice panel section with a warm, premium bio card.
 */
export function MeetChefSuperJ() {
  const [expanded, setExpanded] = useState(false);
  const [desktopFullBio, setDesktopFullBio] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setDesktopFullBio(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return (
    <section className="mt-10 animate-fade-in">
      <div
        className="relative block w-full overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.32 0.14 255) 0%, oklch(0.28 0.16 270) 45%, oklch(0.42 0.18 35) 100%)",
          boxShadow:
            "0 25px 70px -20px oklch(0.4 0.2 260 / 0.55), inset 0 1px 0 0 rgba(255,255,255,0.18)",
        }}
      >
        {/* Soft glow blobs */}
        <div
          className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.2 240 / 0.9), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.2 40 / 0.85), transparent 70%)" }}
        />
        {/* Animated shimmer */}
        <div className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay shimmer-overlay" />

        <div className="relative">
          {/* Avatar + Label */}
          <div className="flex items-center gap-4">
            <div
              className="relative grid h-14 w-14 place-items-center rounded-full text-white ring-2 ring-white/50 sm:h-16 sm:w-16"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.2 250), oklch(0.55 0.22 30))",
                boxShadow: "0 8px 30px -5px oklch(0.5 0.25 260 / 0.7)",
              }}
            >
              <User className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/90">
                Meet The Chef
              </div>
              <h2
                className="mt-0.5 font-display text-2xl font-bold leading-tight text-white sm:text-3xl"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
              >
                Chef Super J
              </h2>
            </div>
          </div>

          {/* Bio text */}
          <div className="mt-5 text-sm leading-relaxed text-white/90 sm:text-base">
            <p>
              Before becoming Chef Super J, Justin’s life took an unexpected turn. As a brain tumor survivor facing ongoing health challenges, he learned firsthand how precious time, health, and simple moments around the table truly are.
            </p>

            {(expanded || desktopFullBio) && (
              <>
                <p className="mt-3">
                  That experience deepened something he already knew from a lifetime in the kitchen: food is more than just eating — it heals, connects, comforts, and creates memories.
                </p>
                <p className="mt-3">
                  With over 30 years of professional cooking experience, from classical French training to leading kitchens across the country, Chef Super J built The Fridge and Cupboard to help families save money, waste less, and turn what they already have into something incredible.
                </p>
              </>
            )}

            <p className="mt-3 text-base font-semibold text-white/70">
              Real chef. Real food. Real life.
            </p>
          </div>

          {/* Read More toggle — mobile only */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-200/90 sm:hidden"
          >
            {expanded ? (
              <>
                Read Less <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Read More <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes chef-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-overlay {
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
          animation: chef-shimmer 4.5s linear infinite;
        }
      `}</style>
    </section>
  );
}
