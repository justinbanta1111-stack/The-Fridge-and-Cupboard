import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

/**
 * Decorative status panel for Chef Super J at the bottom of the home page.
 * Voice is fully hands-free: the greeting plays on load, then the mic opens
 * automatically. No tap button — this panel only reflects what the chef hears.
 */
export function ChefVoicePanel() {
  const [active, setActive] = useState(false);
  const [caption, setCaption] = useState<{ text: string; final: boolean } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onActive = () => setActive(true);
    const onIdle = () => {
      setActive(false);
      setCaption(null);
    };
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const onPartial = (e: Event) => {
      const detail = (e as CustomEvent).detail as { text?: string; final?: boolean } | undefined;
      if (!detail?.text) return;
      setCaption({ text: detail.text, final: !!detail.final });
      if (clearTimer) clearTimeout(clearTimer);
      if (detail.final) {
        clearTimer = setTimeout(() => setCaption(null), 4000);
      }
    };
    window.addEventListener("tfc:chef-voice-active", onActive);
    window.addEventListener("tfc:chef-voice-idle", onIdle);
    window.addEventListener("tfc:chef-voice-partial", onPartial as EventListener);
    return () => {
      window.removeEventListener("tfc:chef-voice-active", onActive);
      window.removeEventListener("tfc:chef-voice-idle", onIdle);
      window.removeEventListener("tfc:chef-voice-partial", onPartial as EventListener);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, []);




  return (
    <section className="mt-10 animate-fade-in">
      <div
        role="status"
        aria-live="polite"
        aria-label="Chef Super J voice status"
        className="relative block w-full overflow-hidden rounded-3xl p-6 text-left sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.32 0.14 255) 0%, oklch(0.28 0.16 270) 45%, oklch(0.42 0.18 35) 100%)",
          boxShadow:
            "0 25px 70px -20px oklch(0.4 0.2 260 / 0.55), inset 0 1px 0 0 rgba(255,255,255,0.18)",
        }}
      >
        {/* Soft glow blobs */}
        <div
          className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.2 240 / 0.9), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.75 0.2 40 / 0.85), transparent 70%)" }}
        />
        {/* Animated shimmer */}
        <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay shimmer-overlay" />

        <div className="relative flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <span
              className="absolute inset-0 -m-2 rounded-full"
              style={{
                background: "radial-gradient(circle, oklch(0.85 0.18 230 / 0.6), transparent 65%)",
                animation: "chef-pulse 1.8s ease-in-out infinite",
              }}
            />
            <div
              className="relative grid h-14 w-14 place-items-center rounded-full text-white ring-2 ring-white/50 sm:h-16 sm:w-16"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.2 250), oklch(0.55 0.22 30))",
                boxShadow: "0 8px 30px -5px oklch(0.5 0.25 260 / 0.7)",
              }}
            >
              <Mic className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/90">
              Voice Assistant
            </div>
            <h2
              className="mt-1 font-display text-2xl font-bold leading-tight text-white sm:text-3xl"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
            >
              Chef Super J is listening…
            </h2>
            <p className="mt-1.5 text-sm text-white/85 sm:text-base">
              Ask me what to cook, what's expiring, or what to do with leftovers.
            </p>

            {/* Live transcription caption */}
            {caption && (
              <div
                className="mt-3 rounded-2xl bg-black/35 px-3.5 py-2 text-sm leading-snug text-white ring-1 ring-white/15 backdrop-blur-sm sm:text-base"
                aria-live="polite"
                role="status"
              >
                <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200/90">
                  {caption.final ? "Heard" : "Live"}
                </span>
                <span className={caption.final ? "" : "italic opacity-95"}>
                  “{caption.text}”
                </span>
              </div>
            )}

            {/* Soundwave */}
            <div className="mt-4 flex items-end gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <span
                  key={i}
                  className="block w-1.5 rounded-full bg-gradient-to-t from-sky-300 to-amber-200"
                  style={{
                    height: "10px",
                    animation: `chef-wave 1.1s ease-in-out ${i * 0.08}s infinite`,
                    opacity: active ? 1 : 0.85,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chef-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 1; }
        }
        @keyframes chef-wave {
          0%, 100% { height: 8px; }
          50% { height: 28px; }
        }
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
