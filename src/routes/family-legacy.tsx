import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Heart,
  Camera,
  Mic,
  StopCircle,
  Trash2,
  Plus,
  Share2,
  ChefHat,
  Sparkles,
  BookHeart,
  Loader2,
  Calendar,
  Users,
  Home,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import {
  LEGACY_EVENT,
  type Holiday,
  type LegacyRecipe,
  type LegacySource,
  type SpecialPerson,
  HOLIDAY_META,
  PERSON_META,
  SOURCE_META,
  addPhoto,
  addTimelineEntry,
  addVoiceNote,
  bumpCounter,
  createRecipe,
  deleteRecipe,
  fileToDataUrl,
  getFavoritesBoard,
  readLegacy,
  removePhoto,
  removeTimelineEntry,
  removeVoiceNote,
  updateRecipe,
} from "@/lib/family-legacy";
import { readRecipeCard, rebuildMemoryMeal, type LegacyRebuildResult } from "@/lib/family-legacy.functions";

export const Route = createFileRoute("/family-legacy")({
  head: () => ({
    meta: [
      { title: "Family / Legacy — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Preserve grandma's recipes, dad's chili, mom's Christmas pie. A warm family cookbook with photos, voice notes, holiday vault, and memory meals.",
      },
    ],
  }),
  component: FamilyLegacyPage,
});

const SOURCES = Object.keys(SOURCE_META) as LegacySource[];
const HOLIDAYS = Object.keys(HOLIDAY_META) as Holiday[];
const PEOPLE = Object.keys(PERSON_META) as SpecialPerson[];

type Tab = "cookbook" | "memory" | "holiday" | "rebuild" | "favorites" | "people";

