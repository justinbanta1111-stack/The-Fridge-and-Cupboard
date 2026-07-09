// Client-side social/community layer (Batch E).
// All data is local — opt-in, private by default. Designed to demo social
// feel without forcing a real backend.

const K = {
  challenges: "fc.social.challenges.v1",
  swap: "fc.social.swap.v1",
  groups: "fc.social.groups.v1",
  meals: "fc.social.groupmeals.v1",
  wins: "fc.social.wins.v1",
  privacy: "fc.social.privacy.v1",
  sponsor: "fc.social.sponsor.v1",
  location: "fc.social.location.v1",
} as const;

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fb; } catch { return fb; }
}
function write<T>(k: string, v: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

// ===== Challenges =====
export type Challenge = {
  id: string;
  title: string;
  goal: string;
  joined: boolean;
  progress: number;
  target: number;
  joinedAt?: number;
};

const DEFAULT_CHALLENGES: Challenge[] = [
  { id: "no-shop-3", title: "No shopping for 3 days", goal: "Cook only from what you have", joined: false, progress: 0, target: 3 },
  { id: "use-3-leftovers", title: "Use 3 leftovers this week", goal: "Rescue forgotten food", joined: false, progress: 0, target: 3 },
  { id: "waste-under-5", title: "Waste less than $5 this week", goal: "Track waste, save money", joined: false, progress: 0, target: 1 },
  { id: "pantry-5-meals", title: "Make 5 meals from your pantry", goal: "Get creative", joined: false, progress: 0, target: 5 },
];

export function getChallenges(): Challenge[] {
  const stored = read<Challenge[]>(K.challenges, []);
  // merge defaults if missing
  const map = new Map(stored.map((c) => [c.id, c]));
  for (const d of DEFAULT_CHALLENGES) if (!map.has(d.id)) map.set(d.id, d);
  const merged = Array.from(map.values());
  if (merged.length !== stored.length) write(K.challenges, merged);
  return merged;
}
export function updateChallenge(id: string, patch: Partial<Challenge>) {
  const list = getChallenges().map((c) => c.id === id ? { ...c, ...patch } : c);
  write(K.challenges, list);
  return list;
}

// ===== Recipe Swap =====
export type SwapRecipe = {
  id: string;
  title: string;
  author: string;
  category: "family" | "leftover" | "kid" | "church" | "health";
  body: string;
  hearts: number;
  createdAt: number;
};

const SEED_SWAP: SwapRecipe[] = [
  { id: "s1", title: "Grandma's Sunday Pot Roast", author: "Ellie M.", category: "family", body: "Beef chuck, carrots, onion, broth — slow cook 6 hours. Tradition since 1971.", hearts: 42, createdAt: Date.now() - 86400_000 * 3 },
  { id: "s2", title: "Leftover Chicken Tacos", author: "Sarah R.", category: "leftover", body: "Shred chicken, warm with cumin + lime. Top with cheese, salsa, sour cream.", hearts: 88, createdAt: Date.now() - 86400_000 * 1 },
  { id: "s3", title: "Pizza Quesadillas (Kids LOVE)", author: "Mike T.", category: "kid", body: "Tortilla, sauce, mozzarella, pepperoni — griddle 2 min/side.", hearts: 57, createdAt: Date.now() - 86400_000 * 2 },
  { id: "s4", title: "Church Potluck Mac & Cheese", author: "Pastor J.", category: "church", body: "Feeds 24. 2 lb elbow, 1 lb cheddar, 1 lb jack, milk, butter, flour. Bake covered.", hearts: 31, createdAt: Date.now() - 86400_000 * 5 },
  { id: "s5", title: "Cancer Support: Easy Lemon Rice Soup", author: "Anna K.", category: "health", body: "Mild, soothing, easy to swallow. Broth, rice, lemon, parsley. 20 min.", hearts: 64, createdAt: Date.now() - 86400_000 * 4 },
];

export function getSwapRecipes(): SwapRecipe[] {
  const list = read<SwapRecipe[]>(K.swap, []);
  if (list.length === 0) { write(K.swap, SEED_SWAP); return SEED_SWAP; }
  return list;
}
export function addSwapRecipe(r: Omit<SwapRecipe, "id" | "hearts" | "createdAt">) {
  const list = [{ ...r, id: crypto.randomUUID(), hearts: 0, createdAt: Date.now() } as SwapRecipe, ...getSwapRecipes()];
  write(K.swap, list);
  return list;
}
export function heartSwap(id: string) {
  const list = getSwapRecipes().map((r) => r.id === id ? { ...r, hearts: r.hearts + 1 } : r);
  write(K.swap, list);
  return list;
}

// ===== Groups (church / meal trains / family events) =====
export type Group = {
  id: string;
  name: string;
  kind: "meal-train" | "church" | "family" | "support";
  notes?: string;
  createdAt: number;
};
export type GroupMeal = {
  id: string;
  groupId: string;
  date: string; // YYYY-MM-DD
  dish: string;
  cook: string;
};

export function getGroups(): Group[] { return read<Group[]>(K.groups, []); }
export function addGroup(g: Omit<Group, "id" | "createdAt">) {
  const list = [{ ...g, id: crypto.randomUUID(), createdAt: Date.now() } as Group, ...getGroups()];
  write(K.groups, list); return list;
}
export function removeGroup(id: string) {
  write(K.groups, getGroups().filter((g) => g.id !== id));
  write(K.meals, getGroupMeals().filter((m) => m.groupId !== id));
}
export function getGroupMeals(groupId?: string): GroupMeal[] {
  const all = read<GroupMeal[]>(K.meals, []);
  return groupId ? all.filter((m) => m.groupId === groupId) : all;
}
export function addGroupMeal(m: Omit<GroupMeal, "id">) {
  const list = [...read<GroupMeal[]>(K.meals, []), { ...m, id: crypto.randomUUID() } as GroupMeal];
  write(K.meals, list); return list;
}
export function removeGroupMeal(id: string) {
  write(K.meals, read<GroupMeal[]>(K.meals, []).filter((m) => m.id !== id));
}

// ===== Wins (Share My Win) =====
export type Win = {
  id: string;
  kind: "savings" | "meal" | "leftover" | "streak";
  text: string;
  at: number;
};
export function getWins(): Win[] { return read<Win[]>(K.wins, []); }
export function addWin(w: Omit<Win, "id" | "at">) {
  const list = [{ ...w, id: crypto.randomUUID(), at: Date.now() } as Win, ...getWins()].slice(0, 50);
  write(K.wins, list); return list;
}
export function clearWins() { write(K.wins, []); }

// ===== Privacy =====
export type Privacy = { shareToBoard: boolean; shareLocation: boolean; displayName: string };
export function getPrivacy(): Privacy {
  return read<Privacy>(K.privacy, { shareToBoard: false, shareLocation: false, displayName: "Anonymous Cook" });
}
export function setPrivacy(p: Partial<Privacy>) {
  const next = { ...getPrivacy(), ...p };
  write(K.privacy, next); return next;
}

// ===== Sponsor a Family =====
export type Sponsorship = {
  id: string;
  for: "cancer" | "elderly" | "struggling";
  months: number;
  donor: string;
  at: number;
};
export function getSponsorships(): Sponsorship[] { return read<Sponsorship[]>(K.sponsor, []); }
export function addSponsorship(s: Omit<Sponsorship, "id" | "at">) {
  const list = [{ ...s, id: crypto.randomUUID(), at: Date.now() } as Sponsorship, ...getSponsorships()];
  write(K.sponsor, list); return list;
}

// ===== Demo data for community walls =====
export const POPULAR_MEALS = [
  { title: "One-Pan Chicken Rice", cooks: 1284, badge: "🔥 Trending" },
  { title: "Pantry Pasta Aglio e Olio", cooks: 982, badge: "💰 Cheap" },
  { title: "Leftover Veggie Frittata", cooks: 871, badge: "♻️ Rescue" },
  { title: "Sheet Pan Sausage & Peppers", cooks: 760, badge: "⏱ Fast" },
  { title: "Bean & Rice Burrito Bowls", cooks: 644, badge: "💰 Cheap" },
  { title: "Tomato Soup + Grilled Cheese", cooks: 612, badge: "🧒 Kid-Win" },
];

export const LEFTOVER_WINS = [
  { who: "Sarah", text: "turned old chicken into tacos.", saved: 1100 },
  { who: "Mike", text: "used old rice for fried rice.", saved: 480 },
  { who: "Priya", text: "made roasted veg into a frittata.", saved: 620 },
  { who: "Diego", text: "spun day-old bread into croutons + bread pudding.", saved: 350 },
  { who: "Tasha", text: "stretched 1 rotisserie chicken into 4 meals.", saved: 1850 },
];

export const TOP_SAVERS = [
  { name: "Karen B.", saved: 4820, rescued: 38, streak: 22 },
  { name: "Marcus L.", saved: 4110, rescued: 31, streak: 18 },
  { name: "Lia P.", saved: 3760, rescued: 42, streak: 12 },
  { name: "Jordan S.", saved: 3230, rescued: 27, streak: 9 },
  { name: "You", saved: 0, rescued: 0, streak: 0 },
];

export const LOCAL_FEED = [
  { area: "Your neighborhood", line: "12 cooks made one-pan chicken tonight." },
  { area: "Within 5 miles", line: "Top rescue: leftover roast → French dip sandwiches." },
  { area: "Your city", line: "Avg savings this week: $42 per cook." },
];

export function formatMoney(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
