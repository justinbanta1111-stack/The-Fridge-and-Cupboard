import { useEffect, useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { getFreeScansUsed } from "@/lib/guest";

/**
 * One rule for who sees sign-in / trial / pricing content.
 *
 * - Signed-in people never see sign-in, sign-up, trial or pricing blocks.
 * - Paid members never see upgrade advertising anywhere.
 * - Signed-in free members get one small "Upgrade" entry in the menu/account.
 * - Visitors see a clear free-try message right away, and only get the three
 *   full pricing options once they've used their free preview scan.
 */
export function usePricingVisibility() {
  const { loading, userId, isActive } = useSubscription();
  const [usedFreePreview, setUsedFreePreview] = useState(false);

  useEffect(() => {
    setUsedFreePreview(getFreeScansUsed("fridge") + getFreeScansUsed("cupboard") > 0);
  }, [userId]);

  const signedIn = Boolean(userId);
  const ready = !loading;

  return {
    ready,
    signedIn,
    isSubscriber: isActive,
    usedFreePreview,
    /** Any sign-in / sign-up / trial invitation. Visitors only. */
    showSignupBlocks: ready && !signedIn,
    /** The three full pricing options. Visitors, after their free preview. */
    showFullPricing: ready && !signedIn && usedFreePreview,
    /** Small upgrade entry for signed-in members without a paid plan. */
    showUpgradeChip: ready && signedIn && !isActive,
  };
}

export default usePricingVisibility;
