// Personalization data + helpers.
// Lessons, tips, and recipe ideas tagged with ingredient + diet keywords so
// they can be matched against what the user scanned and which dietary
// preferences they have selected.

export type DietId =
  | "lenten"
  | "orthodox-fasting"
  | "vegan"
  | "vegetarian"
  | "pescatarian"
  | "gluten-free"
  | "dairy-free"
  | "diabetic"
  | "low-sugar"
  | "heart-healthy"
  | "low-carb"
  | "no-beef"
  | "no-pork"
  | "nut-free"
  | "shellfish-free"
  | "family-friendly"
  | "kid-friendly"
  | "bodybuilder";

export const DIET_OPTIONS: { id: DietId; label: string; group: "fasting" | "lifestyle" | "health" | "restriction" | "audience"; hint?: string }[] = [
  { id: "lenten", label: "Lenten-friendly", group: "fasting", hint: "Meatless Fridays + Lent" },
  { id: "orthodox-fasting", label: "Orthodox fasting", group: "fasting", hint: "No meat, dairy, eggs, fish" },
  { id: "vegan", label: "Vegan", group: "lifestyle" },
  { id: "vegetarian", label: "Vegetarian", group: "lifestyle" },
  { id: "pescatarian", label: "Pescatarian", group: "lifestyle" },
  { id: "gluten-free", label: "Gluten-free", group: "restriction" },
  { id: "dairy-free", label: "Dairy-free", group: "restriction" },
  { id: "nut-free", label: "Nut-free", group: "restriction" },
  { id: "shellfish-free", label: "Shellfish-free", group: "restriction" },
  { id: "no-beef", label: "No beef", group: "restriction" },
  { id: "no-pork", label: "No pork", group: "restriction" },
  { id: "diabetic", label: "Diabetic-friendly", group: "health" },
  { id: "low-sugar", label: "Low sugar", group: "health" },
  { id: "low-carb", label: "Low carb", group: "health" },
  { id: "heart-healthy", label: "Heart-healthy", group: "health" },
  { id: "family-friendly", label: "Family-friendly", group: "audience" },
  { id: "kid-friendly", label: "Kid-friendly", group: "audience" },
  { id: "bodybuilder", label: "Bodybuilder / High-Protein", group: "lifestyle", hint: "Lean bulking, cutting, macro-friendly" },
];

// Lesson catalog with ingredient + diet tags used for matching.
export type LessonTag = {
  id: string;
  title: string;
  text: string;
  duration: string;
  ingredients: string[]; // lowercase keywords from scanned items
  diets: DietId[]; // dietary contexts this lesson is especially helpful for
  category: "knife" | "technique" | "temp" | "flavor" | "safety" | "storage" | "fasting";
};

