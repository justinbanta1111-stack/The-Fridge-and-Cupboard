import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { ChefAvatar } from "@/components/ChefAvatar";

/**
 * "Meet Chef Super J" — premium, cinematic story section.
 * Culinary greenery gently grows in at the edges as the section scrolls into view,
 * with warm light, depth, and a smooth staged text reveal.
 */

function Sprig({
  className,
  delay,
  flip = false,
}: {
  className?: string;
  delay: number;
  flip?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute ${className ?? ""}`}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden="true"
    >
    <svg
      viewBox="0 0 120 220"
      className="chef-sprig h-full w-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <path
        d="M60 220 C 58 170, 52 130, 44 96 C 38 68, 34 44, 36 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      {[
        [50, 176, -34],
        [46, 148, 30],
        [43, 120, -30],
        [39, 94, 26],
        [37, 68, -24],
        [36, 44, 22],
      ].map(([x, y, rot], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="20"
          ry="7.5"
          fill="currentColor"
          opacity="0.32"
          transform={`rotate(${rot} ${x} ${y})`}
        />
      ))}
    </svg>
    </div>
  );
}

export function MeetChefSuperJ() {
  const ref = useRef<HTMLElement | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setLive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={`mt-10 chef-story ${live ? "is-live" : ""}`}>
      <div
        className="relative isolate overflow-hidden rounded-3xl px-6 py-10 sm:px-12 sm:py-14"
        style={{
          background:
            "radial-gradient(120% 90% at 20% 0%, oklch(0.32 0.05 150) 0%, oklch(0.22 0.04 160) 45%, oklch(0.17 0.03 165) 100%)",
          boxShadow:
            "0 30px 80px -30px oklch(0.2 0.06 160 / 0.8), inset 0 1px 0 0 oklch(1 0 0 / 0.12)",
        }}
      >
        {/* Warm key light */}
        <div
          className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full blur-3xl chef-glow"
          style={{ background: "radial-gradient(circle, oklch(0.85 0.13 75 / 0.42), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full blur-3xl chef-glow chef-glow-slow"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.14 145 / 0.30), transparent 70%)" }}
        />

        {/* Greenery — grows in at the edges */}
        <div className="pointer-events-none absolute inset-0 text-emerald-200">
          <Sprig className="bottom-0 left-[-14px] h-52 w-28 sm:h-72 sm:w-36" delay={120} />
          <Sprig className="bottom-0 left-16 h-36 w-20 opacity-70 sm:h-52 sm:w-28" delay={420} />
          <Sprig className="bottom-0 right-[-16px] h-56 w-28 sm:h-80 sm:w-40" delay={260} flip />
          <Sprig className="bottom-0 right-20 h-32 w-20 opacity-60 sm:h-48 sm:w-24" delay={620} flip />
          <Sprig className="top-[-30px] right-6 h-28 w-16 rotate-180 opacity-40 sm:h-40 sm:w-24" delay={780} />
        </div>

        {/* Vignette for depth */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(110% 80% at 50% 40%, transparent 40%, oklch(0.12 0.02 160 / 0.55) 100%)" }}
        />

        <div className="relative">
          <div className="chef-reveal flex items-center gap-4" style={{ transitionDelay: "80ms" }}>
            <ChefAvatar className="h-16 w-16 sm:h-20 sm:w-20" ring={false} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200/80">
                The story behind the app
              </div>
              <h2
                className="mt-1 font-display text-3xl leading-tight tracking-tight text-white sm:text-4xl"
                style={{ textShadow: "0 2px 18px oklch(0.1 0 0 / 0.5)" }}
              >
                Meet Chef Super J
              </h2>
            </div>
          </div>

          <div className="mt-6 max-w-2xl space-y-4 text-[15px] leading-relaxed text-white/85 sm:text-lg">
            <p className="chef-reveal font-display text-xl italic text-amber-100 sm:text-2xl" style={{ transitionDelay: "220ms" }}>
              By God’s grace, I’m still here — and still cooking.
            </p>
            <p className="chef-reveal" style={{ transitionDelay: "360ms" }}>
              After major brain surgery, I was given another chance at life. Cooking is one of the
              gifts God gave me, and I’m blessed to still be here to share it.
            </p>
            <p className="chef-reveal" style={{ transitionDelay: "500ms" }}>
              I created The Fridge &amp; Cupboard because cooking doesn’t have to be difficult. You
              don’t need to be a chef or have expensive ingredients. Sometimes you just need a
              little help seeing what you can make with what you already have.
            </p>
            <p className="chef-reveal" style={{ transitionDelay: "640ms" }}>
              If this app helps someone make a good meal, waste less food, save some money, and
              feel more confident in their kitchen, then I’m sharing the blessing I was given.
            </p>
            <p
              className="chef-reveal pt-1 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200/90"
              style={{ transitionDelay: "780ms" }}
            >
              — Chef Super J
            </p>
          </div>

          <div className="chef-reveal mt-8" style={{ transitionDelay: "900ms" }}>
            <Link
              to="/scan"
              className="press-lift inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-extrabold text-stone-900 shadow-xl ring-2 ring-white/60 transition-transform hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
            >
              <Camera className="h-5 w-5" />
              Scan My Fridge
            </Link>
            <p className="mt-2.5 text-center text-[13px] font-semibold text-white/85 sm:text-left">
              Free to explore — no account needed.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .chef-story .chef-reveal {
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 900ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .chef-story.is-live .chef-reveal { opacity: 1; transform: none; }

        .chef-story .chef-sprig {
          opacity: 0;
          transform-origin: bottom center;
        }
        .chef-story.is-live .chef-sprig {
          animation: chef-grow 1600ms cubic-bezier(0.22, 1, 0.36, 1) forwards,
                     chef-sway 7s ease-in-out 1600ms infinite alternate;
        }
        @keyframes chef-grow {
          0%   { opacity: 0; transform: translateY(18px) scaleY(0.35) rotate(-2deg); }
          100% { opacity: 1; transform: translateY(0) scaleY(1) rotate(0deg); }
        }
        @keyframes chef-sway {
          from { transform: rotate(-1.4deg); }
          to   { transform: rotate(1.4deg); }
        }
        .chef-story .chef-glow { animation: chef-breathe 9s ease-in-out infinite; }
        .chef-story .chef-glow-slow { animation-duration: 13s; }
        @keyframes chef-breathe {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .chef-story .chef-reveal { opacity: 1; transform: none; transition: none; }
          .chef-story.is-live .chef-sprig { animation: none; opacity: 1; }
          .chef-story .chef-glow { animation: none; }
        }
      `}</style>
    </section>
  );
}
