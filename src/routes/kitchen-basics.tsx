import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChefHat, Play, BookOpen, Hand, Slice, Shield, Egg, Snowflake, Trash2, Archive, Recycle, Flame, Thermometer } from "lucide-react";

export const Route = createFileRoute("/kitchen-basics")({
  head: () => ({
    meta: [
      { title: "Chef Super J Kitchen Basics — Knife Skills & Cooking Fundamentals" },
      { name: "description", content: "Beginner-friendly kitchen lessons from Chef Super J: knife skills, onion cutting, garlic mincing, knife safety, food storage, pantry basics, and leftover safety." },
      { property: "og:title", content: "Chef Super J Kitchen Basics" },
      { property: "og:description", content: "Watch · Learn · Practice. The kitchen fundamentals every home cook should know." },
    ],
  }),
  component: KitchenBasicsPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="text-destructive">{error.message}</p>
      <button onClick={reset} className="mt-4 underline">Try again</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">Lesson not found.</div>,
});

type Lesson = {
  id: string;
  icon: typeof Slice;
  title: string;
  watch: string;
  learn: string[];
  practice: string;
};

const LESSONS: { section: string; items: Lesson[] }[] = [
  {
    section: "Knife Skills",
    items: [
      {
        id: "hold-knife",
        icon: Hand,
        title: "How to hold a knife safely",
        watch: "Pinch the blade between thumb and forefinger right where it meets the handle. Wrap the other three fingers around the handle.",
        learn: [
          "Grip the blade, not the handle, for control.",
          "Use your other hand as a 'claw' — knuckles forward, fingertips tucked under.",
          "The blade should always touch your knuckles, never your fingertips.",
          "Cut on a flat, stable board — never in your hand.",
        ],
        practice: "Slice a cucumber into 10 even rounds using the claw grip. No rush — accuracy first.",
      },
      {
        id: "cut-onion",
        icon: Slice,
        title: "How to cut an onion",
        watch: "Cut in half through the root. Peel. Lay flat. Make horizontal cuts toward (but not through) the root, then vertical cuts, then slice across.",
        learn: [
          "Leave the root on — it holds the onion together and reduces tears.",
          "A sharp knife = fewer tears (less cell crushing).",
          "Chill the onion 10 minutes before cutting to slow the gas.",
          "Breathe through your mouth, not your nose.",
        ],
        practice: "Dice one yellow onion into even ¼-inch pieces in under 2 minutes.",
      },
      {
        id: "mince-garlic",
        icon: Slice,
        title: "How to mince garlic",
        watch: "Smash the clove with the flat of the knife to loosen the skin. Peel. Slice thin, then chop side-to-side until fine.",
        learn: [
          "Smashing the clove releases more flavor than slicing.",
          "Sprinkle a pinch of salt on the pile — it grips the knife and grinds it finer.",
          "Pre-minced jarred garlic loses 80% of the flavor. Fresh always wins.",
          "Mince it last — flavor fades within 15 minutes of cutting.",
        ],
        practice: "Mince 3 cloves into a paste using the salt trick. Smell the difference.",
      },
      {
        id: "sharpen-hone",
        icon: Slice,
        title: "How to sharpen or hone a knife",
        watch: "Honing realigns the edge (use a steel rod weekly). Sharpening removes metal to make a new edge (whetstone or pro service, 2–3× a year).",
        learn: [
          "A dull knife is the most dangerous tool in your kitchen — it slips.",
          "Hold the blade at a 15–20° angle to the steel/stone.",
          "Hone before every cooking session, sharpen seasonally.",
          "Never put a good knife in the dishwasher.",
        ],
        practice: "Hone your chef's knife with 8 strokes per side, then slice a tomato cleanly without crushing it.",
      },
      {
        id: "board-safety",
        icon: Shield,
        title: "Cutting board safety",
        watch: "Place a damp paper towel under the board so it doesn't slide. Use separate boards for raw meat and produce.",
        learn: [
          "Wood/plastic only — glass and stone dull knives instantly.",
          "Color-code: green for veg, red for raw meat.",
          "Wash plastic boards in hot soapy water; oil wood boards monthly.",
          "Replace boards with deep cut grooves — bacteria hides there.",
        ],
        practice: "Set up your station with the damp-towel trick before your next prep.",
      },
    ],
  },
  {
    section: "Kitchen Basics",
    items: [
      {
        id: "cooking-terms",
        icon: BookOpen,
        title: "Basic cooking terms",
        watch: "The 10 words you'll see in every recipe.",
        learn: [
          "Sauté — cook fast in a little hot fat, stirring.",
          "Sear — high heat to brown the surface.",
          "Simmer — small bubbles, not a rolling boil.",
          "Deglaze — add liquid to a hot pan to lift the brown bits.",
          "Reduce — boil a liquid until it thickens.",
          "Fold — gently combine without deflating.",
          "Mince — chop very fine. Dice — small cubes. Julienne — matchsticks.",
          "Rest — let cooked meat sit before cutting so juices stay in.",
        ],
        practice: "Read one recipe tonight and circle every term you recognize.",
      },
      {
        id: "kitchen-safety",
        icon: Flame,
        title: "Kitchen safety",
        watch: "Heat, knives, and slippery floors cause 90% of home kitchen accidents. Prevent all three.",
        learn: [
          "Pan handles always turn IN, never sticking out over the floor.",
          "Wipe spills immediately — even water.",
          "Keep a box of baking soda near the stove (smothers grease fires). NEVER water on grease.",
          "Tie back long hair, roll up loose sleeves.",
          "Carry knives pointed DOWN, blade away from you.",
        ],
        practice: "Walk your kitchen and find your fire extinguisher (or baking soda). If you don't have one, get one this week.",
      },
      {
        id: "egg-spin",
        icon: Egg,
        title: "Egg spin test (raw or cooked?)",
        watch: "Spin the egg on a flat counter. Cooked = spins smoothly. Raw = wobbles and stops fast.",
        learn: [
          "Raw eggs have liquid inside that resists spinning.",
          "For freshness: float test — fresh sinks, old floats (gas builds up).",
          "Eggs last 3–5 weeks in the fridge past the carton date if refrigerated.",
          "Store eggs in the carton, not the door — temperature swings shorten life.",
        ],
        practice: "Spin every egg in your fridge today. Toss any that float in water.",
      },
    ],
  },
  {
    section: "Food Storage & Safety",
    items: [
      {
        id: "storage-basics",
        icon: Snowflake,
        title: "Food storage basics",
        watch: "Where things actually belong in your fridge.",
        learn: [
          "Top shelf: leftovers, drinks, ready-to-eat foods.",
          "Middle: dairy and eggs (most stable temperature).",
          "Bottom shelf: raw meat, poultry, fish — always sealed, on a tray to catch drips.",
          "Crisper drawers: produce. High-humidity for greens, low-humidity for fruit.",
          "Door: condiments only — too warm for milk or eggs.",
        ],
        practice: "Reorganize your fridge tonight using these zones. It takes 10 minutes and saves $40/month.",
      },
      {
        id: "when-in-doubt",
        icon: Trash2,
        title: "When in doubt, throw it out",
        watch: "Your nose is good. Your eyes are better. Time is the truth.",
        learn: [
          "Cooked leftovers: 3–4 days max in the fridge.",
          "Raw chicken/fish: 1–2 days. Raw beef: 3–5 days.",
          "Smells off, looks slimy, fuzzy mold = gone. No tasting.",
          "Re-heating doesn't kill all toxins — some bacteria leave behind heat-stable poisons.",
          "Date everything with masking tape and a marker.",
        ],
        practice: "Label every container in your fridge with the date you opened or cooked it.",
      },
      {
        id: "pantry-basics",
        icon: Archive,
        title: "Pantry basics",
        watch: "The 20 ingredients that make 1,000 meals.",
        learn: [
          "Oils: olive oil, neutral oil (avocado/canola).",
          "Acids: vinegar, lemon, soy sauce.",
          "Salt: kosher salt for cooking, flaky salt for finishing.",
          "Aromatics: onion, garlic, ginger.",
          "Pantry carbs: rice, pasta, dry beans, oats.",
          "Canned: tomatoes, beans, tuna, coconut milk.",
          "Spices: black pepper, paprika, cumin, oregano, chili flakes, cinnamon.",
        ],
        practice: "Audit your pantry. Restock the 7 missing essentials this week.",
      },
      {
        id: "leftovers-safe",
        icon: Recycle,
        title: "How to use leftovers safely",
        watch: "Cool fast. Store flat. Reheat hot.",
        learn: [
          "Cool leftovers within 2 hours of cooking (1 hour if it's hot outside).",
          "Store in shallow containers — they cool faster than deep ones.",
          "Reheat to 165°F / 74°C all the way through. Steaming hot, not warm.",
          "Rice is the riskiest leftover — refrigerate within 1 hour, eat within 1 day.",
          "Don't reheat the same dish more than once.",
        ],
        practice: "Use the Leftovers Rescue tool to turn tonight's extras into tomorrow's meal.",
      },
    ],
  },
];

function KitchenBasicsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-border transition hover:bg-background"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-2xl bg-primary/15 p-3 ring-1 ring-primary/30">
              <ChefHat className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl leading-tight sm:text-4xl">
                Chef Super J Kitchen Basics
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Watch · Learn · Practice. The fundamentals every home cook should know — short, simple, no fluff.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        {LESSONS.map((group) => (
          <section key={group.section}>
            <h2 className="font-display text-xl mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {group.section}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((lesson) => {
                const Icon = lesson.icon;
                return (
                  <article
                    key={lesson.id}
                    className="rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-accent/15 p-2 ring-1 ring-accent/30 shrink-0">
                        <Icon className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <h3 className="font-display text-lg leading-tight">{lesson.title}</h3>
                    </div>

                    <div className="mt-3 space-y-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                          <Play className="h-3 w-3" /> Watch
                        </div>
                        <p className="mt-1 text-foreground/90">{lesson.watch}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent-foreground">
                          <BookOpen className="h-3 w-3" /> Learn
                        </div>
                        <ul className="mt-1 list-disc pl-5 space-y-1 text-foreground/90">
                          {lesson.learn.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-success">
                          <Thermometer className="h-3 w-3" /> Practice
                        </div>
                        <p className="mt-1 text-foreground/90">{lesson.practice}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-accent/10 p-5 text-center">
          <p className="font-display text-lg">Ready for more?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Chef Super J has full video lessons, voice coaching, and personalized practice plans on the Premium plan.
          </p>
          <Link
            to="/pro"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow transition hover:opacity-90"
          >
            See Plans
          </Link>
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
