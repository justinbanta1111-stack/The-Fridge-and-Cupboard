import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChefHat,
  Clock,
  Flame,
  Loader2,
  Mic,
  MicOff,
  Send,
  ShoppingBasket,
  Utensils,
  Bookmark,
  Share2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CookingMode } from "@/components/CookingMode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { recipePhotoPath } from "@/lib/recipe-photo";
import { getScanContext } from "@/lib/scan-context";
import { useDietaryPrefs } from "@/hooks/use-dietary-prefs";
import { getActiveSpeakerId, getSpeakerProfile } from "@/lib/speaker-profiles";
import { buildMealExperience, chefKitchenTurn, type ChefRecipe } from "@/lib/chef-kitchen.functions";
import { speakNow, stopAllAudio, isVoiceSupported } from "@/lib/voice-assistant";
import { VoiceRecognizer, isRecognitionSupported } from "@/lib/voice-recognition";
import { addShoppingItem } from "@/lib/shopping-list";
import { toggleSaved } from "@/lib/saved-items";
import { shareRecipe } from "@/lib/recipe-share";
import { MealCardGrid } from "@/components/MealCardGrid";
import { mealSuggestions } from "@/lib/meal-suggestions";
import { ensureMicPermission, MIC_BLOCKED_MESSAGE } from "@/lib/mic-permission";

