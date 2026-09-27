/**
 * A real food photo for every recipe card, chosen from the recipe's own words.
 * Photos live in /public/recipe-photos so they have a stable absolute URL that
 * iOS share sheets, Messages, Mail and social previews can load.
 */

const SITE = "https://thefridgeandcupboard.com";

type Photo = { file: string; match: RegExp };

const PHOTOS: Photo[] = [
  { file: "pasta.jpg", match: /pasta|spaghetti|noodle|lasagn|penne|macaroni|marinara|ziti|linguine/i },
  { file: "soup.jpg", match: /soup|stew|chili|broth|chowder|bisque|ramen|pho|curry/i },
  { file: "roasted.jpg", match: /roast|bake|sheet ?pan|vegetab|veggie|potato|salad|bowl|grain/i },
  { file: "skillet.jpg", match: /skillet|pan|saut|fry|chicken|beef|pork|steak|shrimp|fish|taco|stir/i },
];

const FALLBACK = "roasted.jpg";

/** Dishes with their own real photo in /public/recipe-photos. */
const DISH_PHOTOS = new Set<string>([
  "apple-pie",
  "baked-potatoes",
  "baked-salmon",
  "baked-ziti",
  "banana-bread",
  "beef-and-broccoli",
  "beef-stew",
  "black-bean-soup",
  "breakfast-burrito",
  "brownies",
  "cabbage-stir-fry",
  "cheese-omelette",
  "chicken-caesar-wrap",
  "chicken-noodle-soup",
  "chicken-tacos",
  "chickpea-curry",
  "chili",
  "chocolate-chip-cookies",
  "creamy-tomato-pasta",
  "egg-fried-noodles",
  "french-toast",
  "fried-rice",
  "garlic-butter-shrimp",
  "greek-salad",
  "grilled-cheese",
  "honey-garlic-chicken-thighs",
  "lentil-soup",
  "mac-and-cheese",
  "mashed-potatoes",
  "minestrone",
  "pancakes",
  "pasta-primavera",
  "peach-cobbler",
  "pork-chops-with-apples",
  "potato-leek-soup",
  "quesadilla",
  "rice-pudding",
  "roast-chicken",
  "roast-turkey",
  "roasted-potato-and-egg-hash",
  "roasted-vegetables",
  "salmon-patties",
  "sausage-and-peppers",
  "sheet-pan-chicken-and-vegetables",
  "shepherds-pie",
  "shrimp-scampi",
  "spaghetti-bolognese",
  "stuffed-bell-peppers",
  "tomato-soup",
  "tuna-casserole",
  "tuna-melt",
  "turkey-meatballs",
  "vegetable-stir-fry",
  "yogurt-berry-parfait",
  "zucchini-fritters",
]);

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Path served by the app, e.g. "/recipe-photos/pasta.jpg". */
export function recipePhotoPath(title: string, description?: string): string {
  const slug = slugify(title);
  if (DISH_PHOTOS.has(slug)) return `/recipe-photos/${slug}.jpg`;
  const hay = `${title} ${description ?? ""}`;
  const hit = PHOTOS.find((p) => p.match.test(hay));
  return `/recipe-photos/${hit?.file ?? FALLBACK}`;
}

/** Absolute https URL — required for share sheets and social previews. */
export function recipePhotoUrl(title: string, description?: string): string {
  return `${SITE}${recipePhotoPath(title, description)}`;
}
