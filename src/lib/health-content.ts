export type HealthCategory = {
  slug: string;
  title: string;
  tagline: string;
  emoji: string;
  why: string;
  staples: string[];
  meals: { name: string; note: string }[];
  aiPrompt: string;
};

export const HEALTH_CATEGORIES: HealthCategory[] = [
  {
    slug: "alkaline",
    title: "pH Balance & Alkaline",
    emoji: "🥬",
    tagline: "Cool the system. Calm the gut.",
    why: "Leafy greens, cucumbers, lemons, and root veg help your body trend alkaline. Pair with hydration.",
    staples: ["Spinach", "Kale", "Cucumber", "Lemon", "Celery", "Avocado", "Sweet potato", "Almonds"],
    meals: [
      { name: "Green lemon bowl", note: "Spinach, cucumber, avocado, lemon-olive oil, sea salt." },
      { name: "Sweet potato + greens", note: "Roasted sweet potato over wilted kale with almonds." },
      { name: "Cucumber-mint cooler", note: "Cucumber, mint, lemon, sparkling water." },
    ],
    aiPrompt: "Give me one alkaline / pH-balancing dinner I can make in 30 minutes from common pantry items. Focus on leafy greens, cucumbers, lemons, avocado, sweet potato.",
  },
  {
    slug: "anti-inflammatory",
    title: "Anti-Inflammatory",
    emoji: "🫐",
    tagline: "Calm joints. Quiet swelling.",
    why: "Omega-3s, berries, turmeric, ginger, olive oil, leafy greens. The Mediterranean playbook.",
    staples: ["Salmon", "Olive oil", "Turmeric", "Ginger", "Berries", "Walnuts", "Garlic", "Greens"],
    meals: [
      { name: "Turmeric salmon", note: "Salmon brushed with turmeric, ginger, olive oil. 12 min at 400°F." },
      { name: "Berry-walnut yogurt", note: "Greek yogurt, mixed berries, walnuts, honey." },
      { name: "Ginger-garlic greens", note: "Sautéed kale or spinach with garlic and fresh ginger." },
    ],
    aiPrompt: "Give me one anti-inflammatory dinner using salmon, olive oil, turmeric, ginger, garlic, or leafy greens. Mediterranean style.",
  },
  {
    slug: "brain",
    title: "Brain Health",
    emoji: "🧠",
    tagline: "Fuel focus and memory.",
    why: "Fatty fish, eggs, blueberries, walnuts, dark leafy greens, olive oil. Chef Justin's personal protocol.",
    staples: ["Eggs", "Salmon", "Blueberries", "Walnuts", "Spinach", "Dark chocolate", "Olive oil", "Avocado"],
    meals: [
      { name: "Brain breakfast", note: "Two eggs, avocado, spinach, side of blueberries." },
      { name: "Walnut-blueberry oats", note: "Steel-cut oats, walnuts, blueberries, drizzle of honey." },
      { name: "Sardines on toast", note: "Sardines, lemon, olive oil, parsley on whole-grain toast." },
    ],
    aiPrompt: "Give me one brain-health meal using eggs, salmon, sardines, blueberries, walnuts, or leafy greens. Practical home-cook recipe.",
  },
  {
    slug: "cancer-support",
    title: "Cancer-Support Friendly",
    emoji: "💚",
    tagline: "Gentle, nutrient-dense, easy on the system.",
    why: "Soft proteins, broths, cruciferous veg, ginger for nausea, bland-but-rich flavors. Always pair with your medical team's guidance.",
    staples: ["Bone broth", "Chicken", "Ginger", "Broccoli", "Sweet potato", "Eggs", "Oats", "Bananas"],
    meals: [
      { name: "Healing chicken broth", note: "Bone broth, shredded chicken, ginger, soft carrot." },
      { name: "Steamed broccoli + soft egg", note: "Lightly steamed broccoli, soft-boiled egg, sea salt." },
      { name: "Banana-oat porridge", note: "Oats cooked in milk with mashed banana and cinnamon." },
    ],
    aiPrompt: "Give me one gentle, nutrient-dense meal appropriate for someone in cancer treatment — soft texture, mild flavor, easy on the stomach, with ginger or bone broth if possible.",
  },
  {
    slug: "elderly",
    title: "Elderly-Friendly",
    emoji: "🧓",
    tagline: "Soft, warm, easy to chew.",
    why: "Soft proteins, slow-cooked veg, hearty broths, smooth textures. Big on flavor without big on chewing.",
    staples: ["Eggs", "Ground turkey", "Mashed potato", "Soft-cooked carrots", "Pasta", "Yogurt", "Bananas", "Fish"],
    meals: [
      { name: "Shepherd-style bowl", note: "Ground turkey, peas, carrots, topped with mashed potato." },
      { name: "Soft pasta with butter & herbs", note: "Small pasta shape, butter, parmesan, fresh parsley." },
      { name: "Banana yogurt cup", note: "Greek yogurt, sliced banana, honey, soft granola." },
    ],
    aiPrompt: "Give me one easy-to-chew, soft-texture, nutrient-rich dinner for an elderly family member. No hard crusts. Warm and comforting.",
  },
  {
    slug: "workout",
    title: "Workout Fuel",
    emoji: "🏋️",
    tagline: "Train hard. Recover harder.",
    why: "Slow carbs pre-workout. Protein + fast carbs post-workout. Hydration always.",
    staples: ["Chicken breast", "Rice", "Sweet potato", "Eggs", "Greek yogurt", "Bananas", "Oats", "Peanut butter"],
    meals: [
      { name: "Pre-workout oats", note: "Oats, banana, peanut butter, honey. 45 min before training." },
      { name: "Post-workout chicken bowl", note: "Chicken, white rice, broccoli, soy-honey glaze." },
      { name: "Recovery yogurt", note: "Greek yogurt, berries, granola, drizzle of honey." },
    ],
    aiPrompt: "Give me one post-workout meal with at least 30g protein and quality carbs, using chicken, rice, sweet potato, eggs, or yogurt.",
  },
  {
    slug: "high-protein",
    title: "High Protein",
    emoji: "🥩",
    tagline: "Build, repair, stay full.",
    why: "Aim for 30g+ protein per meal. Lean meats, eggs, dairy, legumes.",
    staples: ["Chicken", "Steak", "Eggs", "Greek yogurt", "Cottage cheese", "Lentils", "Tuna", "Beans"],
    meals: [
      { name: "Steak + eggs", note: "Sirloin, two eggs over easy, sautéed spinach. ~50g protein." },
      { name: "Tuna power bowl", note: "Tuna, white beans, olive oil, lemon, parsley. ~40g protein." },
      { name: "Cottage cheese plate", note: "Cottage cheese, sliced tomato, everything seasoning, toast." },
    ],
    aiPrompt: "Give me one high-protein dinner (30g+ protein) using chicken, steak, eggs, tuna, or legumes.",
  },
  {
    slug: "low-carb",
    title: "Low Carb",
    emoji: "🥑",
    tagline: "Stable energy. No crashes.",
    why: "Protein, healthy fats, fibrous veg. Skip the rice, pasta, bread.",
    staples: ["Chicken", "Eggs", "Avocado", "Broccoli", "Zucchini", "Cheese", "Olive oil", "Spinach"],
    meals: [
      { name: "Zucchini noodle stir-fry", note: "Zucchini noodles, chicken, garlic, olive oil, parmesan." },
      { name: "Egg and avocado bowl", note: "Two eggs, half avocado, sautéed spinach, hot sauce." },
      { name: "Bunless burger", note: "Beef patty, melted cheese, lettuce wrap, pickles." },
    ],
    aiPrompt: "Give me one low-carb dinner (under 20g net carbs) using chicken, eggs, fibrous veg, or healthy fats.",
  },
  {
    slug: "keto",
    title: "Keto",
    emoji: "🥓",
    tagline: "Fat first. Sugar last.",
    why: "70% fat, 25% protein, 5% carbs. Berries are the only fruit; greens are the only veg by volume.",
    staples: ["Bacon", "Eggs", "Avocado", "Cheese", "Butter", "Salmon", "Cauliflower", "Spinach"],
    meals: [
      { name: "Bacon-egg cups", note: "Bacon-lined muffin tin, crack egg, bake 15 min at 375°F." },
      { name: "Salmon + cauliflower mash", note: "Pan-seared salmon, cauliflower mashed with butter and cream." },
      { name: "Avocado-tuna boats", note: "Halved avocado, tuna mixed with mayo, lemon, dill." },
    ],
    aiPrompt: "Give me one keto dinner (under 10g net carbs) high in healthy fats, using bacon, salmon, eggs, cheese, or avocado.",
  },
  {
    slug: "vegan",
    title: "Vegan",
    emoji: "🌱",
    tagline: "Plant-powered, flavor-loaded.",
    why: "Beans, lentils, tofu, whole grains, nuts. Season aggressively — plants need it.",
    staples: ["Lentils", "Chickpeas", "Tofu", "Quinoa", "Tahini", "Olive oil", "Nutritional yeast", "Garlic"],
    meals: [
      { name: "Chickpea-tahini bowl", note: "Roasted chickpeas, quinoa, greens, tahini-lemon drizzle." },
      { name: "Lentil dal", note: "Red lentils, onion, garlic, ginger, turmeric, coconut milk." },
      { name: "Crispy tofu stir-fry", note: "Pressed tofu, broccoli, soy-ginger glaze over rice." },
    ],
    aiPrompt: "Give me one filling vegan dinner with 20g+ plant protein using lentils, chickpeas, tofu, or tempeh.",
  },
  {
    slug: "diabetic",
    title: "Diabetic-Friendly",
    emoji: "🩺",
    tagline: "Steady glucose. Real flavor.",
    why: "Low glycemic carbs, fiber, protein at every meal. Avoid added sugar and refined flour.",
    staples: ["Chicken", "Salmon", "Eggs", "Beans", "Berries", "Greens", "Olive oil", "Whole grain"],
    meals: [
      { name: "Lemon-herb chicken + greens", note: "Chicken thighs, lemon, garlic, olive oil over arugula." },
      { name: "Bean and veggie chili", note: "Black beans, tomato, peppers, onion, cumin. Low GI." },
      { name: "Berry yogurt parfait", note: "Plain Greek yogurt, berries, chia seeds. No added sugar." },
    ],
    aiPrompt: "Give me one diabetic-friendly dinner: low glycemic load, fiber + protein at every meal, no added sugar.",
  },
];
