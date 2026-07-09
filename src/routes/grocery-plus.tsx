import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, ShoppingBasket, CalendarDays, Users, PartyPopper,
  Snowflake, ChefHat, Trophy, Tag, Repeat2, MapPin, Sparkles,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { growthAi, type GrowthResult } from "@/lib/growth.functions";
import { getFunnyMode } from "@/lib/funny-chef";
import {
  readWatch, addWatch, removeWatch, logPrice, type WatchedItem,
} from "@/lib/price-watch";
import {
  readChallenge, startChallenge, logChallengeDay, resetChallenge, type ChallengeState,
} from "@/lib/pantry-challenge";

export const Route = createFileRoute("/grocery-plus")({
  head: () => ({
    meta: [
      { title: "Smart Grocery & Weekly Planning — The Fridge and Cupboard" },
      { name: "description", content: "AI grocery lists, weekly meal plans, family scaler, party mode, bulk cook, pantry challenges, price watch, smart substitutions, and local food ideas — all from what you already have." },
      { property: "og:title", content: "Smart Grocery & Weekly Planning" },
      { property: "og:description", content: "Cheapest, healthiest, or fastest grocery lists built around what you already own." },
    ],
  }),
  component: GrowthPage,
});

function parseList(s: string) { return s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean); }
function dollars(c?: number) { return typeof c === "number" ? `$${(c / 100).toFixed(2)}` : "—"; }

