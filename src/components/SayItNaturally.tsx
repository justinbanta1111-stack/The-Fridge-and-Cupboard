import { MessageCircleHeart } from "lucide-react";

const PHRASES = [
  "I don't like onions.",
  "I need something cheap.",
  "I want Mexican food.",
  "I only have 20 minutes.",
  "I need something my kids will eat.",
  "I'm trying to use these leftovers.",
  "I'm on a tight grocery budget.",
  "I need something healthy.",
  "What can I make with this?",
];

function openChef(prefill: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tfc:open-chef-voice", { detail: { prefill } }));
}

/**
 * Teaches users, in plain language, that they can just talk naturally.
 */
export function SayItNaturally() {
  return (
    <section
      data-reveal
      className="mx-auto mt-3 w-full max-w-2xl rounded-2xl border border-white/12 bg-ink-soft/60 px-4 py-3 backdrop-blur-md sm:mt-4"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-ivory">
        <MessageCircleHeart className="h-4 w-4 text-teal" /> Just say it — Chef understands
      </div>
      <p className="mt-1 text-[13px] leading-snug text-ivory/75">
        No commands to learn. Talk or type like you would to a friend:
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PHRASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => openChef(p)}
            className="press-lift rounded-full border border-teal/35 bg-teal/12 px-2.5 py-1 text-[12px] font-medium text-ivory/90 transition hover:bg-teal/22"
          >
            “{p}”
          </button>
        ))}
      </div>
    </section>
  );
}

export default SayItNaturally;