export const Route = createFileRoute("/cook-with-chef")({
  validateSearch: (search: Record<string, unknown>) => ({
    meal: typeof search.meal === "string" ? search.meal : "",
  }),
  head: ({ match }) => {
    const meal = match.search.meal || "Cook with Chef Super J";
    return {
      meta: [
        { title: `${meal} — Cook it with Chef Super J · The Fridge and Cupboard` },
        {
          name: "description",
          content:
            "Tap a meal and Chef Super J talks you through it — ingredients, exact amounts, swaps for what you're missing, and one step at a time while you cook.",
        },
        { property: "og:title", content: `${meal} — Cook it with Chef Super J` },
        {
          property: "og:description",
          content: "A real chef beside you: listens, answers, remembers, and guides you to the finished plate.",
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CookWithChefPage,
});

type Msg = { role: "user" | "assistant"; content: string };
type Detail = "brief" | "normal" | "detailed";

const OPENING_CHOICES = [
  "Yes, Let's Cook",
  "Walk Me Through It",
  "Show Me What I Need",
  "I'm Missing Something",
  "Make a Substitution",
  "Make It Easier",
  "Ask the Chef",
];

const FINISH_CHOICES = [
  "Plating Help",
  "Sauce or Garnish Ideas",
  "What Goes With This?",
  "Make Again Later",
];

function CookWithChefPage() {
  const { meal } = Route.useSearch();
  const { restrictions: savedRestrictions } = useDietaryPrefs();

  const [recipe, setRecipe] = useState<ChefRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [memory, setMemory] = useState<string[]>([]);
  const [detail, setDetail] = useState<Detail>("normal");
  const [suggestions, setSuggestions] = useState<string[]>(OPENING_CHOICES);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const [cooking, setCooking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pickerMeals, setPickerMeals] = useState<ReturnType<typeof mealSuggestions>>([]);

  useEffect(() => {
    if (!meal) setPickerMeals(mealSuggestions(9));
  }, [meal]);



  const recRef = useRef<VoiceRecognizer | null>(null);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const restrictions = useMemo(
    () =>
      [
        ...savedRestrictions,
        ...(getSpeakerProfile(getActiveSpeakerId())?.restrictions ?? []),
      ].slice(0, 20),
    [savedRestrictions],
  );

  const memKey = `tfc.chefkitchen.v1:${meal}`;

  /* ---------------- load the recipe ---------------- */
  const buildFn = useServerFn(buildMealExperience);
  const turnFn = useServerFn(chefKitchenTurn);

  async function load(easier = false) {
    if (!meal) return;
    setLoading(true);
    setError("");
    try {
      const have = (getScanContext()?.items ?? []).slice(0, 40);
      const res = await buildFn({ data: { meal, have, restrictions, servings: 2, easier } });
      setRecipe(res);
      setMessages([{ role: "assistant", content: res.chefOpener }]);
      setSuggestions(OPENING_CHOICES);
      speak(res.chefOpener);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chef couldn't pull that recipe up.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Restore anything already established for this dish this session.
    try {
      const raw = sessionStorage.getItem(memKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.memory)) setMemory(parsed.memory);
        if (parsed?.detail) setDetail(parsed.detail);
      }
    } catch {
      /* ignore */
    }
    void load();
    return () => {
      stopListening();
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal]);

  useEffect(() => {
    try {
      sessionStorage.setItem(memKey, JSON.stringify({ memory, detail }));
    } catch {
      /* ignore */
    }
  }, [memKey, memory, detail]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  /* ---------------- voice ---------------- */
  function speak(text: string) {
    if (!isVoiceSupported()) return;
    speakingRef.current = true;
    recRef.current?.stop();
    speakNow(text, {
      onEnd: () => {
        speakingRef.current = false;
        if (listeningRef.current) setTimeout(startCapture, 80);
      },
      onError: () => {
        speakingRef.current = false;
      },
    });
  }

  function startCapture() {
    if (!recRef.current || !listeningRef.current || speakingRef.current) return;
    recRef.current.start({
      onFinal: (t) => {
        if (t.trim()) void send(t);
      },
      onEnd: () => {
        if (listeningRef.current && !speakingRef.current) setTimeout(startCapture, 100);
      },
      onError: () => {},
    });
  }

  async function toggleListening() {
    if (listeningRef.current) {
      stopListening();
      return;
    }
    if (!isRecognitionSupported()) {
      toast("Voice isn't available on this browser — type to Chef instead.");
      return;
    }
    // Ask for the microphone on this exact tap. On iPhone the prompt only
    // appears inside a real user gesture, so this is where it belongs.
    const status = await ensureMicPermission(true);
    if (status !== "granted") {
      toast(MIC_BLOCKED_MESSAGE);
      return;
    }
    if (!recRef.current) recRef.current = new VoiceRecognizer();
    listeningRef.current = true;
    setListening(true);
    toast("Chef's listening — go ahead and talk.");
    startCapture();
  }


  function stopListening() {
    listeningRef.current = false;
    setListening(false);
    recRef.current?.stop();
  }

  /* ---------------- conversation ---------------- */
  async function send(text: string) {
    const msg = text.trim();
    if (!msg || thinking) return;
    setDraft("");

    // The cook barged in — go quiet immediately.
    stopAllAudio();
    speakingRef.current = false;

    if (/^make it easier$/i.test(msg)) {
      setMessages((m) => [...m, { role: "user", content: msg }]);
      void load(true);
      return;
    }

    setMessages((m) => [...m, { role: "user", content: msg }]);
    setThinking(true);
    try {
      const res = await turnFn({
        data: {
          message: msg,
          title: recipe?.title ?? meal,
          steps: (recipe?.steps ?? []).slice(0, 30),
          stepIndex: 0,
          cooking,
          restrictions,
          memory,
          detail,
          history: [...messages, { role: "user" as const, content: msg }].slice(-24),
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.remember?.length) {
        setMemory((prev) => Array.from(new Set([...prev, ...res.remember])).slice(0, 30));
      }
      if (res.detail) setDetail(res.detail);
      if (res.suggestions?.length) setSuggestions(res.suggestions.slice(0, 4));
      speak(res.reply);
      if (res.action === "start_cooking") startCooking();
      if (res.action === "finish") finishUp();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Chef didn't catch that.";
      setMessages((prev) => [...prev, { role: "assistant", content: m }]);
    } finally {
      setThinking(false);
    }
  }

  function startCooking() {
    if (!recipe?.steps?.length) return;
    stopListening();
    stopAllAudio();
    setCooking(true);
  }

  function finishUp() {
    setFinished(true);
    setSuggestions(FINISH_CHOICES);
  }

  function onCloseCooking() {
    setCooking(false);
    finishUp();
    const line = "Nice. That's it. Want help plating it?";
    setMessages((m) => [...m, { role: "assistant", content: line }]);
    setTimeout(() => speak(line), 400);
  }

  function saveRecipe() {
    if (!recipe) return;
    const on = toggleSaved({
      category: "recipes",
      title: recipe.title,
      subtitle: recipe.description,
      ingredients: recipe.ingredients.map((i) => `${i.amount} ${i.item}`.trim()),
      href: `/cook-with-chef?meal=${encodeURIComponent(recipe.title)}`,
    });
    setSaved(on);
    toast.success(on ? "Saved to your recipes." : "Removed from your recipes.");
  }

  function addMissingToList() {
    if (!recipe?.missing?.length) return;
    recipe.missing.forEach((m) => addShoppingItem(m));
    toast.success(`Added ${recipe.missing.length} item(s) to your shopping list.`);
  }

  /* ---------------- render ---------------- */
  if (!meal) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteNav />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="text-center">
            <ChefHat className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
            <h1 className="mt-3 font-display text-2xl">Pick a meal and Chef will cook it with you</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              These are real meals — your own recipes first, then dishes your kitchen already covers.
            </p>
          </div>
          <MealCardGrid className="mt-8" meals={pickerMeals} />
          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <Link to="/recipes">Add one of your own recipes</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-dvh bg-background pb-48">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
        {loading && !recipe && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="mt-3 text-sm">Chef's pulling up {meal}…</p>
          </div>
        )}

        {error && !recipe && (
          <Card className="mt-6 p-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => void load()}>
              Try again
            </Button>
          </Card>
        )}

        {recipe && (
          <>
            <img
              src={recipePhotoPath(recipe.title, recipe.description)}
              alt={recipe.title}
              className="aspect-[16/9] w-full rounded-2xl object-cover shadow-sm"
            />
            <h1 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">{recipe.title}</h1>
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
              {recipe.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {recipe.prepMinutes > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" /> Prep {recipe.prepMinutes} min
                </Badge>
              )}
              {recipe.cookMinutes > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Flame className="h-3 w-3" /> Cook {recipe.cookMinutes} min
                </Badge>
              )}
              {recipe.servings > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Utensils className="h-3 w-3" /> Serves {recipe.servings}
                </Badge>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="lg" className="gap-2" onClick={startCooking}>
                <ChefHat className="h-4 w-4" /> Yes, Let's Cook
              </Button>
              <Button variant="outline" onClick={() => void send("Walk me through it")}>
                Walk Me Through It
              </Button>
              <Button variant="outline" onClick={saveRecipe} className="gap-2">
                <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
                {saved ? "Saved" : "Save Recipe"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  const how = await shareRecipe({
                    title: recipe.title,
                    description: recipe.description,
                    prepMinutes: recipe.prepMinutes,
                    cookMinutes: recipe.cookMinutes,
                    servings: recipe.servings,
                    alsoNeed: recipe.missing,
                    usesFromFridge: recipe.ingredients.filter((i) => i.have).map((i) => i.item),
                    steps: recipe.steps,
                  });
                  if (how === "copied") toast.success("Recipe copied — paste it anywhere.");
                }}
              >
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button asChild variant="ghost">
                <Link to="/recipes">Pick Something Else</Link>
              </Button>
            </div>

            {/* Ingredients */}
            <Card className="mt-6 p-4">
              <h2 className="font-display text-lg">What you need</h2>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {recipe.ingredients.map((i) => (
                  <li key={`${i.item}-${i.amount}`} className="flex items-baseline justify-between gap-3">
                    <span>
                      <span className="font-medium">{i.amount}</span> {i.item}
                    </span>
                    {!i.have && (
                      <span className="shrink-0 text-[11px] uppercase tracking-widest text-amber-600">
                        need
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {recipe.missing.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Missing: {recipe.missing.join(", ")}
                  </p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={addMissingToList}>
                    <ShoppingBasket className="h-3.5 w-3.5" /> Add to shopping list
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void send("I'm missing something")}>
                    Help me work around it
                  </Button>
                </div>
              )}
            </Card>

            {recipe.equipment.length > 0 && (
              <Card className="mt-4 p-4">
                <h2 className="font-display text-lg">Equipment</h2>
                <p className="mt-1 text-[15px] text-muted-foreground">{recipe.equipment.join(" · ")}</p>
              </Card>
            )}

            {recipe.substitutions.length > 0 && (
              <Card className="mt-4 p-4">
                <h2 className="font-display text-lg">Swaps that work</h2>
                <ul className="mt-2 space-y-2 text-[15px]">
                  {recipe.substitutions.map((s) => (
                    <li key={`${s.item}-${s.swap}`}>
                      <span className="font-medium">{s.item}</span> → {s.swap}
                      <span className="block text-xs text-muted-foreground">{s.note}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {finished && (
              <Card className="mt-4 border-primary/40 bg-primary/5 p-4">
                <h2 className="font-display text-lg">Dinner's done</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FINISH_CHOICES.map((c) => (
                    <Button key={c} size="sm" variant="outline" onClick={() => void send(c)}>
                      {c}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" onClick={saveRecipe}>
                    Save This Recipe
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/recipes">Start Another Meal</Link>
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Chef conversation dock — sits below all content, never covers it */}
      {recipe && !cooking && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
        >
          <div className="mx-auto max-w-3xl px-3 pt-2">
            <div ref={scrollRef} className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {messages.slice(-6).map((m, i) => (
                <p
                  key={`${i}-${m.content.slice(0, 10)}`}
                  className={cn(
                    "text-[15px] leading-snug",
                    m.role === "user"
                      ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3 py-1.5 text-primary-foreground"
                      : "text-foreground",
                  )}
                >
                  {m.content}
                </p>
              ))}
              {thinking && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chef's thinking…
                </p>
              )}
            </div>

            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs transition active:scale-95 hover:border-primary/50"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              className="mt-1 flex items-center gap-2 pb-1"
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
            >
              <Button
                type="button"
                size="icon"
                variant={listening ? "default" : "outline"}
                onClick={toggleListening}
                aria-label={listening ? "Stop listening" : "Talk to Chef"}
                className={cn("shrink-0 rounded-full", listening && "animate-pulse")}
              >
                {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask Chef anything…"
                className="h-10"
              />
              <Button type="submit" size="icon" className="shrink-0 rounded-full" aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {recipe && (
        <CookingMode
          open={cooking}
          onClose={onCloseCooking}
          title={recipe.title}
          steps={recipe.steps}
          subtitle={recipe.description}
        />
      )}

      {!recipe && loading && (
        <div className="sr-only" aria-live="polite">
          Loading recipe
        </div>
      )}
    </div>
  );
}
