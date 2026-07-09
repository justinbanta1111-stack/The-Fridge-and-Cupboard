/** Pre-written messages used by ShareMenu throughout the app. */

const SITE = "https://thefridgeandcupboard.com";

export function buildMealShareMessage(opts: {
  title: string;
  description?: string;
  timeMinutes?: number;
  uses?: string[];
}) {
  const lines: string[] = [];
  lines.push(`Tonight I'm making: ${opts.title}`);
  if (opts.description) lines.push(opts.description);
  const meta: string[] = [];
  if (opts.timeMinutes) meta.push(`~${opts.timeMinutes} min`);
  if (opts.uses?.length) meta.push(`uses what's already in the fridge`);
  if (meta.length) lines.push(meta.join(" · "));
  lines.push("");
  lines.push(`Built from what was in my kitchen with The Fridge & Cupboard.`);
  return lines.join("\n");
}

export const INVITE_MESSAGE =
  "I found this app that helps you make meals from what's already in your fridge and cupboard. It can also help with leftovers, saving money, and supportive meals when someone isn't feeling well. Thought of you — give it a try.";

export const CHURCH_MESSAGE =
  "Sharing a tool our group might love — The Fridge & Cupboard. It turns whatever's already in the fridge and cupboard into real meals, helps with leftovers, supports caregivers and meal trains, and works great for families. Free to try, no signup to start.";

export function buildCaregiverShareMessage(opts: {
  symptoms: string[];
  mealTitle?: string;
  grocery?: string[];
}) {
  const lines: string[] = [];
  lines.push("Caregiver update from The Fridge & Cupboard:");
  lines.push("");
  if (opts.symptoms.length) {
    lines.push(`How they're feeling today: ${opts.symptoms.join(", ")}`);
  } else {
    lines.push("How they're feeling today: not specified");
  }
  if (opts.mealTitle) {
    lines.push("");
    lines.push(`Suggested meal: ${opts.mealTitle}`);
  }
  if (opts.grocery && opts.grocery.length) {
    lines.push("");
    lines.push(`Grocery gap (only what's missing):`);
    for (const g of opts.grocery) lines.push(`• ${g}`);
  }
  return lines.join("\n");
}

export const SITE_URL = SITE;
