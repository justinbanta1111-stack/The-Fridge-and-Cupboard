/**
 * Canonical ingredient database.
 *
 * Every ingredient the app talks about — in a scanned fridge, a typed list, an
 * AI recipe idea or a tested recipe from the library — resolves to one entry
 * here. That way meal ideas never depend on a single fuzzy image guess: the
 * detected words map onto real ingredients with real names, real aisles, real
 * price keys and a real typical amount to cook with.
 *
 * Pure data, no network, no side effects.
 */

import type { Aisle } from "@/lib/aisles";

export type Ingredient = {
  /** Stable id, also used for de-duplication and matching. */
  id: string;
  /** Human name shown in the app. */
  name: string;
  /** Other words that mean the same thing (scan output, typos, plurals). */
  aliases: string[];
  aisle: Aisle;
  /** Key into the grocery price database (src/lib/grocery-prices.ts). */
  priceKey: string;
  /** Assumed present in every kitchen — never counted as "missing". */
  staple?: boolean;
  /** A sensible amount for a 4-serving recipe, used when a line has none. */
  typical: string;
};

export const INGREDIENTS: Ingredient[] = [
  // ── Meat & seafood ───────────────────────────────────────────────
  { id: "chicken-breast", name: "Chicken breast", aliases: ["chicken breasts", "boneless chicken", "chicken cutlet"], aisle: "meat", priceKey: "chicken-breast", typical: "1 lb" },
  { id: "chicken-thigh", name: "Chicken thighs", aliases: ["chicken thigh", "chicken legs", "drumsticks", "chicken leg"], aisle: "meat", priceKey: "chicken-thigh", typical: "1.5 lb" },
  { id: "whole-chicken", name: "Whole chicken", aliases: ["roast chicken", "rotisserie chicken"], aisle: "meat", priceKey: "whole-chicken", typical: "1 (3.5–4 lb)" },
  { id: "chicken", name: "Chicken", aliases: ["cooked chicken", "shredded chicken", "chicken meat"], aisle: "meat", priceKey: "chicken", typical: "1 lb" },
  { id: "ground-beef", name: "Ground beef", aliases: ["mince", "ground chuck", "hamburger meat", "minced beef"], aisle: "meat", priceKey: "ground-beef", typical: "1 lb" },
  { id: "ground-turkey", name: "Ground turkey", aliases: ["ground chicken"], aisle: "meat", priceKey: "ground-beef", typical: "1 lb" },
  { id: "steak", name: "Steak", aliases: ["sirloin", "ribeye", "flank steak", "strip steak"], aisle: "meat", priceKey: "steak", typical: "1 lb" },
  { id: "beef", name: "Beef", aliases: ["stew meat", "brisket", "chuck roast"], aisle: "meat", priceKey: "beef", typical: "1 lb" },
  { id: "pork", name: "Pork", aliases: ["pork chop", "pork chops", "pork loin", "pork shoulder", "ham"], aisle: "meat", priceKey: "pork", typical: "1 lb" },
  { id: "bacon", name: "Bacon", aliases: ["streaky bacon", "pancetta"], aisle: "meat", priceKey: "bacon", typical: "4 slices" },
  { id: "sausage", name: "Sausage", aliases: ["chorizo", "kielbasa", "italian sausage", "bratwurst"], aisle: "meat", priceKey: "sausage", typical: "1 lb" },
  { id: "turkey", name: "Turkey", aliases: ["turkey breast", "deli turkey"], aisle: "meat", priceKey: "pork", typical: "1 lb" },
  { id: "shrimp", name: "Shrimp", aliases: ["prawns", "prawn"], aisle: "meat", priceKey: "shrimp", typical: "1 lb" },
  { id: "salmon", name: "Salmon", aliases: ["salmon fillet", "salmon fillets"], aisle: "meat", priceKey: "salmon", typical: "4 fillets (6 oz each)" },
  { id: "white-fish", name: "White fish", aliases: ["cod", "tilapia", "halibut", "haddock", "fish fillet"], aisle: "meat", priceKey: "fish", typical: "1 lb" },
  { id: "canned-tuna", name: "Canned tuna", aliases: ["tuna", "tinned tuna"], aisle: "pantry", priceKey: "tuna-canned", typical: "2 cans (5 oz)" },

  // ── Dairy & eggs ─────────────────────────────────────────────────
  { id: "eggs", name: "Eggs", aliases: ["egg", "large eggs"], aisle: "dairy", priceKey: "eggs", typical: "4 large" },
  { id: "milk", name: "Milk", aliases: ["whole milk", "2% milk", "skim milk", "buttermilk"], aisle: "dairy", priceKey: "milk", typical: "1 cup" },
  { id: "butter", name: "Butter", aliases: ["unsalted butter", "salted butter"], aisle: "dairy", priceKey: "butter", staple: true, typical: "2 tbsp" },
  { id: "heavy-cream", name: "Heavy cream", aliases: ["whipping cream", "double cream", "half and half"], aisle: "dairy", priceKey: "heavy-cream", typical: "1/2 cup" },
  { id: "sour-cream", name: "Sour cream", aliases: ["creme fraiche", "crème fraîche"], aisle: "dairy", priceKey: "sour-cream", typical: "1/2 cup" },
  { id: "cream-cheese", name: "Cream cheese", aliases: ["philadelphia"], aisle: "dairy", priceKey: "cream-cheese", typical: "4 oz" },
  { id: "yogurt", name: "Yogurt", aliases: ["greek yogurt", "yoghurt", "plain yogurt"], aisle: "dairy", priceKey: "yogurt", typical: "1 cup" },
  { id: "cheddar", name: "Cheddar cheese", aliases: ["cheddar", "sharp cheddar", "shredded cheese"], aisle: "dairy", priceKey: "cheese", typical: "1 cup shredded" },
  { id: "mozzarella", name: "Mozzarella", aliases: ["fresh mozzarella", "pizza cheese"], aisle: "dairy", priceKey: "cheese", typical: "1 cup shredded" },
  { id: "parmesan", name: "Parmesan", aliases: ["parmigiano", "pecorino", "grated parmesan"], aisle: "dairy", priceKey: "parmesan", typical: "1/2 cup grated" },
  { id: "feta", name: "Feta", aliases: ["feta cheese"], aisle: "dairy", priceKey: "cheese", typical: "1/2 cup crumbled" },
  { id: "cheese", name: "Cheese", aliases: ["monterey jack", "swiss cheese", "provolone", "gouda"], aisle: "dairy", priceKey: "cheese", typical: "1 cup shredded" },

  // ── Produce: vegetables ──────────────────────────────────────────
  { id: "onion", name: "Onion", aliases: ["onions", "yellow onion", "white onion", "red onion"], aisle: "produce", priceKey: "onion", staple: true, typical: "1 medium" },
  { id: "garlic", name: "Garlic", aliases: ["garlic cloves", "clove of garlic", "minced garlic"], aisle: "produce", priceKey: "garlic", staple: true, typical: "3 cloves" },
  { id: "green-onion", name: "Green onions", aliases: ["scallions", "spring onion", "scallion"], aisle: "produce", priceKey: "green-onion", typical: "3 stalks" },
  { id: "shallot", name: "Shallot", aliases: ["shallots"], aisle: "produce", priceKey: "onion", typical: "2" },
  { id: "tomato", name: "Tomatoes", aliases: ["tomato", "roma tomato", "cherry tomatoes", "grape tomatoes"], aisle: "produce", priceKey: "tomato", typical: "3 medium" },
  { id: "potato", name: "Potatoes", aliases: ["potato", "russet", "yukon gold", "red potatoes"], aisle: "produce", priceKey: "potato", typical: "4 medium" },
  { id: "sweet-potato", name: "Sweet potato", aliases: ["sweet potatoes", "yam", "yams"], aisle: "produce", priceKey: "sweet-potato", typical: "2 medium" },
  { id: "carrot", name: "Carrots", aliases: ["carrot", "baby carrots"], aisle: "produce", priceKey: "carrot", typical: "3" },
  { id: "celery", name: "Celery", aliases: ["celery stalks", "celery stick"], aisle: "produce", priceKey: "celery", typical: "2 stalks" },
  { id: "bell-pepper", name: "Bell pepper", aliases: ["bell peppers", "red pepper", "green pepper", "capsicum"], aisle: "produce", priceKey: "bell-pepper", typical: "2" },
  { id: "chili-pepper", name: "Chili pepper", aliases: ["jalapeno", "jalapeño", "serrano", "hot pepper"], aisle: "produce", priceKey: "bell-pepper", typical: "1" },
  { id: "broccoli", name: "Broccoli", aliases: ["broccoli florets", "broccolini"], aisle: "produce", priceKey: "broccoli", typical: "1 head" },
  { id: "cauliflower", name: "Cauliflower", aliases: ["cauliflower florets"], aisle: "produce", priceKey: "broccoli", typical: "1 head" },
  { id: "spinach", name: "Spinach", aliases: ["baby spinach"], aisle: "produce", priceKey: "spinach", typical: "4 cups" },
  { id: "kale", name: "Kale", aliases: ["chard", "swiss chard", "collard greens"], aisle: "produce", priceKey: "spinach", typical: "4 cups" },
  { id: "lettuce", name: "Lettuce", aliases: ["romaine", "iceberg", "salad greens", "mixed greens", "arugula"], aisle: "produce", priceKey: "lettuce", typical: "1 head" },
  { id: "cabbage", name: "Cabbage", aliases: ["green cabbage", "red cabbage", "napa cabbage", "slaw mix"], aisle: "produce", priceKey: "cabbage", typical: "1/2 head" },
  { id: "cucumber", name: "Cucumber", aliases: ["cucumbers", "english cucumber"], aisle: "produce", priceKey: "cucumber", typical: "1" },
  { id: "zucchini", name: "Zucchini", aliases: ["courgette", "summer squash", "yellow squash"], aisle: "produce", priceKey: "zucchini", typical: "2" },
  { id: "squash", name: "Squash", aliases: ["butternut squash", "acorn squash", "pumpkin"], aisle: "produce", priceKey: "zucchini", typical: "1 small" },
  { id: "mushroom", name: "Mushrooms", aliases: ["mushroom", "cremini", "button mushrooms", "portobello"], aisle: "produce", priceKey: "mushroom", typical: "8 oz" },
  { id: "corn", name: "Corn", aliases: ["sweet corn", "corn kernels", "corn on the cob"], aisle: "produce", priceKey: "corn", typical: "2 ears" },
  { id: "peas", name: "Peas", aliases: ["green peas", "snap peas", "snow peas"], aisle: "frozen", priceKey: "frozen", typical: "1 cup" },
  { id: "green-beans", name: "Green beans", aliases: ["string beans", "haricot vert"], aisle: "produce", priceKey: "green-beans", typical: "1 lb" },
  { id: "asparagus", name: "Asparagus", aliases: ["asparagus spears"], aisle: "produce", priceKey: "green-beans", typical: "1 bunch" },
  { id: "eggplant", name: "Eggplant", aliases: ["aubergine"], aisle: "produce", priceKey: "zucchini", typical: "1" },
  { id: "beet", name: "Beets", aliases: ["beet", "beetroot"], aisle: "produce", priceKey: "carrot", typical: "3" },
  { id: "brussels-sprouts", name: "Brussels sprouts", aliases: ["brussel sprouts"], aisle: "produce", priceKey: "broccoli", typical: "1 lb" },
  { id: "ginger", name: "Ginger", aliases: ["fresh ginger", "ginger root"], aisle: "produce", priceKey: "ginger", typical: "1 tbsp grated" },
  { id: "avocado", name: "Avocado", aliases: ["avocados"], aisle: "produce", priceKey: "avocado", typical: "1" },

  // ── Produce: fruit & herbs ───────────────────────────────────────
  { id: "lemon", name: "Lemon", aliases: ["lemons", "lemon juice", "lemon zest"], aisle: "produce", priceKey: "lemon", typical: "1" },
  { id: "lime", name: "Lime", aliases: ["limes", "lime juice"], aisle: "produce", priceKey: "lime", typical: "1" },
  { id: "orange", name: "Orange", aliases: ["oranges", "orange juice", "mandarin"], aisle: "produce", priceKey: "orange", typical: "1" },
  { id: "apple", name: "Apple", aliases: ["apples", "granny smith"], aisle: "produce", priceKey: "apple", typical: "2" },
  { id: "banana", name: "Banana", aliases: ["bananas"], aisle: "produce", priceKey: "banana", typical: "2" },
  { id: "berries", name: "Berries", aliases: ["strawberries", "blueberries", "raspberries", "blackberries"], aisle: "produce", priceKey: "berries", typical: "1 cup" },
  { id: "grapes", name: "Grapes", aliases: ["grape"], aisle: "produce", priceKey: "berries", typical: "1 cup" },
  { id: "pear", name: "Pear", aliases: ["pears", "peach", "peaches", "plum", "nectarine"], aisle: "produce", priceKey: "apple", typical: "2" },
  { id: "pineapple", name: "Pineapple", aliases: ["mango", "papaya"], aisle: "produce", priceKey: "apple", typical: "1 cup chunks" },
  { id: "parsley", name: "Parsley", aliases: ["flat leaf parsley", "fresh parsley"], aisle: "produce", priceKey: "herbs-fresh", typical: "1/4 cup chopped" },
  { id: "cilantro", name: "Cilantro", aliases: ["coriander leaves", "fresh coriander"], aisle: "produce", priceKey: "herbs-fresh", typical: "1/4 cup chopped" },
  { id: "basil", name: "Basil", aliases: ["fresh basil"], aisle: "produce", priceKey: "herbs-fresh", typical: "1/4 cup leaves" },
  { id: "mint", name: "Mint", aliases: ["fresh mint", "dill", "fresh dill", "chives"], aisle: "produce", priceKey: "herbs-fresh", typical: "2 tbsp chopped" },

  // ── Bakery & grains ──────────────────────────────────────────────
  { id: "bread", name: "Bread", aliases: ["sandwich bread", "sourdough", "baguette", "rolls", "buns", "toast"], aisle: "bakery", priceKey: "bread", typical: "4 slices" },
  { id: "tortilla", name: "Tortillas", aliases: ["tortilla", "flour tortillas", "corn tortillas", "pita", "naan", "wrap"], aisle: "bakery", priceKey: "tortilla", typical: "8" },
  { id: "pasta", name: "Pasta", aliases: ["spaghetti", "penne", "macaroni", "ziti", "linguine", "fettuccine", "rigatoni", "noodles", "lasagna noodles"], aisle: "pantry", priceKey: "pasta", typical: "12 oz" },
  { id: "rice", name: "Rice", aliases: ["white rice", "brown rice", "basmati", "jasmine rice", "arborio"], aisle: "pantry", priceKey: "rice", typical: "1 1/2 cups uncooked" },
  { id: "oats", name: "Oats", aliases: ["rolled oats", "oatmeal", "quinoa", "couscous", "barley", "farro"], aisle: "pantry", priceKey: "oats", typical: "1 cup" },
  { id: "flour", name: "Flour", aliases: ["all purpose flour", "plain flour", "bread flour"], aisle: "pantry", priceKey: "flour", staple: true, typical: "2 cups" },
  { id: "breadcrumbs", name: "Breadcrumbs", aliases: ["panko", "bread crumbs", "cornmeal"], aisle: "pantry", priceKey: "flour", typical: "1 cup" },

  // ── Pantry ───────────────────────────────────────────────────────
  { id: "olive-oil", name: "Olive oil", aliases: ["extra virgin olive oil", "evoo"], aisle: "pantry", priceKey: "olive-oil", staple: true, typical: "2 tbsp" },
  { id: "oil", name: "Cooking oil", aliases: ["vegetable oil", "canola oil", "neutral oil", "sesame oil", "shortening"], aisle: "pantry", priceKey: "oil", staple: true, typical: "2 tbsp" },
  { id: "salt", name: "Salt", aliases: ["kosher salt", "sea salt", "table salt"], aisle: "pantry", priceKey: "free", staple: true, typical: "to taste" },
  { id: "black-pepper", name: "Black pepper", aliases: ["pepper", "ground pepper", "cracked pepper"], aisle: "pantry", priceKey: "free", staple: true, typical: "to taste" },
  { id: "sugar", name: "Sugar", aliases: ["granulated sugar", "brown sugar", "powdered sugar", "caster sugar"], aisle: "pantry", priceKey: "sugar", staple: true, typical: "1/2 cup" },
  { id: "honey", name: "Honey", aliases: ["maple syrup", "molasses", "agave"], aisle: "pantry", priceKey: "honey", typical: "2 tbsp" },
  { id: "broth", name: "Broth", aliases: ["chicken broth", "beef broth", "vegetable broth", "stock", "bouillon"], aisle: "pantry", priceKey: "broth", typical: "2 cups" },
  { id: "canned-tomato", name: "Canned tomatoes", aliases: ["crushed tomatoes", "diced tomatoes", "tomato sauce", "marinara", "passata"], aisle: "pantry", priceKey: "canned-tomato", typical: "1 can (28 oz)" },
  { id: "tomato-paste", name: "Tomato paste", aliases: ["tomato purée", "tomato puree"], aisle: "pantry", priceKey: "tomato-paste", typical: "2 tbsp" },
  { id: "beans", name: "Beans", aliases: ["black beans", "kidney beans", "white beans", "cannellini", "pinto beans", "chickpeas", "garbanzo"], aisle: "pantry", priceKey: "beans", typical: "1 can (15 oz)" },
  { id: "lentils", name: "Lentils", aliases: ["red lentils", "green lentils", "split peas"], aisle: "pantry", priceKey: "beans", typical: "1 cup" },
  { id: "coconut-milk", name: "Coconut milk", aliases: ["coconut cream"], aisle: "pantry", priceKey: "coconut-milk", typical: "1 can (14 oz)" },
  { id: "soy-sauce", name: "Soy sauce", aliases: ["tamari", "shoyu"], aisle: "pantry", priceKey: "condiment-savory", typical: "2 tbsp" },
  { id: "vinegar", name: "Vinegar", aliases: ["white vinegar", "apple cider vinegar", "balsamic", "rice vinegar", "red wine vinegar"], aisle: "pantry", priceKey: "condiment-savory", staple: true, typical: "1 tbsp" },
  { id: "hot-sauce", name: "Hot sauce", aliases: ["sriracha", "tabasco", "chili sauce", "salsa"], aisle: "pantry", priceKey: "condiment-savory", typical: "1 tbsp" },
  { id: "fish-sauce", name: "Fish sauce", aliases: ["worcestershire", "oyster sauce"], aisle: "pantry", priceKey: "condiment-savory", typical: "1 tbsp" },
  { id: "mustard", name: "Mustard", aliases: ["dijon", "yellow mustard", "whole grain mustard"], aisle: "pantry", priceKey: "mayo", typical: "1 tbsp" },
  { id: "mayo", name: "Mayonnaise", aliases: ["mayo", "aioli"], aisle: "pantry", priceKey: "mayo", typical: "1/4 cup" },
  { id: "ketchup", name: "Ketchup", aliases: ["bbq sauce", "barbecue sauce", "teriyaki sauce"], aisle: "pantry", priceKey: "mayo", typical: "2 tbsp" },
  { id: "peanut-butter", name: "Peanut butter", aliases: ["nut butter", "tahini", "almond butter"], aisle: "pantry", priceKey: "peanut-butter", typical: "2 tbsp" },
  { id: "nuts", name: "Nuts", aliases: ["almonds", "walnuts", "pecans", "cashews", "pine nuts", "peanuts"], aisle: "pantry", priceKey: "nuts", typical: "1/2 cup" },
  { id: "chocolate", name: "Chocolate", aliases: ["chocolate chips", "cocoa powder", "dark chocolate"], aisle: "pantry", priceKey: "chocolate", typical: "1 cup" },
  { id: "vanilla", name: "Vanilla extract", aliases: ["vanilla", "almond extract"], aisle: "pantry", priceKey: "vanilla", staple: true, typical: "1 tsp" },
  { id: "baking-powder", name: "Baking powder", aliases: ["baking soda", "yeast", "cornstarch", "gelatin"], aisle: "pantry", priceKey: "leaveners", staple: true, typical: "1 tsp" },
  { id: "spices", name: "Spices", aliases: ["paprika", "cumin", "oregano", "thyme", "rosemary", "cinnamon", "chili powder", "curry powder", "turmeric", "bay leaf", "red pepper flakes", "italian seasoning", "seasoning", "garlic powder", "onion powder", "nutmeg"], aisle: "pantry", priceKey: "spices", staple: true, typical: "1 tsp" },

  // ── Frozen & other ───────────────────────────────────────────────
  { id: "frozen-vegetables", name: "Frozen vegetables", aliases: ["frozen veggies", "frozen peas", "frozen corn", "frozen broccoli", "mixed vegetables"], aisle: "frozen", priceKey: "frozen", typical: "2 cups" },
  { id: "frozen-fruit", name: "Frozen fruit", aliases: ["frozen berries", "frozen mango"], aisle: "frozen", priceKey: "frozen", typical: "1 cup" },
  { id: "tofu", name: "Tofu", aliases: ["firm tofu", "tempeh"], aisle: "dairy", priceKey: "beans", typical: "14 oz block" },
  { id: "wine", name: "Wine", aliases: ["white wine", "red wine", "cooking wine"], aisle: "other", priceKey: "condiment-savory", typical: "1/2 cup" },
];

