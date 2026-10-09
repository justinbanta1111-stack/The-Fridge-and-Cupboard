import type React from "react";
import { useEffect, useRef } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TalkToChefButton } from "@/components/TalkToChefButton";
import { createAppNavigation } from "@/lib/app-navigation";

/** Shared safe-area navigation reserves space above every page. */
export function NavControls() {
  const router = useRouter();
  const navigation = useRef<ReturnType<typeof createAppNavigation> | null>(null);
  useEffect(() => {
    const controls = createAppNavigation(router.history, (href) => {
      void router.navigate({ href, replace: true });
    });
    navigation.current = controls;
    return () => {
      controls.dispose();
      navigation.current = null;
    };
  }, [router]);

  // Radix modals set pointer-events:none on <body> and app sheets sit on
  // z-[300]; close every app-owned overlay before navigating.
  const closeOverlays = () => {
    window.dispatchEvent(new CustomEvent("tfc:close-overlays"));
    window.dispatchEvent(new CustomEvent("tfc:close-install-modal"));
    document.body.style.pointerEvents = "";
  };

  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    closeOverlays();
    if (navigation.current) navigation.current.home();
    else void router.navigate({ to: "/" });
  };

  const goBack = () => {
    closeOverlays();
    if (navigation.current) navigation.current.back();
    else void router.navigate({ to: "/" });
  };

  return (
    <>
      <div className="h-[var(--app-nav-offset)]" aria-hidden="true" />
      <nav
        aria-label="Home and back navigation"
        style={{ pointerEvents: "auto" }}
        className="fixed inset-x-0 top-0 z-[400] flex h-[var(--app-nav-offset)] items-end gap-2 border-b border-border/60 bg-background/95 pb-[4px] pl-[max(env(safe-area-inset-left,0px),0.75rem)] pr-[max(env(safe-area-inset-right,0px),64px)] backdrop-blur sm:pb-3"
      >
        <Button asChild variant="outline" className="h-[44px] min-w-[44px] px-2 text-xs sm:h-11 sm:px-3 sm:text-sm" title="Home">
          <Link to="/" onClick={goHome} aria-label="Go home" data-nav-home className="touch-manipulation">
            <Home aria-hidden="true" /> Home
          </Link>
        </Button>
        <Button variant="outline" className="h-[44px] min-w-[44px] px-2 text-xs sm:h-11 sm:px-3 sm:text-sm" onClick={goBack} type="button" aria-label="Go back" title="Back" data-nav-back>
          <ArrowLeft aria-hidden="true" /> Back
        </Button>
        <TalkToChefButton className="ml-auto h-[44px] min-w-[44px] px-2 text-xs sm:h-11 sm:px-3 sm:text-sm" />
      </nav>
    </>
  );
}