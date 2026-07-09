// Chef Super J Academy — static lesson content.
// Real, practical, in Chef's voice. No AI calls.

import { UtensilsCrossed, ChefHat, Sparkles, Recycle, MessageCircle, type LucideIcon } from "lucide-react";

export type Lesson = {
  slug: string;
  title: string;
  summary: string;
  steps: string[];
  pro_tip?: string;
  safety?: string;
};

export type AcademySection = {
  slug: string;
  title: string;
  tagline: string;
  icon: LucideIcon;
  accent: string; // tailwind color stem, e.g. "primary"
  lessons: Lesson[];
};

export const ACADEMY_SECTIONS: AcademySection[] = [
  {
    slug: "knife-skills",
    title: "Knife Skills",
    tagline: "The foundation of every great cook.",
    icon: UtensilsCrossed,
    accent: "primary",
    lessons: [
      {
        slug: "dice-onions",
        title: "How to dice an onion",
        summary: "The classic chef cut — fast, uniform, no tears (mostly).",
        steps: [
          "Slice off the stem end. Leave the root end on — that's what holds it together.",
          "Cut the onion in half through the root. Peel back the papery skin.",
          "Lay flat, cut-side down. Make vertical slices toward the root, but don't cut through it.",
          "Make 2-3 horizontal cuts parallel to the board, again stopping at the root.",
          "Slice across — perfect dice falls away. Discard the root.",
        ],
        pro_tip: "Sharp knife + cold onion = far fewer tears. Chill it 15 min before you cut.",
        safety: "Curl the fingertips of your guiding hand back into a claw — knuckles forward, tips tucked.",
      },
      {
        slug: "slice-tomatoes",
        title: "How to slice tomatoes",
        summary: "Clean rounds without crushing the flesh.",
        steps: [
          "Use a SERRATED knife. A straight blade slides on tomato skin and tears it.",
          "Set the tomato stem-side down on the board for stability.",
          "Saw with light pressure — let the teeth do the work, don't push down.",
          "Aim for slices about ¼ inch thick for sandwiches, ⅛ inch for salads.",
        ],
        pro_tip: "If you only own a chef knife, score the skin with the tip first, then slice.",
      },
      {
        slug: "cut-peppers",
        title: "How to cut peppers (no waste)",
        summary: "Get the most flesh out of every bell pepper.",
        steps: [
          "Stand the pepper on its base. Slice down each of the 3-4 'walls', cutting around the core.",
          "You're left with a stem and seed cluster in the middle — toss it whole.",
          "Lay each wall skin-side down. Trim any white ribs.",
          "Slice into strips, then crosswise for a dice. Uniform pieces cook evenly.",
        ],
        pro_tip: "For fajitas, slice with the grain (long strips). For salsa, dice small.",
      },
      {
        slug: "debone-chicken",
        title: "How to debone a chicken thigh",
        summary: "Cheaper than boneless, and you get a free bone for stock.",
        steps: [
          "Lay the thigh skin-side down. You'll see the bone running through the middle.",
          "Run the knife along ONE side of the bone, separating meat from bone.",
          "Repeat on the other side. The bone is now exposed.",
          "Slide the knife UNDER the bone, lifting it out. Trim cartilage at the joints.",
          "Save the bone in a freezer bag for stock day.",
        ],
        pro_tip: "A boning knife helps but a sharp chef knife works. Go slow the first few times.",
        safety: "Use a separate cutting board for raw poultry. Wash hands, knife, and board with hot soapy water after.",
      },
      {
        slug: "knife-safety",
        title: "Proper knife safety",
        summary: "30 years in pro kitchens. These rules keep all 10 fingers attached.",
        steps: [
          "A sharp knife is SAFER than a dull one — dull blades slip.",
          "The claw grip: curl your guiding fingers back, knuckles forward, fingertips tucked.",
          "Never try to catch a falling knife. Step back and let it land.",
          "Walk with the blade pointed at the floor, edge facing your leg, never up.",
          "Wet hands or wet handles = stop and dry off. That's how people get cut.",
          "Wash knives by hand immediately. Never leave them in a sink full of suds.",
        ],
        safety: "Use a damp towel under your cutting board so it doesn't slide. Stable board = stable cut.",
      },
    ],
  },
  {
    slug: "kitchen-basics",
    title: "Kitchen Basics",
    tagline: "The fundamentals nobody teaches you.",
    icon: ChefHat,
    accent: "primary",
    lessons: [
      {
        slug: "meat-doneness",
        title: "How to know when meat is done",
        summary: "Forget cutting it open. A thermometer and your fingers are all you need.",
        steps: [
          "Get a $15 instant-read thermometer. Best money you'll spend in the kitchen.",
          "Chicken: 165°F in the thickest part, away from bone.",
          "Ground beef/pork: 160°F. Whole muscle beef can go lower (135°F medium-rare).",
          "Pork chops/roasts: 145°F + 3 min rest. Pink is fine.",
          "Fish: 145°F or until it flakes with a fork.",
          "The finger test: press a steak; firmness = doneness. Soft = rare, springy = medium, firm = well.",
        ],
        pro_tip: "Pull meat 5°F BEFORE target. Carryover cooking finishes it during rest.",
      },
      {
        slug: "egg-freshness",
        title: "How to test eggs for freshness",
        summary: "The water test never lies.",
        steps: [
          "Fill a bowl with cold water.",
          "Gently lower the egg in.",
          "Sinks and lays flat = very fresh. Use for anything.",
          "Sinks but stands up = a week or two old. Hard-boil these (peels easier anyway).",
          "Floats = throw it out. The air pocket has grown — it's bad.",
        ],
        pro_tip: "Crack iffy eggs into a separate bowl first. One bad egg can ruin a whole recipe.",
      },
      {
        slug: "build-flavor",
        title: "How to build flavor",
        summary: "Great food isn't one ingredient — it's layers.",
        steps: [
          "Start with FAT: butter, olive oil, bacon fat. Flavor lives in fat.",
          "Build AROMATICS: onion, garlic, celery, carrot, ginger. Cook until soft and sweet.",
          "Toast SPICES in the fat for 30 seconds. Wakes them up.",
          "Deglaze with ACID or wine. Scrape the brown bits — that's pure flavor.",
          "Simmer with STOCK or tomatoes to meld everything.",
          "Finish with FRESH: herbs, citrus, flaky salt, good olive oil.",
        ],
        pro_tip: "Salt at every layer, taste at every layer. Don't dump all the salt in at the end.",
      },
      {
        slug: "fix-over-salted",
        title: "How to fix over-salted food",
        summary: "It's not ruined. Here's the rescue.",
        steps: [
          "DILUTE: add more unsalted liquid (water, stock, cream, coconut milk).",
          "BULK UP: more potatoes, rice, pasta, or veggies absorb salt.",
          "ACID: a squeeze of lemon or splash of vinegar tricks the tongue.",
          "SWEET: a pinch of sugar or honey balances saltiness in sauces.",
          "FAT: cream, butter, or sour cream softens the salt punch.",
          "POTATO MYTH: dropping a raw potato in helps a TINY bit. Not a miracle. Dilution works better.",
        ],
        pro_tip: "For brines and soups gone bad, double the batch with unsalted ingredients and freeze half.",
      },
      {
        slug: "storage-tips",
        title: "Proper storage tips",
        summary: "Half of all 'going bad' food is just stored wrong.",
        steps: [
          "Herbs (parsley, cilantro): trim stems, stand in a jar with 1 inch of water, loose bag on top. Lasts 2 weeks.",
          "Berries: don't wash until you eat them. Store in a paper-towel-lined container, lid cracked.",
          "Onions, potatoes, garlic: cool, dark, dry. NEVER together — onions spoil potatoes faster.",
          "Tomatoes: counter, never fridge. Cold kills the flavor.",
          "Bread: room temp 2-3 days, then freeze. Never the fridge — it goes stale faster there.",
          "Cooked leftovers: cool to room temp within 2 hours, then fridge. Eat within 4 days or freeze.",
        ],
        pro_tip: "Label leftovers with the date in masking tape. Memory is not a storage system.",
      },
    ],
  },
  {
    slug: "chef-secrets",
    title: "Chef Secrets",
    tagline: "What pros do that home cooks don't.",
    icon: Sparkles,
    accent: "accent",
    lessons: [
      {
        slug: "why-salt-matters",
        title: "Why salt matters",
        summary: "Salt isn't just flavor — it's chemistry.",
        steps: [
          "Salt enhances flavor by suppressing bitterness and amplifying sweetness.",
          "It draws moisture OUT (curing, dry brines) or IN (wet brines) depending on concentration.",
          "Salt EARLY for protein structure, LATE for vegetables (or they go limp).",
          "Use KOSHER salt for cooking — easier to pinch, less likely to over-salt.",
          "Finish with FLAKY salt (Maldon) for crunch and a salinity hit on top.",
        ],
        pro_tip: "Salt your meat 40+ minutes before cooking, OR right before. The 10-30 minute window is the worst — it pulls juices out and doesn't reabsorb.",
      },
      {
        slug: "layering-flavors",
        title: "Layering flavors",
        summary: "Each step adds to what came before. Never starts over.",
        steps: [
          "Sweat aromatics low and slow — sweetness develops.",
          "Brown proteins HOT — Maillard reaction creates 100s of new flavor compounds.",
          "Deglaze: liquid hits the hot pan, lifts the fond (brown bits) into the sauce.",
          "Reduce sauces to concentrate. Water boils off, flavor stays.",
          "Mount with cold butter at the end — gives glossy finish and rounds sharp edges.",
        ],
      },
      {
        slug: "fresh-vs-dry-herbs",
        title: "Fresh herbs vs dry herbs",
        summary: "They're not interchangeable. Use each for what it does best.",
        steps: [
          "DRY HERBS (oregano, thyme, rosemary, bay, sage) go in EARLY — they need heat and time to bloom.",
          "FRESH HERBS (basil, parsley, cilantro, mint, dill, chives) go in LATE or at the end — heat destroys them.",
          "Conversion: 1 tablespoon fresh = 1 teaspoon dry. Dry is 3x stronger.",
          "Rosemary and thyme are tough — woody stems can go in early, leaves stripped.",
          "Save soft herb stems (parsley, cilantro) — they're flavor bombs in stocks and sauces.",
        ],
        pro_tip: "If dry herbs in your cabinet have no smell when you crush them in your palm, they're dead. Replace.",
      },
      {
        slug: "sauce-building",
        title: "Sauce building",
        summary: "Five mother sauces, infinite variations.",
        steps: [
          "BÉCHAMEL: butter + flour (roux) + milk. Base for mac and cheese, lasagna.",
          "VELOUTÉ: roux + stock. Lighter base for gravies, chicken sauces.",
          "ESPAGNOLE: brown roux + brown stock + tomato. Foundation for demi-glace.",
          "TOMATO: tomato + aromatics. Pasta, pizza, braises.",
          "HOLLANDAISE: egg yolk + butter + acid. Emulsion — eggs Benedict.",
          "Every restaurant sauce is one of these five, dressed up with seasoning, herbs, or wine.",
        ],
        pro_tip: "Pan sauce in 5 min: cook meat, remove. Sauté shallot in the drippings. Splash wine, scrape. Add stock, reduce by half. Off heat, swirl in cold butter. Done.",
      },
      {
        slug: "pan-heat-control",
        title: "Pan heat control",
        summary: "Heat management separates good cooks from frustrated ones.",
        steps: [
          "Preheat the pan EMPTY for 1-2 minutes before adding fat.",
          "Test fat: a drop of water sizzles violently = ready. Smokes = too hot, pull off heat.",
          "HIGH heat: sears, stir-fries, blackening. Quick cooks.",
          "MEDIUM-HIGH: most sautéing, browning meat.",
          "MEDIUM: eggs, fish, anything delicate.",
          "LOW: simmers, melting butter, reducing sauces gently.",
          "If smoke is filling the kitchen, you're too hot. Adjust DOWN and let it recover.",
        ],
        pro_tip: "Stainless steel: hot pan, cold oil, food in. That's the no-stick formula even without a non-stick pan.",
      },
    ],
  },
  {
    slug: "leftover-transformations",
    title: "Leftover Transformations",
    tagline: "Turn one meal into three. The Super J way.",
    icon: Recycle,
    accent: "primary",
    lessons: [
      {
        slug: "one-meal-three",
        title: "Turn one meal into three new meals",
        summary: "A roast chicken on Sunday should feed you all week.",
        steps: [
          "MEAL 1 (Sun): Roast chicken with potatoes and veg. Eat dinner.",
          "MEAL 2 (Mon): Pull leftover meat. Make tacos, quesadillas, or a chicken salad sandwich.",
          "MEAL 3 (Tue): Bones + carcass + onion scraps → stock. Add rice, last bits of chicken, frozen peas = chicken soup.",
          "BONUS: shredded chicken freezes flat in a bag for 3 months. Future you says thank you.",
        ],
        pro_tip: "Cook ONCE, eat THREE TIMES. The secret to fast weeknight dinners is not cooking on weeknights.",
      },
      {
        slug: "stretch-proteins",
        title: "Stretch proteins",
        summary: "One pound of meat can feed 6 if you know how.",
        steps: [
          "Mix ground meat with cooked lentils, rice, or finely diced mushrooms (50/50). Almost undetectable.",
          "Tacos, chili, pasta sauce: bulk with beans. Cheaper, more fiber, fills you up.",
          "Slice protein THIN against the grain — feels like more, easier to chew.",
          "Build the plate carb-first: rice or pasta base, then top with smaller meat portion + sauce.",
          "Soups and stir-fries are protein-stretchers by design. A little goes a long way.",
        ],
      },
      {
        slug: "reinvent-vegetables",
        title: "Reinvent vegetables",
        summary: "Sad fridge veg → new meals. Don't toss them.",
        steps: [
          "Roasted veg from last night → blend with stock = soup. Add cream if you want.",
          "Steamed broccoli/cauliflower → chop fine, mix with cheese and egg = veggie patties or frittata.",
          "Limp greens → wilt into pasta, soup, or eggs. Heat saves them.",
          "Cooked potatoes → smash and fry into hash, or grate cold for crispy latkes.",
          "Roasted root veg + grain + dressing = grain bowl lunch.",
        ],
        pro_tip: "Olive oil + garlic + chili flakes + lemon will revive almost any tired vegetable.",
      },
      {
        slug: "soup-conversions",
        title: "Soup conversions",
        summary: "Almost anything in the fridge can become soup.",
        steps: [
          "Base: sweat onion + garlic in butter/oil. Add a pinch of salt.",
          "Bulk: leftover roasted veg, beans, grains, meat scraps. Whatever you've got.",
          "Liquid: stock (homemade or boxed), or water + bouillon. 4-6 cups for a pot.",
          "Simmer 15-20 minutes to meld flavors.",
          "Finish: cream for richness, lemon for brightness, fresh herbs on top.",
          "Blend for a creamy soup, or leave chunky.",
        ],
        pro_tip: "Soup freezes beautifully. Portion into single-serve containers — instant lunch for weeks.",
      },
      {
        slug: "burrito-taco-conversions",
        title: "Burrito & taco conversions",
        summary: "Tortillas are the universal leftover wrapper.",
        steps: [
          "ANY cooked protein + cheese + tortilla = quesadilla. Lunch in 5 min.",
          "Leftover rice + beans + salsa + cheese + meat scraps = burrito. Wrap tight, sear in a dry pan.",
          "Cold roasted meat + slaw + hot sauce + corn tortilla = tacos. 3 min.",
          "Breakfast version: scrambled eggs + leftover potatoes + cheese + salsa = breakfast burrito. Wrap in foil, freezes for 2 months.",
          "Soup gone watery? Strain solids → burrito filling. Reduce liquid → sauce.",
        ],
        pro_tip: "Always have tortillas in the freezer. They're a get-out-of-jail-free card for any leftover.",
      },
    ],
  },
];

export function getAcademySection(slug: string): AcademySection | undefined {
  return ACADEMY_SECTIONS.find((s) => s.slug === slug);
}

export const ACADEMY_ASK_META = {
  slug: "ask",
  title: "Ask Chef Super J",
  tagline: "Type or speak your question. Chef answers.",
  icon: MessageCircle,
};