/** Words that only describe amount or preparation, never the ingredient. */
const NOISE =
  /\b(cup|cups|tbsp|tbsps|tsp|tsps|teaspoons?|tablespoons?|ounces?|oz|pounds?|lbs?|lb|grams?|g|kg|ml|liters?|l|large|small|medium|fresh|freshly|chopped|diced|sliced|minced|grated|shredded|crumbled|halved|quartered|softened|melted|drained|rinsed|cooked|raw|ripe|very|whole|about|plus|optional|to|taste|of|or|and|a|an|the|your|you|already|have|any|each|can|cans|jar|jars|package|packages|box|pinch|handful|inch|thick|thin|for|serving|garnish|leftover|leftovers|use|first)\b/gi;

function clean(text: string): string {
  return text
    .toLowerCase()
    .replace(/^use first:\s*/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function coreWords(text: string): string[] {
  return clean(text)
    .replace(NOISE, " ")
    .split(/\s+/)
    .map((w) => w.replace(/ies$/, "y").replace(/([a-z]{4,})s$/, "$1"))
    .filter((w) => w.length > 2);
}

/** id -> ingredient */
const BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));

/** Every searchable phrase, longest first so "chicken breast" beats "chicken". */
const PHRASES: Array<{ phrase: string; ingredient: Ingredient }> = INGREDIENTS
  .flatMap((ingredient) =>
    [ingredient.name, ...ingredient.aliases].map((p) => ({ phrase: clean(p), ingredient })),
  )
  .sort((a, b) => b.phrase.length - a.phrase.length);