function FamilyLegacyPage() {
  const [list, setList] = useState<LegacyRecipe[]>([]);
  const [tab, setTab] = useState<Tab>("cookbook");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setList(readLegacy());
    refresh();
    window.addEventListener(LEGACY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LEGACY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const open = openId ? list.find((r) => r.id === openId) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> Back home
      </Link>

      <header className="mt-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-rose-600">
          <BookHeart className="h-3.5 w-3.5" /> Family / Legacy
        </div>
        <h1 className="mt-1 font-display text-3xl">Kitchen Legacy.</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The meals that built your family. Grandma's soup. Dad's chili. Mom's Christmas pie. Save them here — with photos, stories, and voices — so they're never lost.
        </p>
      </header>

      <nav className="mt-5 flex flex-wrap gap-1.5">
        {([
          ["cookbook", "Cookbook", BookHeart],
          ["memory", "Memory Meals", Heart],
          ["holiday", "Holiday Vault", Calendar],
          ["rebuild", "Legacy Builder", ChefHat],
          ["favorites", "Favorites Board", Sparkles],
          ["people", "Special People", Users],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
              tab === id
                ? "border-rose-500/60 bg-rose-500/10 text-rose-700"
                : "border-border bg-background text-muted-foreground hover:border-rose-500/30"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {tab === "cookbook" && <CookbookTab list={list} onOpen={setOpenId} />}
        {tab === "memory" && <MemoryTab list={list} onOpen={setOpenId} />}
        {tab === "holiday" && <HolidayTab list={list} onOpen={setOpenId} />}
        {tab === "rebuild" && <RebuildTab />}
        {tab === "favorites" && <FavoritesTab list={list} onOpen={setOpenId} />}
        {tab === "people" && <PeopleTab list={list} onOpen={setOpenId} />}
      </div>

      {open && <RecipeDrawer recipe={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

// ---------------- Cookbook ----------------
function CookbookTab({ list, onOpen }: { list: LegacyRecipe[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <NewRecipeCard />
      <CardCameraReader />
      {list.length === 0 ? (
        <EmptyHint text="Your Family Legacy Cookbook starts here. Add Grandma's recipe, or snap a handwritten card and let the AI read it." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((r) => (
            <RecipeTile key={r.id} r={r} onOpen={() => onOpen(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewRecipeCard() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<LegacySource>("grandma");
  const [sourceName, setSourceName] = useState("");
  const [story, setStory] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");

  function save() {
    if (!title.trim()) {
      toast.error("Give the recipe a name.");
      return;
    }
    createRecipe({ title, source, sourceName, story, ingredients, instructions });
    toast.success(`Saved "${title.trim()}" to your Family Legacy Cookbook.`);
    setTitle("");
    setSourceName("");
    setStory("");
    setIngredients("");
    setInstructions("");
    setOpen(false);
  }

  return (
    <Card className="ring-paper border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-card to-amber-500/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-rose-600">Save a recipe</div>
          <h3 className="font-display text-lg">Add to the Family Legacy Cookbook</h3>
        </div>
        <Button size="sm" variant={open ? "outline" : "default"} onClick={() => setOpen((s) => !s)}>
          <Plus className="mr-1 h-4 w-4" /> {open ? "Close" : "New recipe"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[11px] uppercase tracking-widest">Recipe name</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grandma's Sunday Soup" />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-widest">From who</Label>
              <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Grandma Rose" />
            </div>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-widest">Source</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    source === s
                      ? "border-rose-500 bg-rose-500/10 text-rose-700"
                      : "border-border text-muted-foreground hover:border-rose-500/40"
                  }`}
                >
                  <span className="mr-1">{SOURCE_META[s].emoji}</span>
                  {SOURCE_META[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-widest">This reminds me of...</Label>
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={3}
              placeholder={`"This was Dad's chili. He made it every Sunday after church."`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[11px] uppercase tracking-widest">Ingredients</Label>
              <Textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} rows={5} placeholder="One per line" />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-widest">Instructions</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5} placeholder="How it's made" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save}>Save to cookbook</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function CardCameraReader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const read = useServerFn(readRecipeCard);

  async function onFile(file: File) {
    try {
      setLoading(true);
      const dataUrl = await fileToDataUrl(file);
      const out = await read({ data: { imageDataUrl: dataUrl } });
      const r = createRecipe({
        title: out.title || "Untitled family recipe",
        source: out.source ?? "handwritten",
        ingredients: out.ingredients,
        instructions: out.instructions,
        story: out.notes,
      });
      addPhoto(r.id, dataUrl, "Original recipe card");
      toast.success(`Saved "${r.title}" from the card.`);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't read that card. You can still type it in.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className="ring-paper border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-rose-500/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-amber-700">
            <ScanLine className="h-3.5 w-3.5" /> Handwritten card reader
          </div>
          <h3 className="font-display text-lg">Snap an old recipe card. We'll save it.</h3>
          <p className="text-xs text-muted-foreground">AI reads the handwriting and organizes the recipe into your cookbook.</p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={loading} className="gap-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {loading ? "Reading..." : "Scan a card"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
    </Card>
  );
}

function RecipeTile({ r, onOpen }: { r: LegacyRecipe; onOpen: () => void }) {
  const meta = SOURCE_META[r.source];
  const photo = r.photos[0];
  return (
    <button
      onClick={onOpen}
      className="text-left ring-paper rounded-xl border border-border/60 bg-card p-3 transition hover:border-rose-500/40 hover:shadow-md"
    >
      <div className="flex gap-3">
        {photo ? (
          <img src={photo.dataUrl} alt={r.title} className="h-16 w-16 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-2xl">
            {meta.emoji}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base leading-tight">{r.title}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            {meta.label}
            {r.sourceName ? ` • ${r.sourceName}` : ""}
          </div>
          {r.story && <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">"{r.story}"</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {r.holidays?.slice(0, 2).map((h) => (
              <Badge key={h} variant="outline" className="text-[10px]">
                {HOLIDAY_META[h].emoji} {HOLIDAY_META[h].label}
              </Badge>
            ))}
            {r.voiceNotes.length > 0 && (
              <Badge variant="outline" className="border-rose-500/30 text-[10px] text-rose-700">
                <Mic className="mr-1 h-2.5 w-2.5" />
                {r.voiceNotes.length} voice
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------- Memory Tab ----------------
function MemoryTab({ list, onOpen }: { list: LegacyRecipe[]; onOpen: (id: string) => void }) {
  const withStories = list.filter((r) => r.story || r.family?.length);
  return (
    <div className="space-y-3">
      <Card className="ring-paper border-rose-500/20 bg-rose-500/5 p-4">
        <div className="text-xs uppercase tracking-widest text-rose-600">Memory Meals</div>
        <h3 className="font-display text-lg">This reminds me of…</h3>
        <p className="text-sm text-muted-foreground">
          Open any recipe to attach memories, stories, family members, holidays, and traditions.
        </p>
      </Card>
      {withStories.length === 0 ? (
        <EmptyHint text="No memory notes yet. Add stories to your recipes — they'll show here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {withStories.map((r) => (
            <RecipeTile key={r.id} r={r} onOpen={() => onOpen(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Holiday Vault ----------------
function HolidayTab({ list, onOpen }: { list: LegacyRecipe[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <Card className="ring-paper border-amber-500/20 bg-amber-500/5 p-4">
        <div className="text-xs uppercase tracking-widest text-amber-700">Holiday Vault</div>
        <h3 className="font-display text-lg">Save traditions, every year.</h3>
      </Card>
      {HOLIDAYS.map((h) => {
        const items = list.filter((r) => r.holidays?.includes(h));
        if (items.length === 0) return null;
        return (
          <div key={h}>
            <div className="mb-2 flex items-center gap-2 font-display text-base">
              <span>{HOLIDAY_META[h].emoji}</span> {HOLIDAY_META[h].label}
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((r) => (
                <RecipeTile key={r.id} r={r} onOpen={() => onOpen(r.id)} />
              ))}
            </div>
          </div>
        );
      })}
      {list.every((r) => !r.holidays?.length) && (
        <EmptyHint text="Open a recipe and tag it with a holiday to start your vault." />
      )}
    </div>
  );
}

// ---------------- Special People ----------------
function PeopleTab({ list, onOpen }: { list: LegacyRecipe[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <Card className="ring-paper border-rose-500/20 bg-rose-500/5 p-4">
        <div className="text-xs uppercase tracking-widest text-rose-600">Cook this for someone special</div>
        <h3 className="font-display text-lg">Meals connected to the people you love.</h3>
      </Card>
      {PEOPLE.map((p) => {
        const items = list.filter((r) => r.specialPeople?.includes(p));
        if (items.length === 0) return null;
        return (
          <div key={p}>
            <div className="mb-2 flex items-center gap-2 font-display text-base">
              <span>{PERSON_META[p].emoji}</span> {PERSON_META[p].label}
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((r) => (
                <RecipeTile key={r.id} r={r} onOpen={() => onOpen(r.id)} />
              ))}
            </div>
          </div>
        );
      })}
      {list.every((r) => !r.specialPeople?.length) && (
        <EmptyHint text="Tag recipes with a special person — spouse, kids, parents — to see them here." />
      )}
    </div>
  );
}

// ---------------- Favorites Board ----------------
function FavoritesTab({ list, onOpen }: { list: LegacyRecipe[]; onOpen: (id: string) => void }) {
  const board = useMemo(() => getFavoritesBoard(list), [list]);
  const cols: { label: string; key: keyof typeof board; emoji: string }[] = [
    { label: "Most cooked", key: "mostCooked", emoji: "🍳" },
    { label: "Most loved", key: "mostLoved", emoji: "❤️" },
    { label: "Most shared", key: "mostShared", emoji: "📤" },
    { label: "Most requested", key: "mostRequested", emoji: "🙌" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cols.map((c) => (
        <Card key={c.key} className="ring-paper p-4">
          <div className="font-display text-base">{c.emoji} {c.label}</div>
          {board[c.key].filter((r: LegacyRecipe) => (r[c.key.replace("most", "").toLowerCase() + "Count" as keyof LegacyRecipe] as number) > 0).length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Nothing tracked yet. Tap counters on a recipe to start ranking.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {board[c.key].map((r: LegacyRecipe, i: number) => (
                <li key={r.id}>
                  <button
                    onClick={() => onOpen(r.id)}
                    className="flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-muted/40"
                  >
                    <span className="truncate"><span className="text-muted-foreground">{i + 1}.</span> {r.title}</span>
                    <span className="text-xs text-muted-foreground">
                      ×{(r as any)[c.key.replace("most", "").toLowerCase() + "Count"] ?? 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------------- Legacy Meal Builder ----------------
function RebuildTab() {
  const [memory, setMemory] = useState("");
  const [items, setItems] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LegacyRebuildResult | null>(null);
  const rebuild = useServerFn(rebuildMemoryMeal);

  async function go() {
    if (!memory.trim()) {
      toast.error("Tell us what reminds you of home.");
      return;
    }
    try {
      setLoading(true);
      const out = await rebuild({
        data: {
          memory: memory.trim(),
          items: items.split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      setResult(out);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't generate. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="ring-paper border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-card to-amber-500/5 p-5">
        <div className="text-xs uppercase tracking-widest text-rose-600">Legacy Meal Builder</div>
        <h3 className="font-display text-lg">What reminds you of home?</h3>
        <div className="mt-3 space-y-2">
          <Input
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            placeholder="Mom's chicken soup • Dad's tacos • Grandma's roast"
          />
          <Input
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="What you have on hand (comma separated, optional)"
          />
          <div className="flex justify-end">
            <Button onClick={go} disabled={loading} className="gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
              Rebuild this meal
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card className="ring-paper p-5">
          <div className="font-display text-lg">{result.headline}</div>
          {result.emotionalNote && (
            <p className="mt-1 text-sm italic text-rose-700">{result.emotionalNote}</p>
          )}
          <div className="mt-3 space-y-3">
            {result.meals.map((m, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-background/70 p-3">
                <div className="font-display text-base">{m.title}</div>
                <p className="text-xs text-muted-foreground">{m.why}</p>
                {m.ingredients.length > 0 && (
                  <div className="mt-1.5 text-xs"><span className="font-medium">Ingredients:</span> {m.ingredients.join(", ")}</div>
                )}
                {m.steps.length > 0 && (
                  <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                    {m.steps.map((s, j) => <li key={j}>{s}</li>)}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------- Recipe Drawer ----------------
function RecipeDrawer({ recipe, onClose }: { recipe: LegacyRecipe; onClose: () => void }) {
  const r = recipe;
  const photoRef = useRef<HTMLInputElement | null>(null);

  async function onPhoto(file: File) {
    const dataUrl = await fileToDataUrl(file);
    addPhoto(r.id, dataUrl);
    toast.success("Photo attached.");
  }

  function toggleHoliday(h: Holiday) {
    const cur = new Set(r.holidays ?? []);
    cur.has(h) ? cur.delete(h) : cur.add(h);
    updateRecipe(r.id, { holidays: Array.from(cur) });
  }

  function togglePerson(p: SpecialPerson) {
    const cur = new Set(r.specialPeople ?? []);
    cur.has(p) ? cur.delete(p) : cur.add(p);
    updateRecipe(r.id, { specialPeople: Array.from(cur) });
  }

  async function share() {
    const text = `${r.title}${r.sourceName ? ` — from ${r.sourceName}` : ""}\n\n${r.story ?? ""}\n\nIngredients:\n${r.ingredients ?? ""}\n\nInstructions:\n${r.instructions ?? ""}\n\nPassed down via The Fridge and Cupboard.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Pass it down: ${r.title}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Recipe copied — paste it to family.");
      }
      bumpCounter(r.id, "sharedCount");
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-background p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-rose-600">
              {SOURCE_META[r.source].emoji} {SOURCE_META[r.source].label}
              {r.sourceName ? ` • ${r.sourceName}` : ""}
            </div>
            <h2 className="font-display text-2xl">{r.title}</h2>
          </div>
          <button onClick={onClose} className="rounded p-2 text-muted-foreground hover:bg-muted">✕</button>
        </div>

        {/* Counters */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { k: "cookedCount", label: "Cooked", emoji: "🍳" },
            { k: "lovedCount", label: "Loved", emoji: "❤️" },
            { k: "requestedCount", label: "Requested", emoji: "🙌" },
            { k: "sharedCount", label: "Shared", emoji: "📤" },
          ].map((c) => (
            <button
              key={c.k}
              onClick={() => bumpCounter(r.id, c.k as any)}
              className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-xs hover:border-rose-500/40"
            >
              {c.emoji} {c.label} ×{(r as any)[c.k]}
            </button>
          ))}
        </div>

        {/* Story */}
        <section className="mt-4">
          <Label className="text-[11px] uppercase tracking-widest">This reminds me of...</Label>
          <Textarea
            defaultValue={r.story ?? ""}
            rows={3}
            onBlur={(e) => updateRecipe(r.id, { story: e.target.value })}
            placeholder={`"This was Grandma's Christmas pie."`}
          />
        </section>

        {/* Ingredients / instructions */}
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[11px] uppercase tracking-widest">Ingredients</Label>
            <Textarea defaultValue={r.ingredients ?? ""} rows={6} onBlur={(e) => updateRecipe(r.id, { ingredients: e.target.value })} />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-widest">Instructions</Label>
            <Textarea defaultValue={r.instructions ?? ""} rows={6} onBlur={(e) => updateRecipe(r.id, { instructions: e.target.value })} />
          </div>
        </section>

        {/* Holidays */}
        <section className="mt-4">
          <Label className="text-[11px] uppercase tracking-widest">Holidays & traditions</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {HOLIDAYS.map((h) => {
              const on = r.holidays?.includes(h);
              return (
                <button
                  key={h}
                  onClick={() => toggleHoliday(h)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    on ? "border-amber-500 bg-amber-500/10 text-amber-700" : "border-border text-muted-foreground hover:border-amber-500/40"
                  }`}
                >
                  {HOLIDAY_META[h].emoji} {HOLIDAY_META[h].label}
                </button>
              );
            })}
          </div>
          <Textarea
            className="mt-2"
            defaultValue={r.traditions ?? ""}
            rows={2}
            placeholder="Tradition notes — who hosts, what's on the table, what we always say..."
            onBlur={(e) => updateRecipe(r.id, { traditions: e.target.value })}
          />
        </section>

        {/* Special people */}
        <section className="mt-4">
          <Label className="text-[11px] uppercase tracking-widest">Cook this for...</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PEOPLE.map((p) => {
              const on = r.specialPeople?.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePerson(p)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    on ? "border-rose-500 bg-rose-500/10 text-rose-700" : "border-border text-muted-foreground hover:border-rose-500/40"
                  }`}
                >
                  {PERSON_META[p].emoji} {PERSON_META[p].label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Photos */}
        <section className="mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] uppercase tracking-widest">Memory photos</Label>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => photoRef.current?.click()}>
              <Camera className="h-3.5 w-3.5" /> Add photo
            </Button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPhoto(f);
                if (photoRef.current) photoRef.current.value = "";
              }}
            />
          </div>
          {r.photos.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Attach old recipe cards, holiday tables, family dinners, church meals.</p>
          ) : (
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {r.photos.map((p) => (
                <div key={p.id} className="relative">
                  <img src={p.dataUrl} alt="" className="aspect-square w-full rounded-md object-cover" />
                  <button
                    onClick={() => removePhoto(r.id, p.id)}
                    className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Voice notes */}
        <VoiceNotesSection r={r} />

        {/* Timeline */}
        <TimelineSection r={r} />

        {/* Pass it down */}
        <section className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
          <div>
            <div className="font-display text-base">Pass this recipe down</div>
            <div className="text-xs text-muted-foreground">Share with kids, grandkids, relatives, or close friends.</div>
          </div>
          <Button onClick={share} className="gap-1">
            <Share2 className="h-4 w-4" /> Pass it down
          </Button>
        </section>

        <div className="mt-5 flex justify-between">
          <button
            onClick={() => {
              if (confirm(`Remove "${r.title}" from your cookbook?`)) {
                deleteRecipe(r.id);
                onClose();
              }
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1 inline h-3 w-3" /> Remove recipe
          </button>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Voice Notes ----------------
function VoiceNotesSection({ r }: { r: LegacyRecipe }) {
  const [recording, setRecording] = useState(false);
  const [label, setLabel] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result);
          const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
          addVoiceNote(r.id, { dataUrl, durationSec, label: label.trim() || undefined });
          toast.success("Voice memory saved.");
          setLabel("");
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      toast.error("Microphone unavailable.");
    }
  }
  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <section className="mt-4">
      <Label className="text-[11px] uppercase tracking-widest">Voice memory notes</Label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='"Grandma always added extra butter here."'
          className="flex-1 min-w-[200px]"
        />
        {recording ? (
          <Button onClick={stop} variant="destructive" className="gap-1">
            <StopCircle className="h-4 w-4" /> Stop
          </Button>
        ) : (
          <Button onClick={start} variant="outline" className="gap-1">
            <Mic className="h-4 w-4" /> Record
          </Button>
        )}
      </div>
      {r.voiceNotes.length > 0 && (
        <ul className="mt-2 space-y-2">
          {r.voiceNotes.map((n) => (
            <li key={n.id} className="rounded-md border border-border/60 bg-background/70 p-2">
              {n.label && <div className="text-xs italic text-muted-foreground">"{n.label}"</div>}
              <div className="mt-1 flex items-center gap-2">
                <audio controls src={n.dataUrl} className="h-8 flex-1" />
                <button
                  onClick={() => removeVoiceNote(r.id, n.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete voice note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------- Timeline ----------------
function TimelineSection({ r }: { r: LegacyRecipe }) {
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  return (
    <section className="mt-4">
      <Label className="text-[11px] uppercase tracking-widest">Legacy timeline</Label>
      <p className="text-xs text-muted-foreground">Mark when this recipe was used — Thanksgiving 2026, Tammy's birthday, church meal for 100.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Occasion (e.g. Christmas dinner 2026)" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button
          onClick={() => {
            if (!occasion.trim()) return;
            addTimelineEntry(r.id, { occasion: occasion.trim(), date, note: note.trim() || undefined });
            setOccasion("");
            setNote("");
            bumpCounter(r.id, "cookedCount");
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Input className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
      {r.timeline.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {r.timeline.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/70 px-3 py-1.5 text-sm">
              <div className="min-w-0">
                <div className="truncate"><span className="text-muted-foreground">{t.date}</span> — {t.occasion}</div>
                {t.note && <div className="text-xs italic text-muted-foreground">{t.note}</div>}
              </div>
              <button
                onClick={() => removeTimelineEntry(r.id, t.id)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
