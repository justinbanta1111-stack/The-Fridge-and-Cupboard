import { useEffect, useRef, useState } from "react";
import { useRouter, useRouterState, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";

/**
 * Minimal navigation arrows: Back and Forward only.
 * Tucked into the top corners so they never overlap content, cards, or buttons.
 */
export function NavControls() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [canForward, setCanForward] = useState(false);
  const wentBack = useRef(false);

  useEffect(() => {
    // A route change that wasn't caused by our Back button clears "forward".
    if (wentBack.current) {
      wentBack.current = false;
      setCanForward(true);
    } else {
      setCanForward(false);
    }
  }, [pathname]);

  const goBack = () => {
    wentBack.current = true;
    router.history.back();
  };
  const goForward = () => {
    router.history.forward();
  };

  const isHome = pathname === "/";
  const topOffset = "calc(env(safe-area-inset-top, 0px) + 0.75rem)";
  // Sits just below the voice-mute button in the top-right corner.
  const forwardTopOffset = "calc(env(safe-area-inset-top, 0px) + 3.5rem)";

  const arrowClass =
    "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition hover:text-foreground/80 active:scale-95 disabled:opacity-0";

  const homeClass =
    "pointer-events-auto fixed left-3 z-[300] inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-background/70 text-foreground/70 shadow-sm backdrop-blur-sm transition hover:bg-background hover:text-foreground active:scale-95";

  return (
    <>
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back"
        title="Back"
        disabled={isHome}
        data-nav-back
        className={`${arrowClass} fixed left-3 z-[300]`}
        style={{ top: topOffset }}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      {!isHome && (
        <Link
          to="/"
          aria-label="Go home"
          title="Home"
          data-nav-home
          className={homeClass}
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.25rem)" }}
        >
          <Home className="h-4 w-4" />
        </Link>
      )}
      <button
        type="button"
        onClick={goForward}
        aria-label="Go forward"
        title="Forward"
        disabled={!canForward}
        data-nav-forward
        className={`${arrowClass} fixed right-3 z-[300]`}
        style={{ top: forwardTopOffset }}
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </>
  );
}