function GrowthPage() {
  // Shared inventory (used by every section)
  const [raw, setRaw] = useState("eggs, spinach, cheddar, leftover chicken, rice, tomato, onion, garlic, milk, bread, pasta, beans, chicken stock");
  const [expiringRaw, setExpiringRaw] = useState("spinach, tomato");
  const [leftoversRaw, setLeftoversRaw] = useState("leftover chicken, rice");
  const [familyCount, setFamilyCount] = useState(2);

  const have = useMemo(() => parseList(raw), [raw]);
  const expiring = useMemo(() => parseList(expiringRaw), [expiringRaw]);
  const leftovers = useMemo(() => parseList(leftoversRaw), [leftoversRaw]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Home
      </Link>
      <header className="mt-2">
        <h1 className="text-2xl font-bold">Smart Grocery & Weekly Planning</h1>
        <p className="text-sm text-muted-foreground">Open any section. Built on what you already have.</p>
      </header>

      {/* Inventory + family */}
      <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">What you have</h2>
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={2}
          className="mt-2 w-full rounded-2xl border border-border bg-background p-2 text-sm"
          placeholder="eggs, rice, spinach…" />
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs"><span className="font-semibold">Expiring soon</span>
            <input value={expiringRaw} onChange={(e) => setExpiringRaw(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background p-1.5 text-sm" />
          </label>
          <label className="text-xs"><span className="font-semibold">Leftovers</span>
            <input value={leftoversRaw} onChange={(e) => setLeftoversRaw(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background p-1.5 text-sm" />
          </label>
        </div>
        <FamilyAdjuster value={familyCount} onChange={setFamilyCount} />
      </section>

      <Accordion type="multiple" className="mt-4 space-y-2">
        <Section value="grocery" icon={<ShoppingBasket className="h-4 w-4" />} title="Build My Grocery List" subtitle="Cheapest · Healthiest · Fastest">
          <GrocerySection have={have} expiring={expiring} leftovers={leftovers} familyCount={familyCount} />
        </Section>
        <Section value="week" icon={<CalendarDays className="h-4 w-4" />} title="My Week of Meals" subtitle="7 days · leftovers chained · expiring first">
          <WeekSection have={have} expiring={expiring} leftovers={leftovers} familyCount={familyCount} />
        </Section>
        <Section value="party" icon={<PartyPopper className="h-4 w-4" />} title="Cook for a Group" subtitle="Potluck · BBQ · holiday · church event">
          <PartySection have={have} familyCount={familyCount} />
        </Section>
        <Section value="holiday" icon={<Snowflake className="h-4 w-4" />} title="Holiday Leftover Mode" subtitle="Thanksgiving · Christmas · Easter · July 4th">
          <HolidaySection have={have} leftovers={leftovers} familyCount={familyCount} />
        </Section>
        <Section value="bulk" icon={<ChefHat className="h-4 w-4" />} title="Prep Meals for the Week" subtitle="Freezer · lunch · family bulk cook">
          <BulkSection have={have} familyCount={familyCount} />
        </Section>
        <Section value="challenge" icon={<Trophy className="h-4 w-4" />} title="Pantry Challenge" subtitle="3 days, zero shopping, track savings">
          <ChallengeSection have={have} expiring={expiring} leftovers={leftovers} familyCount={familyCount} />
        </Section>
        <Section value="price" icon={<Tag className="h-4 w-4" />} title="Price Watch" subtitle="Log prices, get notified when it's a deal">
          <PriceWatchSection />
        </Section>
        <Section value="subs" icon={<Repeat2 className="h-4 w-4" />} title="Smart Substitution Engine" subtitle="Cheaper · healthier · easier swaps">
          <SubsSection have={have} />
        </Section>
        <Section value="local" icon={<MapPin className="h-4 w-4" />} title="Local Food Mode" subtitle="Seasonal · regional ingredients">
          <LocalSection have={have} familyCount={familyCount} />
        </Section>
      </Accordion>
    </main>
  );
}

/* -------------- shared bits -------------- */

function Section({ value, icon, title, subtitle, children }: {
  value: string; icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-2xl border border-border bg-card px-3">
      <AccordionTrigger className="py-3 hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span>
          <span>
            <span className="block text-sm font-semibold">{title}</span>
            {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

function FamilyAdjuster({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const opts = [1, 2, 4, 6, 8];
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 text-xs font-semibold"><Users className="h-3.5 w-3.5" /> How many people?</div>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5">
        {opts.map((n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`rounded-xl border px-2 py-1.5 text-sm font-semibold transition ${
              value === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/40"
            }`}>{n === 8 ? "8+" : n}</button>
        ))}
      </div>
    </div>
  );
}

function useGrowth() {
  const fn = useServerFn(growthAi);
  return useMutation({ mutationFn: (data: Record<string, unknown>) => fn({ data: data as never }) });
}

function ResultBlock({ result }: { result: GrowthResult }) {
  return (
    <div className="mt-3 space-y-3 text-sm">
      {result.title && <h3 className="font-semibold">{result.title}</h3>}
      {result.summary && <p className="text-muted-foreground text-xs">{result.summary}</p>}

      {result.groceryList && result.groceryList.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold">Grocery list</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              Est. {dollars(result.estimatedCostCents ?? result.groceryList.reduce((a, b) => a + (b.estCents || 0), 0))}
            </span>
          </div>
          <ul className="space-y-1">
            {result.groceryList.map((g, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span>{g.item}{g.qty ? <span className="text-muted-foreground"> · {g.qty}</span> : null}{g.note ? <span className="text-xs text-muted-foreground"> — {g.note}</span> : null}</span>
                <span className="shrink-0 text-xs font-semibold">{dollars(g.estCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.days && result.days.length > 0 && (
        <div className="space-y-2">
          {result.days.map((d, i) => (
            <div key={i} className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold text-primary">{d.day}</div>
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((slot) =>
                d[slot] ? (
                  <div key={slot} className="mt-1 text-sm">
                    <span className="text-xs uppercase text-muted-foreground">{slot}: </span>
                    {d[slot]!.title}
                    {d[slot]!.note && <div className="text-xs text-muted-foreground">{d[slot]!.note}</div>}
                  </div>
                ) : null,
              )}
            </div>
          ))}
        </div>
      )}

      {result.meals && result.meals.length > 0 && (
        <div className="space-y-2">
          {result.meals.map((m, i) => (
            <div key={i} className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{m.title}</h4>
                {m.time_minutes && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{m.time_minutes} min</span>}
              </div>
              {m.note && <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>}
              {m.ingredients_used && m.ingredients_used.length > 0 && (
                <p className="mt-1 text-xs"><span className="font-semibold">Using:</span> {m.ingredients_used.join(", ")}</p>
              )}
              {m.missing && m.missing.length > 0 && (
                <p className="mt-1 text-xs text-amber-700"><span className="font-semibold">Missing:</span> {m.missing.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {result.prepPlan && result.prepPlan.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <div className="mb-2 text-xs font-semibold">Prep plan</div>
          <ol className="list-decimal pl-5 text-sm space-y-0.5">
            {result.prepPlan.map((p, i) => (
              <li key={i}>{p.step}{p.time ? <span className="text-muted-foreground"> · {p.time}</span> : null}</li>
            ))}
          </ol>
        </div>
      )}

      {result.storage && result.storage.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <div className="mb-2 text-xs font-semibold">Storage</div>
          <ul className="text-sm space-y-0.5">
            {result.storage.map((s, i) => (
              <li key={i}>{s.item} — {s.method} <span className="text-muted-foreground">· keeps {s.days}d</span></li>
            ))}
          </ul>
        </div>
      )}

      {result.substitutions && result.substitutions.length > 0 && (
        <div className="space-y-2">
          {result.substitutions.map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-background/60 p-3 text-sm">
              <div className="font-semibold">Missing: {s.missing}</div>
              <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-3 text-xs">
                {s.cheaper && <div><span className="font-semibold text-emerald-600">Cheaper:</span> {s.cheaper}</div>}
                {s.healthier && <div><span className="font-semibold text-teal-600">Healthier:</span> {s.healthier}</div>}
                {s.easier && <div><span className="font-semibold text-sky-600">Easier:</span> {s.easier}</div>}
              </div>
              {s.note && <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>}
            </div>
          ))}
        </div>
      )}

      {typeof result.estimatedSavingsCents === "number" && (
        <p className="rounded-2xl border border-emerald-300/40 bg-emerald-500/5 p-2 text-xs">
          <Sparkles className="inline h-3 w-3 mr-1 text-emerald-600" />
          Estimated savings: <span className="font-bold">{dollars(result.estimatedSavingsCents)}</span>
        </p>
      )}

      {result.notes && result.notes.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {result.notes.map((n, i) => <li key={i}>• {n}</li>)}
        </ul>
      )}
    </div>
  );
}

function RunState({ mut }: { mut: ReturnType<typeof useGrowth> }) {
  if (mut.isPending) return <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chef is working…</div>;
  if (mut.isError) return <p className="mt-3 text-sm text-rose-600">{(mut.error as Error).message}</p>;
  if (mut.data) return <ResultBlock result={mut.data} />;
  return null;
}

/* -------------- sections -------------- */

function GrocerySection(p: { have: string[]; expiring: string[]; leftovers: string[]; familyCount: number }) {
  const mut = useGrowth();
  const variants: Array<{ k: "cheapest" | "healthiest" | "fastest"; label: string; tone: string }> = [
    { k: "cheapest", label: "Cheapest", tone: "from-emerald-500 to-teal-500" },
    { k: "healthiest", label: "Healthiest", tone: "from-lime-500 to-green-600" },
    { k: "fastest", label: "Fastest", tone: "from-sky-500 to-indigo-500" },
  ];
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {variants.map((v) => (
          <button key={v.k} disabled={mut.isPending}
            onClick={() => mut.mutate({ mode: "grocery-list", haveIngredients: p.have, expiring: p.expiring, leftovers: p.leftovers, familyCount: p.familyCount, variant: v.k, funny: getFunnyMode(), days: 7, missing: [] })}
            className={`rounded-2xl px-3 py-2 text-sm font-semibold text-white shadow bg-gradient-to-br ${v.tone} disabled:opacity-60`}>
            {v.label}
          </button>
        ))}
      </div>
      <RunState mut={mut} />
    </>
  );
}

function WeekSection(p: { have: string[]; expiring: string[]; leftovers: string[]; familyCount: number }) {
  const mut = useGrowth();
  return (
    <>
      <button disabled={mut.isPending}
        onClick={() => mut.mutate({ mode: "week-of-meals", haveIngredients: p.have, expiring: p.expiring, leftovers: p.leftovers, familyCount: p.familyCount, funny: getFunnyMode(), days: 7, missing: [] })}
        className="w-full rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        Plan my week
      </button>
      <RunState mut={mut} />
    </>
  );
}

function PartySection(p: { have: string[]; familyCount: number }) {
  const mut = useGrowth();
  const [type, setType] = useState("potluck");
  const [guests, setGuests] = useState(10);
  const types = ["potluck", "church event", "family gathering", "holiday dinner", "BBQ", "game night"];
  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {types.map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`rounded-xl border px-2 py-1.5 text-xs font-semibold ${type === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}>{t}</button>
        ))}
      </div>
      <label className="mt-2 block text-xs">Guests
        <input type="number" min={1} max={500} value={guests} onChange={(e) => setGuests(Number(e.target.value || 1))}
          className="ml-2 w-20 rounded-md border border-border bg-background p-1 text-sm" />
      </label>
      <button disabled={mut.isPending}
        onClick={() => mut.mutate({ mode: "party", haveIngredients: p.have, expiring: [], leftovers: [], familyCount: p.familyCount, partyType: type, partyGuests: guests, funny: getFunnyMode(), days: 1, missing: [] })}
        className="mt-2 w-full rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        Build party plan
      </button>
      <RunState mut={mut} />
    </>
  );
}

function HolidaySection(p: { have: string[]; leftovers: string[]; familyCount: number }) {
  const mut = useGrowth();
  const holidays = ["Thanksgiving", "Christmas", "Easter", "July 4th"];
  const [h, setH] = useState(holidays[0]);
  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {holidays.map((x) => (
          <button key={x} onClick={() => setH(x)}
            className={`rounded-xl border px-2 py-1.5 text-xs font-semibold ${h === x ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}>{x}</button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Tip: add turkey, ham, prime rib, mashed potatoes to "Leftovers" above.</p>
      <button disabled={mut.isPending}
        onClick={() => mut.mutate({ mode: "holiday-leftovers", haveIngredients: p.have, expiring: [], leftovers: p.leftovers, familyCount: p.familyCount, holiday: h, funny: getFunnyMode(), days: 1, missing: [] })}
        className="mt-2 w-full rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        Rescue holiday leftovers
      </button>
      <RunState mut={mut} />
    </>
  );
}

function BulkSection(p: { have: string[]; familyCount: number }) {
  const mut = useGrowth();
  const [t, setT] = useState<"freezer" | "lunch" | "family">("freezer");
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {(["freezer", "lunch", "family"] as const).map((x) => (
          <button key={x} onClick={() => setT(x)}
            className={`rounded-xl border px-2 py-1.5 text-xs font-semibold capitalize ${t === x ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}>{x}</button>
        ))}
      </div>
      <button disabled={mut.isPending}
        onClick={() => mut.mutate({ mode: "bulk-cook", haveIngredients: p.have, expiring: [], leftovers: [], familyCount: p.familyCount, bulkType: t, funny: getFunnyMode(), days: 1, missing: [] })}
        className="mt-2 w-full rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        Build bulk cook plan
      </button>
      <RunState mut={mut} />
    </>
  );
}

function ChallengeSection(p: { have: string[]; expiring: string[]; leftovers: string[]; familyCount: number }) {
  const mut = useGrowth();
  const [state, setState] = useState<ChallengeState | null>(null);
  useEffect(() => {
    setState(readChallenge());
    const refresh = () => setState(readChallenge());
    window.addEventListener("tfc:pantry-challenge:update", refresh);
    return () => window.removeEventListener("tfc:pantry-challenge:update", refresh);
  }, []);
  return (
    <>
      {state ? (
        <div className="rounded-2xl border border-emerald-300/50 bg-emerald-500/5 p-3 text-sm">
          <div className="font-semibold">Day {state.daysCompleted} of {state.targetDays}</div>
          <div className="text-xs text-muted-foreground">Saved so far: {dollars(state.estimatedSavingsCents)}</div>
          <div className="mt-2 flex gap-2">
            {state.active && <button onClick={() => logChallengeDay()} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Log a day (+$15)</button>}
            <button onClick={() => resetChallenge()} className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold">Reset</button>
          </div>
        </div>
      ) : (
        <button onClick={() => startChallenge(3)} className="w-full rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          Start 3-day challenge
        </button>
      )}
      <button disabled={mut.isPending}
        onClick={() => mut.mutate({ mode: "pantry-challenge", haveIngredients: p.have, expiring: p.expiring, leftovers: p.leftovers, familyCount: p.familyCount, days: 3, funny: getFunnyMode(), missing: [] })}
        className="mt-2 w-full rounded-2xl border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-60">
        Generate 3-day pantry meals
      </button>
      <RunState mut={mut} />
    </>
  );
}

function PriceWatchSection() {
  const [items, setItems] = useState<WatchedItem[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [store, setStore] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setItems(readWatch());
    const refresh = () => setItems(readWatch());
    window.addEventListener("tfc:price-watch:update", refresh);
    return () => window.removeEventListener("tfc:price-watch:update", refresh);
  }, []);

  return (
    <>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add ingredient (eggs, milk…)"
          className="flex-1 rounded-xl border border-border bg-background p-2 text-sm" />
        <button onClick={() => { if (name.trim()) { addWatch(name.trim()); setName(""); } }}
          className="rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">Add</button>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Add favorites like meat, eggs, milk, cheese. You'll be alerted when a price beats your best.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={it.name} className="rounded-2xl border border-border bg-background/60 p-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold capitalize">{it.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Best: {it.bestPriceCents ? dollars(it.bestPriceCents) : "—"}{it.bestStore ? ` · ${it.bestStore}` : ""}
                  </div>
                </div>
                <button onClick={() => removeWatch(it.name)} className="text-xs text-muted-foreground hover:text-rose-600">Remove</button>
              </div>
              {target === it.name ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ price"
                    className="w-24 rounded-md border border-border bg-background p-1 text-xs" />
                  <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store"
                    className="w-32 rounded-md border border-border bg-background p-1 text-xs" />
                  <button onClick={() => {
                    const cents = Math.round(Number(price) * 100);
                    if (cents > 0) {
                      const r = logPrice(it.name, cents, store || undefined);
                      setMsg(r?.isBest ? `🎉 New best price for ${it.name}!` : `Logged ${dollars(cents)} for ${it.name}.`);
                      setPrice(""); setStore(""); setTarget(null);
                      setTimeout(() => setMsg(null), 3000);
                    }
                  }} className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Save</button>
                  <button onClick={() => setTarget(null)} className="text-xs text-muted-foreground">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setTarget(it.name)} className="mt-1 text-xs font-semibold text-primary">Log a price</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-2 text-xs font-semibold text-emerald-600">{msg}</p>}
    </>
  );
}

function SubsSection(p: { have: string[] }) {
  const mut = useGrowth();
  const [missing, setMissing] = useState("buttermilk, sour cream");
  return (
    <>
      <label className="text-xs"><span className="font-semibold">What are you missing?</span>
        <input value={missing} onChange={(e) => setMissing(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-sm" />
      </label>
      <button disabled={mut.isPending}
        onClick={() => mut.mutate({ mode: "substitutions", haveIngredients: p.have, expiring: [], leftovers: [], familyCount: 2, missing: parseList(missing), funny: getFunnyMode(), days: 1 })}
        className="mt-2 w-full rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        Suggest swaps
      </button>
      <RunState mut={mut} />
    </>
  );
}

function LocalSection(p: { have: string[]; familyCount: number }) {
  const mut = useGrowth();
  const [region, setRegion] = useState("");
  const [season, setSeason] = useState("");
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs"><span className="font-semibold">Region</span>
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Alaska, Pacific NW…"
            className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-sm" />
        </label>
        <label className="text-xs"><span className="font-semibold">Season</span>
          <input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="summer, fall…"
            className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-sm" />
        </label>
      </div>
      <button disabled={mut.isPending}
        onClick={() => mut.mutate({ mode: "local-food", haveIngredients: p.have, expiring: [], leftovers: [], familyCount: p.familyCount, region, season, funny: getFunnyMode(), days: 1, missing: [] })}
        className="mt-2 w-full rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        Build local meals
      </button>
      <RunState mut={mut} />
    </>
  );
}