export const LESSONS: LessonTag[] = [
  { id: "knife-101", title: "Knife skills 101", text: "Grip, rocking cut, claw guard — the 10 minutes that make every recipe easier.", duration: "6 min", ingredients: ["onion","garlic","carrot","pepper","tomato","potato","celery","cucumber","zucchini","cabbage"], diets: ["family-friendly"], category: "knife" },
  { id: "onion-no-tears", title: "Onion cutting (no tears)", text: "Root-on technique, dice vs. mince, julienne, plus the chill trick chefs actually use.", duration: "4 min", ingredients: ["onion","shallot","leek"], diets: [], category: "knife" },
  { id: "veg-prep", title: "Vegetable prep", text: "Julienne, brunoise, chiffonade, roll-cut. The shape changes the dish.", duration: "7 min", ingredients: ["carrot","celery","pepper","zucchini","cucumber","cabbage","broccoli","cauliflower","potato"], diets: ["vegan","vegetarian","lenten","orthodox-fasting"], category: "knife" },
  { id: "herb-spice", title: "Herb & spice pairings", text: "Why basil loves tomato, why cumin needs lime, and how to bloom dry spices for double the flavor.", duration: "5 min", ingredients: ["basil","cilantro","parsley","mint","oregano","thyme","rosemary","cumin","paprika","tomato","lime","lemon"], diets: [], category: "flavor" },
  { id: "core-technique", title: "Core cooking techniques", text: "Sauté, sear, braise, deglaze, wok-spin — one lesson per technique, all short.", duration: "8 min", ingredients: [], diets: [], category: "technique" },
  { id: "steak-temps", title: "Steak & meat temps", text: "Rare to well-done by feel and thermometer, plus the rest times that actually matter.", duration: "5 min", ingredients: ["steak","beef","ribeye","sirloin","filet","strip"], diets: [], category: "temp" },
  { id: "grilling", title: "Grilling, marinades & rubs", text: "Direct vs. indirect heat, the 50/50 marinade rule, and the rubs that build a real crust.", duration: "6 min", ingredients: ["steak","beef","chicken","pork","ribs","burger","kebab"], diets: ["family-friendly"], category: "technique" },
  { id: "seafood-cooking", title: "Seafood cooking", text: "Crispy-skin salmon, perfect shrimp, scallop crust — never overcook fish again.", duration: "6 min", ingredients: ["salmon","tuna","cod","tilapia","shrimp","scallop","fish","trout","halibut","mussels"], diets: ["pescatarian","lenten","heart-healthy"], category: "temp" },
  { id: "seafood-temps", title: "Seafood temperatures", text: "Internal temps for salmon, shrimp, tuna and white fish — and how to read them by touch.", duration: "4 min", ingredients: ["salmon","tuna","cod","tilapia","shrimp","scallop","fish"], diets: ["pescatarian","lenten"], category: "temp" },
  { id: "food-safety", title: "Food safety", text: "Safe temps, the 2-hour rule, cross-contamination, marinades, thawing without playing roulette.", duration: "4 min", ingredients: ["chicken","pork","beef","fish","egg","leftovers"], diets: [], category: "safety" },
  { id: "leftover-mgmt", title: "Leftover management", text: "What lasts how long, how to revive day-3 rice, and 5 transformations that don't taste like leftovers.", duration: "5 min", ingredients: ["leftovers","rice","pasta","chicken","turkey","ham","beef"], diets: ["family-friendly"], category: "storage" },
  { id: "shortcuts", title: "Kitchen shortcuts", text: "Mise en place in 90 seconds, the sheet-pan trick, cleanup-as-you-go.", duration: "4 min", ingredients: [], diets: ["family-friendly","kid-friendly"], category: "technique" },
  { id: "roasting", title: "Roasting like a pro", text: "Vegetables that caramelize instead of steam, juicy chicken, sheet-pan timing.", duration: "6 min", ingredients: ["potato","carrot","broccoli","cauliflower","brussels","squash","chicken"], diets: ["heart-healthy","vegan","vegetarian"], category: "technique" },
  { id: "building-flavor", title: "Building flavor", text: "Layering aromatics, salt timing, acid & fat balance — the stuff cookbooks skip.", duration: "5 min", ingredients: [], diets: [], category: "flavor" },
  { id: "storage", title: "Storage that saves money", text: "Where things actually belong in your fridge, freezer wins, herbs that last 2× longer.", duration: "4 min", ingredients: ["herbs","basil","cilantro","parsley","greens","lettuce","berries"], diets: [], category: "storage" },
  { id: "chef-secrets", title: "Chef Super J's secrets", text: "Finishing butter, pan sauces, the 5-second plate-up — the moves that separate home cooks from chefs.", duration: "7 min", ingredients: [], diets: [], category: "flavor" },
  // Fasting / dietary-specific lessons
  { id: "fasting-flavor", title: "Flavorful fasting cooking", text: "Build big flavor with no meat or dairy — umami from mushrooms, miso, tomato paste, and roasted garlic.", duration: "5 min", ingredients: ["mushroom","tomato","garlic","onion","beans","lentil","chickpea"], diets: ["lenten","orthodox-fasting","vegan","vegetarian"], category: "fasting" },
  { id: "fasting-substitutions", title: "Smart fasting substitutions", text: "Cashew cream for dairy, flax egg for binding, aquafaba for whipping — fasting-safe swaps that taste right.", duration: "4 min", ingredients: [], diets: ["lenten","orthodox-fasting","vegan","dairy-free"], category: "fasting" },
  { id: "beans-grains", title: "Beans & grains masterclass", text: "Creamy beans, fluffy rice, perfect quinoa — the foundation of fasting meals that fill you up.", duration: "6 min", ingredients: ["beans","lentil","chickpea","rice","quinoa","barley","farro"], diets: ["lenten","orthodox-fasting","vegan","vegetarian","gluten-free","heart-healthy"], category: "fasting" },
  { id: "low-carb-swaps", title: "Low-carb swaps that taste great", text: "Cauliflower rice, zucchini noodles, lettuce wraps — done right so nobody misses the carbs.", duration: "5 min", ingredients: ["cauliflower","zucchini","lettuce","cabbage"], diets: ["low-carb","diabetic","low-sugar"], category: "technique" },
  { id: "gluten-free-baking", title: "Gluten-free baking basics", text: "The flour blend that actually works, plus binding tricks for tender bakes.", duration: "5 min", ingredients: [], diets: ["gluten-free"], category: "technique" },
];

// Tips tagged similarly
export type TipTag = { text: string; ingredients: string[]; diets: DietId[] };

