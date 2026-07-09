import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  History,
  Clock,
  Snowflake,
  ShieldCheck,
  TrendingUp,
  Flame,
  Wallet,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  logWaste,
  getWasteEntries,
  removeWaste,
  wasteTotals,
  getIngredientStats,
  addLeftover,
  getLeftovers,
  removeLeftover,
  leftoverStatus,
  getSavingsTotals,
  getStreak,
  checkInStreak,
  resetStreak,
  getBudgetMode,
  setBudgetMode,
  streakReward,
  formatMoney,
  bumpIngredient,
} from "@/lib/savings-hub";
import { savingsHubAi, type RescueMeal, type DefenseResult } from "@/lib/savings-hub.functions";
import { getFunnyMode } from "@/lib/funny-chef";
import { FunnyChefToggle } from "@/components/FunnyChefToggle";

export const Route = createFileRoute("/savings-hub")({
  head: () => ({
    meta: [
      { title: "Savings Hub — Track Waste, Leftovers & Streaks" },
      { name: "description", content: "Waste tracker, ingredient history, leftover lifespan, freezer rescue, grocery defense, savings dashboard, streaks, and budget mode." },
      { property: "og:title", content: "Savings Hub — The Fridge and Cupboard" },
      { property: "og:description", content: "Use what you have. Save money. Waste less." },
    ],
  }),
  component: SavingsHubPage,
});

function SavingsHubPage() {
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="text-sm font-semibold">Savings Hub</div>
          <FunnyChefToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <SavingsDashboardCard tick={tick} />
        <StreakCard onChange={bump} />
        <BudgetModeCard />
        <WasteTrackerCard onChange={bump} />
        <LeftoverLifespanCard onChange={bump} />
        <IngredientHistoryCard tick={tick} />
        <FreezerRescueCard />
        <GroceryDefenseCard />
      </main>
    </div>
  );
}