export function ingredientById(id: string): Ingredient | undefined {
  return BY_ID.get(id);
}

/**
 * Resolve any free-text line ("2 cups shredded sharp cheddar") to the real
 * ingredient behind it. Returns undefined when nothing in the database fits.
 */
export function resolveIngredient(line: string): Ingredient | undefined {
  const text = clean(line);
  if (!text) return undefined;

  for (const { phrase, ingredient } of PHRASES) {
    if (!phrase) continue;
    if (text === phrase) return ingredient;
    if (new RegExp(`(^|\\s)${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(s|es)?(\\s|$)`).test(text)) {
      return ingredient;
    }
  }

  // Fall back to a single-word core match ("tomatoes," "cheddar!").
  const words = coreWords(text);
  for (const { phrase, ingredient } of PHRASES) {
    if (phrase.includes(" ")) continue;
    if (words.includes(phrase) || words.some((w) => w.startsWith(phrase) && phrase.length > 3)) {
      return ingredient;
    }
  }
  return undefined;
}

/** Canonical ids for everything the user has. */
export function resolveAll(lines: string[]): Set<string> {
  const ids = new Set<string>();
  for (const line of lines) {
    // A scan line can carry two things: "peppers and onions".
    for (const part of line.split(/,| and | with |\//i)) {
      const hit = resolveIngredient(part);
      if (hit) ids.add(hit.id);
    }
  }
  return ids;
}

/** True when this line names something every kitchen already has. */
export function isStapleLine(line: string): boolean {
  const hit = resolveIngredient(line);
  return hit?.staple === true;
}

const HAS_AMOUNT = /(^|\s)(\d|½|¼|¾|⅓|⅔|a |an |one |two |three |four |half|to taste|pinch|handful)/i;

/**
 * Turn a loose AI ingredient line into a real, cookable line: the canonical
 * ingredient name plus an amount, so a suggestion is never just "cheese".
 */
export function displayIngredientLine(line: string): string {
  const raw = line.trim().replace(/^[-•·*]\s*/, "");
  if (!raw) return raw;
  const hit = resolveIngredient(raw);
  if (!hit) return raw;
  if (HAS_AMOUNT.test(raw)) return raw;
  return `${hit.typical} ${hit.name.toLowerCase()}`;
}

/** Aisle for a free-text line, from the ingredient database when we know it. */
export function aisleForLine(line: string): Aisle | undefined {
  return resolveIngredient(line)?.aisle;
}

/** Price key for a free-text line, from the ingredient database. */
export function priceKeyForLine(line: string): string | undefined {
  const key = resolveIngredient(line)?.priceKey;
  return key === "free" ? undefined : key;
}

export const INGREDIENT_COUNT = INGREDIENTS.length;
