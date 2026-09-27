import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { usePricingVisibility } from "@/hooks/use-pricing-visibility";

/**
 * Warm, low-pressure trial invitation shown after the user has had a
 * chance to explore the app's features.
 */
export function FriendlyTrialInvite() {
  const { showSignupBlocks } = usePricingVisibility();
  if (!showSignupBlocks) return null;
  return (
    <section className="mt-10 sm:mt-14">
      <div
        data-reveal
        className="sheen sheen-slow bg-drift rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-center text-white shadow-lg ring-1 ring-white/20 sm:p-7"
      >
        <div className="icon-rise mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
          <Heart className="h-5 w-5" />
        </div>
        <h2 className="mt-3 font-display text-[1.35rem] font-bold leading-tight tracking-tight sm:text-3xl">
          Whenever you're ready
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-white/90 sm:text-base">
          Keep exploring as long as you like. When it feels right, try it free for 3 days — no pressure either way.
        </p>
        <Link
          to="/pro"
          className="press-lift mt-4 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[15px] font-extrabold text-stone-900 shadow-lg hover:bg-white/95 sm:text-base"
        >
          Try it free
        </Link>
        <p className="mt-2.5 text-[12px] text-white/85 sm:text-sm">
          Then just $3.99/month. Cancel anytime.
        </p>

      </div>
    </section>
  );
}

export default FriendlyTrialInvite;