// ===== Savings Dashboard =====
function SavingsDashboardCard({ tick }: { tick: number }) {
  const totals = useMemo(() => getSavingsTotals(), [tick]);
  const stats = useMemo(() => wasteTotals(), [tick]);
  const items = [
    { label: "Money saved", value: formatMoney(totals.moneySavedCents), tone: "text-emerald-600" },
    { label: "Food rescued", value: `${totals.foodRescued}`, tone: "text-amber-600" },
    { label: "Meals created", value: `${totals.mealsCreated}`, tone: "text-sky-600" },
    { label: "Leftovers used", value: `${totals.leftoversUsed}`, tone: "text-fuchsia-600" },
    { label: "Waste prevented", value: `${totals.wastePreventedItems}`, tone: "text-violet-600" },
    { label: "Money lost (30d)", value: formatMoney(stats.monthly.cents), tone: "text-rose-600" },
  ];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold">Savings Dashboard</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl border bg-card p-3">
            <div className="text-xs text-muted-foreground">{i.label}</div>
            <div className={cn("text-xl font-bold", i.tone)}>{i.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ===== Streak Card =====
function StreakCard({ onChange }: { onChange: () => void }) {
  const [state, setState] = useState(() => getStreak());
  useEffect(() => { setState(getStreak()); }, []);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-semibold">No-Shop Streak</h2>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-3xl font-extrabold">{state.days} <span className="text-base font-medium text-muted-foreground">days</span></div>
          <div className="text-sm text-muted-foreground">Best: {state.best} · {streakReward(state.days)}</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { const s = checkInStreak(); setState({ ...s, startedAt: state.startedAt }); toast.success("Checked in!"); }}>
            Check in today
          </Button>
          <Button size="sm" variant="outline" onClick={() => { const s = resetStreak(); setState({ ...s, startedAt: Date.now() }); onChange(); toast.message("Streak reset — fresh start."); }}>
            I shopped
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ===== Budget Mode =====
function BudgetModeCard() {
  const [on, setOn] = useState(() => getBudgetMode());
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-600" />
          <div>
            <div className="font-semibold">Keep this cheap</div>
            <div className="text-xs text-muted-foreground">Budget Mode prioritizes pantry staples + leftovers in all suggestions.</div>
          </div>
        </div>
        <Button size="sm" variant={on ? "default" : "outline"} onClick={() => { const next = !on; setOn(next); setBudgetMode(next); toast.success(next ? "Budget Mode ON" : "Budget Mode off"); }}>
          {on ? "ON" : "Turn on"}
        </Button>
      </div>
    </Card>
  );
}

// ===== Waste Tracker =====
function WasteTrackerCard({ onChange }: { onChange: () => void }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState<"expired" | "spoiled" | "forgot" | "too-much" | "other">("expired");
  const [tick, setTick] = useState(0);
  const entries = useMemo(() => getWasteEntries(), [tick]);
  const totals = useMemo(() => wasteTotals(), [tick]);

  function add() {
    if (!name.trim()) return;
    const cents = Math.round(parseFloat(cost || "0") * 100);
    logWaste({ name: name.trim(), costCents: cents, reason });
    setName(""); setCost("");
    setTick((t) => t + 1); onChange();
    toast.success("Logged. We'll help you waste less next time.");
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 className="h-5 w-5 text-rose-600" />
        <h2 className="text-lg font-semibold">Waste Tracker</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="Food wasted (7d)" value={`${totals.weekly.items} items`} />
        <Stat label="Money lost (7d)" value={formatMoney(totals.weekly.cents)} tone="rose" />
        <Stat label="Food wasted (30d)" value={`${totals.monthly.items} items`} />
        <Stat label="Money lost (30d)" value={formatMoney(totals.monthly.cents)} tone="rose" />
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Input placeholder="What was thrown away?" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[180px]" />
        <Input placeholder="Cost $" value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.50" className="w-28" />
        <select className="rounded-md border bg-background px-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value as any)}>
          <option value="expired">Expired</option>
          <option value="spoiled">Spoiled</option>
          <option value="forgot">Forgot</option>
          <option value="too-much">Too much</option>
          <option value="other">Other</option>
        </select>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Log</Button>
      </div>
      {totals.topWasted.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Pattern — most wasted</div>
          <div className="flex flex-wrap gap-1">
            {totals.topWasted.map((w) => (
              <Badge key={w.name} variant="outline">{w.name} · {w.count}×</Badge>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1 max-h-48 overflow-auto">
        {entries.slice(0, 10).map((e) => (
          <div key={e.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
            <div>
              <span className="font-medium">{e.name}</span>
              <span className="text-muted-foreground"> · {formatMoney(e.costCents)}{e.reason ? ` · ${e.reason}` : ""}</span>
            </div>
            <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => { removeWaste(e.id); setTick((t) => t + 1); onChange(); }}>remove</button>
          </div>
        ))}
        {entries.length === 0 && <div className="text-sm text-muted-foreground">No waste logged yet. Keep it that way!</div>}
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "rose" }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("text-base font-bold", tone === "rose" ? "text-rose-600" : "text-foreground")}>{value}</div>
    </div>
  );
}

// ===== Leftover Lifespan =====
function LeftoverLifespanCard({ onChange }: { onChange: () => void }) {
  const [name, setName] = useState("");
  const [days, setDays] = useState("0");
  const [storage, setStorage] = useState<"fridge" | "freezer">("fridge");
  const [tick, setTick] = useState(0);
  const list = useMemo(() => getLeftovers(), [tick]);

  function add() {
    if (!name.trim()) return;
    const cookedAt = Date.now() - Math.max(0, parseInt(days || "0")) * 86400_000;
    addLeftover({ name: name.trim(), cookedAt, storage });
    setName(""); setDays("0");
    setTick((t) => t + 1); onChange();
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold">Leftover Lifespan</h2>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Input placeholder="What is it? (e.g. chili)" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[160px]" />
        <Input placeholder="Days ago cooked" value={days} onChange={(e) => setDays(e.target.value)} type="number" className="w-32" />
        <select className="rounded-md border bg-background px-2 text-sm" value={storage} onChange={(e) => setStorage(e.target.value as any)}>
          <option value="fridge">Fridge</option>
          <option value="freezer">Freezer</option>
        </select>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
      <div className="space-y-2">
        {list.map((l) => {
          const s = leftoverStatus(l);
          const toneClass = {
            fresh: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
            use: "bg-amber-500/10 text-amber-700 border-amber-500/30",
            freeze: "bg-sky-500/10 text-sky-700 border-sky-500/30",
            toss: "bg-rose-500/10 text-rose-700 border-rose-500/30",
          }[s.tone];
          return (
            <div key={l.id} className={cn("rounded-lg border p-2 flex items-center justify-between gap-2", toneClass)}>
              <div className="min-w-0">
                <div className="font-medium truncate">{l.name} <span className="text-xs opacity-70">· {l.storage}</span></div>
                <div className="text-xs">{s.label} · {s.message}</div>
              </div>
              <button className="text-xs opacity-70 hover:opacity-100" onClick={() => { removeLeftover(l.id); setTick((t) => t + 1); onChange(); }}>remove</button>
            </div>
          );
        })}
        {list.length === 0 && <div className="text-sm text-muted-foreground">No leftovers tracked. Add one to get freshness warnings.</div>}
      </div>
    </Card>
  );
}

// ===== Ingredient History =====
function IngredientHistoryCard({ tick }: { tick: number }) {
  const stats = useMemo(() => getIngredientStats(), [tick]);
  const [favName, setFavName] = useState("");
  const sections: { title: string; key: keyof typeof stats; tone: string }[] = [
    { title: "Most used", key: "mostUsed", tone: "text-emerald-600" },
    { title: "Least used", key: "leastUsed", tone: "text-amber-600" },
    { title: "Most wasted", key: "mostWasted", tone: "text-rose-600" },
    { title: "Favorites", key: "favorites", tone: "text-fuchsia-600" },
  ];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-semibold">Ingredient History</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {sections.map((s) => (
          <div key={s.title} className="rounded-lg border p-2">
            <div className={cn("text-xs font-semibold mb-1", s.tone)}>{s.title}</div>
            {stats[s.key].length === 0 ? (
              <div className="text-xs text-muted-foreground">Nothing yet.</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {stats[s.key].map((i) => (
                  <Badge key={i.name} variant="outline" className="text-xs">{i.name}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <Input placeholder="Mark a favorite ingredient" value={favName} onChange={(e) => setFavName(e.target.value)} />
        <Button variant="outline" onClick={() => { if (!favName.trim()) return; bumpIngredient(favName, "favorited"); setFavName(""); toast.success("Favorited."); }}>♥ Save</Button>
      </div>
    </Card>
  );
}

// ===== Freezer Rescue =====
function FreezerRescueCard() {
  const ai = useServerFn(savingsHubAi);
  const [items, setItems] = useState(""); // "chicken:30, peas:90"
  const mut = useMutation({
    mutationFn: (frozen: { name: string; days: number }[]) =>
      ai({ data: { mode: "freezer-rescue", frozenItems: frozen, haveIngredients: [], servings: 2, funny: getFunnyMode() } }),
    onError: (e: Error) => toast.error(e.message),
  });

  function go() {
    const frozen = items.split(",").map((s) => {
      const [name, days] = s.split(":").map((x) => x?.trim());
      if (!name) return null;
      return { name, days: parseInt(days || "0") || 0 };
    }).filter(Boolean) as { name: string; days: number }[];
    if (frozen.length === 0) { toast.error("Add at least one frozen item."); return; }
    mut.mutate(frozen);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Snowflake className="h-5 w-5 text-sky-600" />
        <h2 className="text-lg font-semibold">Freezer Rescue Mode</h2>
      </div>
      <div className="text-xs text-muted-foreground mb-2">Format: <code>name:daysFrozen</code>, e.g. <code>chicken:30, peas:120</code>. Oldest items are prioritized.</div>
      <Textarea rows={2} placeholder="chicken:30, peas:120, pizza dough:200" value={items} onChange={(e) => setItems(e.target.value)} />
      <Button className="mt-2" onClick={go} disabled={mut.isPending}>
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
        Build freezer meals
      </Button>
      <MealsList meals={mut.data?.meals} />
    </Card>
  );
}

// ===== Grocery Defense =====
function GroceryDefenseCard() {
  const ai = useServerFn(savingsHubAi);
  const [have, setHave] = useState("");
  const [list, setList] = useState("");
  const mut = useMutation({
    mutationFn: () => ai({
      data: {
        mode: "grocery-defense",
        haveIngredients: have.split(",").map((s) => s.trim()).filter(Boolean),
        groceryList: list.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        funny: getFunnyMode(),
      },
    }),
    onError: (e: Error) => toast.error(e.message),
  });
  const d: DefenseResult | undefined = mut.data?.defense;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold">Grocery Defense Mode</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs text-muted-foreground">What you already have</label>
          <Textarea rows={3} placeholder="eggs, cheese, sour cream, rice" value={have} onChange={(e) => setHave(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Your grocery list</label>
          <Textarea rows={3} placeholder="eggs, milk, bread, cheese, apples" value={list} onChange={(e) => setList(e.target.value)} />
        </div>
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
        Check my list
      </Button>
      {d && (
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="text-xs font-semibold text-emerald-700 mb-1">Already have — skip these</div>
            {d.alreadyHave.length === 0 ? <div className="text-sm">Nothing overlaps.</div> : (
              <ul className="text-sm list-disc pl-4">{d.alreadyHave.map((i) => <li key={i}>{i}</li>)}</ul>
            )}
            <div className="text-xs mt-2 text-emerald-700">Est. savings: {formatMoney(d.estSavingsCents)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold mb-1">Still need</div>
            {d.stillNeed.length === 0 ? <div className="text-sm">Nothing!</div> : (
              <ul className="text-sm list-disc pl-4">{d.stillNeed.map((i) => <li key={i}>{i}</li>)}</ul>
            )}
            <div className="text-xs mt-2 text-muted-foreground">{d.note}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

function MealsList({ meals }: { meals?: RescueMeal[] }) {
  if (!meals?.length) return null;
  return (
    <div className="mt-3 space-y-3">
      {meals.map((m, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-semibold">{m.title}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{m.time_minutes} min</span>
              {typeof m.est_cost_cents === "number" && <span>· {formatMoney(m.est_cost_cents)}</span>}
            </div>
          </div>
          {m.why && <div className="text-xs text-muted-foreground mb-2">{m.why}</div>}
          <ol className="text-sm list-decimal pl-5 space-y-0.5">{m.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
          {(m.ingredients_used?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {m.ingredients_used.map((x) => <Badge key={x} variant="secondary" className="text-xs">{x}</Badge>)}
            </div>
          )}
          {(m.missing?.length ?? 0) > 0 && (
            <div className="mt-1 text-xs text-amber-700">Need: {m.missing.join(", ")}</div>
          )}
        </div>
      ))}
    </div>
  );
}
