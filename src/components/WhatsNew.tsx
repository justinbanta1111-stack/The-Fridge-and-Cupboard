import { Sparkles } from "lucide-react";

/**
 * Small, subtle "What's New & Coming" note for the home screen.
 */
export function WhatsNew() {
  return (
    <section
      data-reveal
      className="mx-auto mt-4 w-full max-w-2xl rounded-2xl border border-white/12 bg-ink-soft/60 px-4 py-3 backdrop-blur-md sm:mt-6"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <div>
          <div className="text-sm font-semibold text-ivory">What's New &amp; Coming</div>
          <p className="mt-0.5 text-[13px] leading-snug text-ivory/75">
            We're always improving The Fridge &amp; Cupboard with new features and upgrades to make
            it more useful, easier, and more personal.
          </p>
        </div>
      </div>
    </section>
  );
}

export default WhatsNew;
