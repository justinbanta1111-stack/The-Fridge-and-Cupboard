import { Link } from "@tanstack/react-router";
import { Check, Crown, Sparkles, Gift } from "lucide-react";
import { usePricingVisibility } from "@/hooks/use-pricing-visibility";
import { useCanSell } from "@/hooks/use-store-purchases";
import { RestorePurchasesButton } from "@/components/RestorePurchasesButton";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    note: "Try it out",
    Icon: Gift,
    features: [
      "Basic fridge scanning",
      "Basic cupboard scanning",
      "Basic recipes",
      "Basic AI conversations",
    ],
    highlight: false,
  },
  {
    name: "Standard",
    price: "$3.99",
    note: "per month",
    Icon: Sparkles,
    features: [
      "Unlimited scans",
      "Save favorite recipes",
      "Advanced ingredient substitutions",
      "Leftover optimization",
      "Advanced dietary filters",
    ],
    highlight: true,
  },
  {
    name: "Premium",
    price: "$5.99",
    note: "per month",
    Icon: Crown,
    features: [
      "Weekly meal planning",
      "Shopping list generation",
      "Pantry tracking",
      "Family features",
      "Most advanced AI chef capabilities",
      "Early access to new features",
    ],
    highlight: false,
  },
];

export function MembershipTiers() {
  const { showSignupBlocks } = usePricingVisibility();
  const canSell = useCanSell();
  // No prices are shown in the installed app unless store billing is wired.
  if (!canSell || !showSignupBlocks) return null;
  return (
    <section className="mt-14 sm:mt-20">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <h2 className="font-display text-[1.6rem] font-bold leading-tight tracking-tight sm:text-4xl">Memberships</h2>
        <p className="mt-2.5 text-[15px] text-muted-foreground sm:text-lg">
          Start free for 3 days. Cancel anytime.
        </p>
      </div>

      <div className="mt-6 grid gap-3.5 sm:mt-8 sm:gap-4 lg:grid-cols-3">
        {TIERS.map((t, idx) => (
          <div
            key={t.name}
            data-reveal
            style={{ ["--reveal-delay" as any]: `${idx * 70}ms` }}
            className={
              "relative flex flex-col rounded-3xl border bg-card p-5 shadow-sm sm:p-7 " +
              (t.highlight ? "sheen border-primary/50 shadow-lg ring-1 ring-primary/25" : "border-border/60")
            }
          >
            {t.highlight && (
              <span className="absolute -top-3 left-6 z-[2] rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                Most popular
              </span>
            )}
            <div className="relative z-[2] flex items-center gap-3">
              <span className="icon-rise grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
                <t.Icon className="h-5 w-5" />
              </span>
              <div className="font-display text-lg font-bold tracking-tight sm:text-xl">{t.name}</div>
            </div>
            <div className="relative z-[2] mt-3.5 flex items-baseline gap-2">
              <span className="font-display text-[2rem] font-bold tracking-tight sm:text-4xl">{t.price}</span>
              <span className="text-sm text-muted-foreground">{t.note}</span>
            </div>
            <ul className="relative z-[2] mt-4 space-y-2 sm:mt-5 sm:space-y-2.5">

              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-foreground sm:text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/pro"
              className={
                "relative z-[2] mt-5 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-[0.98] sm:mt-6 sm:py-3 " +
                (t.highlight
                  ? "bg-primary text-primary-foreground shadow-md hover:brightness-110"
                  : "border border-border bg-secondary text-foreground hover:bg-secondary/80")
              }
            >
              {t.name === "Free" ? "Get started" : `Choose ${t.name}`}
            </Link>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-2xl text-center">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Standard is $3.99 per month and Premium is $5.99 per month. Subscriptions renew
          automatically each month until you cancel, and you can cancel anytime from your account.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold">
          <Link to="/subscription-terms" className="underline underline-offset-4">Subscription terms</Link>
          <Link to="/privacy" className="underline underline-offset-4">Privacy policy</Link>
        </div>
        <RestorePurchasesButton className="mt-4" />
      </div>
    </section>
  );
}

export default MembershipTiers;
