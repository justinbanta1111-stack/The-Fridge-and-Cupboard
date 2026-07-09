// Static curated content from Chef Super J. No AI calls, no network.

export const CHEF_TIPS: string[] = [
  "Salt your pasta water like the sea — it's your only shot to season the noodle itself.",
  "Pat proteins bone-dry before they hit the pan. Wet meat steams, dry meat sears.",
  "Stale bread is gold: croutons, breadcrumbs, French toast, panzanella.",
  "Wilting greens? Blanch 30 seconds, ice bath, freeze flat. Smoothies and soups for weeks.",
  "Brown butter doubles the flavor of almost anything sweet. Don't walk away from the pan.",
  "Acid wakes food up. A squeeze of lemon at the end is the move pros make.",
  "Rest meat. Half the juice you cut out on the board belongs in the bite.",
  "Sharp knives are safer than dull ones. Hone before every session.",
  "Save parmesan rinds in the freezer. Drop one in any soup or sauce for instant depth.",
  "Onions, carrots, celery — mirepoix is the foundation of half the world's great food.",
  "Taste as you go. Cooking without tasting is driving with your eyes closed.",
  "Don't crowd the pan. Steam is the enemy of a good sear.",
  "Roast veggies hotter than you think — 425°F minimum for real caramelization.",
  "A splash of pasta water finishes a sauce better than any cream.",
  "Eggs hate high heat. Low and slow makes scrambles cooks would pay for.",
  "Use what you already have first. The best ingredient is the one about to go bad.",
  "Stock is just bones, scraps, water, time. Stop throwing those bones away.",
  "Toast spices in dry oil for 30 seconds before adding liquid. Whole new flavor.",
  "Cold butter, off the heat, swirled in — that's how restaurants finish sauces.",
  "Leftover rice fries better than fresh. Day-old is the secret to good fried rice.",
];

export const CHEF_COMPLIMENTS: string[] = [
  "That's how it's done, Chef. Real food, real savings.",
  "Look at you — feeding your people and outsmarting waste.",
  "Pro move. The fridge is lighter and the wallet's heavier.",
  "Beautiful. That's a meal that would have hit the trash.",
  "You just cooked like Super J taught you. Respect.",
  "Saving food is serving others. Proud of you.",
  "That's a chef move. Use what you have, waste nothing.",
  "Hard work in the kitchen pays off. Nice cook.",
  "You're building the habit. Every save adds up.",
  "Boom — another rescue. The planet thanks you.",
];

/** Returns a deterministic tip for the given day so it stays stable for ~24h. */
export function getTipOfTheDay(date = new Date()): string {
  const epochDay = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return CHEF_TIPS[epochDay % CHEF_TIPS.length];
}

export function getRandomCompliment(): string {
  return CHEF_COMPLIMENTS[Math.floor(Math.random() * CHEF_COMPLIMENTS.length)];
}