export const TIPS_TAGGED: TipTag[] = [
  { text: "Pair tomatoes with basil — anti-inflammatory and flavor magic.", ingredients: ["tomato","basil"], diets: [] },
  { text: "Bloom dry spices in hot oil 30s before adding liquid — flavor doubles.", ingredients: ["cumin","paprika","coriander","curry"], diets: [] },
  { text: "Black pepper unlocks turmeric — they belong together.", ingredients: ["turmeric","pepper"], diets: ["heart-healthy"] },
  { text: "Salmon loves dill, lemon, and a whisper of honey-mustard glaze.", ingredients: ["salmon"], diets: ["pescatarian","lenten","heart-healthy"] },
  { text: "Pat steak dry, salt 40 minutes ahead — that's the crust secret.", ingredients: ["steak","beef"], diets: [] },
  { text: "Chill onions 15 minutes before slicing — fewer tears, cleaner cuts.", ingredients: ["onion"], diets: [] },
  { text: "Lemon juice wakes up flat soups and sauces — try a squeeze before serving.", ingredients: ["lemon"], diets: [] },
  { text: "Roast leftover veg with olive oil and salt — they get a second life.", ingredients: ["leftovers","vegetables"], diets: ["vegan","vegetarian","lenten","orthodox-fasting"] },
  { text: "Fasting tip: a spoon of miso or tomato paste delivers meaty depth — no meat needed.", ingredients: [], diets: ["lenten","orthodox-fasting","vegan","vegetarian"] },
  { text: "Diabetic-friendly: pair carbs with protein + fat to flatten the blood sugar curve.", ingredients: [], diets: ["diabetic","low-sugar"] },
  { text: "Cashew cream = the dairy-free hack that fools everyone in pasta and soups.", ingredients: [], diets: ["dairy-free","vegan","lenten","orthodox-fasting"] },
  { text: "Kid trick: name the dish after them. 'Mia's Magic Pasta' eats faster than 'dinner.'", ingredients: [], diets: ["kid-friendly","family-friendly"] },
];

// Lightweight ingredient extraction from scanned item names.
export function extractIngredientKeywords(itemNames: string[]): string[] {
  const text = itemNames.join(" ").toLowerCase();
  const KEYWORDS = [
    "onion","shallot","leek","garlic","tomato","basil","cilantro","parsley","mint","oregano","thyme","rosemary",
    "cumin","paprika","coriander","curry","turmeric","pepper","lemon","lime",
    "salmon","tuna","cod","tilapia","shrimp","scallop","fish","trout","halibut","mussels",
    "steak","beef","ribeye","sirloin","filet","strip","chicken","turkey","pork","ham","ribs","burger","kebab","egg",
    "carrot","celery","cucumber","zucchini","cabbage","broccoli","cauliflower","potato","brussels","squash","mushroom","lettuce",
    "rice","pasta","quinoa","barley","farro","beans","lentil","chickpea",
    "berries","greens","herbs","leftovers","vegetables",
  ];
  const found = new Set<string>();
  for (const k of KEYWORDS) {
    if (text.includes(k)) found.add(k);
  }
  // implicit
  if (/left\s?over|tupperware|container/.test(text)) found.add("leftovers");
  return Array.from(found);
}

export function scoreLesson(lesson: LessonTag, ingredients: string[], diets: DietId[]): number {
  let score = 0;
  for (const ing of ingredients) if (lesson.ingredients.includes(ing)) score += 3;
  for (const d of diets) if (lesson.diets.includes(d)) score += 2;
  // small base so generic-but-useful lessons (no tags) still appear last
  if (lesson.ingredients.length === 0 && lesson.diets.length === 0) score += 0.25;
  return score;
}

export function pickPersonalizedLessons(itemNames: string[], diets: DietId[], limit = 6): LessonTag[] {
  const ingredients = extractIngredientKeywords(itemNames);
  return [...LESSONS]
    .map((l) => ({ l, s: scoreLesson(l, ingredients, diets) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.l);
}

export function pickPersonalizedTip(itemNames: string[], diets: DietId[]): TipTag {
  const ingredients = extractIngredientKeywords(itemNames);
  const ranked = TIPS_TAGGED
    .map((t) => {
      let s = 0;
      for (const i of ingredients) if (t.ingredients.includes(i)) s += 3;
      for (const d of diets) if (t.diets.includes(d)) s += 2;
      if (t.ingredients.length === 0 && t.diets.length === 0) s += 0.25;
      return { t, s };
    })
    .sort((a, b) => b.s - a.s);
  return (ranked[0]?.t ?? TIPS_TAGGED[0]);
}

export function dietLabel(id: DietId): string {
  return DIET_OPTIONS.find((d) => d.id === id)?.label ?? id;
}
