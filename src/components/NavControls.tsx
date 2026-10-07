import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared safe-area navigation reserves space above every page. */
export function NavControls() {
  const router = useRouter();

  const goBack = () => {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      void router.navigate({ to: "/" });
    }
  };

  return (
    <>
      <div className="h-[var(--app-nav-offset)]" aria-hidden="true" />
      <nav
        aria-label="Home and back navigation"
        className="fixed inset-x-0 top-0 z-[300] flex h-[var(--app-nav-offset)] items-end gap-2 border-b border-border/60 bg-background/95 pb-[4px] pl-[max(env(safe-area-inset-left,0px),0.75rem)] pr-[max(env(safe-area-inset-right,0px),64px)] backdrop-blur sm:pb-3"
      >
        <Button asChild variant="outline" className="h-[44px] min-w-[44px] px-2 text-xs sm:h-11 sm:px-3 sm:text-sm" title="Home">
          <Link to="/" aria-label="Go home" data-nav-home>
            <Home aria-hidden="true" /> Home
          </Link>
        </Button>
        <Button variant="outline" className="h-[44px] min-w-[44px] px-2 text-xs sm:h-11 sm:px-3 sm:text-sm" onClick={goBack} aria-label="Go back" title="Back" data-nav-back>
          <ArrowLeft aria-hidden="true" /> Back
        </Button>
      </nav>
    </>
  );
}