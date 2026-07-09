import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChefHat,
  Trophy,
  ThumbsUp,
  Plus,
  Loader2,
  Sparkles,
  Flame,
  Clock,
  LogIn,
  X,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listCommunityRecipes,
  submitCommunityRecipe,
  toggleRecipeUpvote,
  type CommunityRecipe,
} from "@/lib/community.functions";

type Sort = "new" | "top" | "approved";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Recipe Vault — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Real recipes submitted by The Fridge and Cupboard community. Browse what others made with what they had, vote your favorites, and look for the Chef Super J Approved badge.",
      },
      { property: "og:title", content: "Community Recipe Vault" },
      {
        property: "og:description",
        content:
          "Real recipes from real fridges. Upvote, save, and look for the Chef Super J Approved badge.",
      },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const [sort, setSort] = useState<Sort>("new");
  const [signedIn, setSignedIn] = useState(false);
  const [anon, setAnon] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data?.user);
      setAnon(!!data?.user?.is_anonymous);
    });
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s?.user);
      setAnon(!!s?.user?.is_anonymous);
    });
    return () => l.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <Link to="/social-hub" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-fuchsia-500/10 via-rose-400/10 to-sky-400/10 p-3 shadow-sm transition hover:shadow">
          <div className="text-sm font-semibold">Community & Social Hub →</div>
          <div className="text-xs text-muted-foreground">Wins · Challenges · Swap · Groups · Leaderboard · Sponsor</div>
        </Link>
        <section className="py-8 md:py-12">
          <Badge variant="outline" className="border-amber-500/40 text-amber-700 uppercase tracking-widest text-[10px]">
            Community vault
          </Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            Real recipes from real fridges.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
            Share what you cooked. Upvote what works. The standouts earn the{" "}
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <Trophy className="h-3.5 w-3.5" /> Chef Super J Approved
            </span>{" "}
            badge.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SortButton current={sort} value="new" onChange={setSort} icon={Clock} label="Newest" />
            <SortButton current={sort} value="top" onChange={setSort} icon={Flame} label="Top voted" />
            <SortButton current={sort} value="approved" onChange={setSort} icon={Trophy} label="Chef approved" />
            <div className="ml-auto" />
            {signedIn && !anon ? (
              <Button onClick={() => setSubmitOpen(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Submit a recipe
              </Button>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                <LogIn className="h-4 w-4" /> Sign in to submit
              </Link>
            )}
          </div>
        </section>

        <RecipeList sort={sort} signedIn={signedIn && !anon} />
      </main>

      {submitOpen && <SubmitModal onClose={() => setSubmitOpen(false)} />}
    </div>
  );
}

function SortButton({
  current,
  value,
  onChange,
  icon: Icon,
  label,
}: {
  current: Sort;
  value: Sort;
  onChange: (v: Sort) => void;
  icon: typeof Clock;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onChange(value)}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}

function RecipeList({ sort, signedIn }: { sort: Sort; signedIn: boolean }) {
  const fetchList = useServerFn(listCommunityRecipes);
  const upvote = useServerFn(toggleRecipeUpvote);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["community-recipes", sort],
    queryFn: () => fetchList({ data: { sort, limit: 30 } }),
    staleTime: 30_000,
    retry: false,
  });

  const voteMut = useMutation({
    mutationFn: (recipeId: string) => upvote({ data: { recipeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-recipes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <Card className="ring-paper p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const recipes = q.data ?? [];
  if (recipes.length === 0) {
    return (
      <Card className="ring-paper border-dashed bg-muted/20 p-8 text-center">
        <ChefHat className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-2 font-display text-lg">No recipes here yet.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Be the first to share a fridge-rescue meal — your recipe could earn the Chef Super J Approved badge.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {recipes.map((r) => (
        <RecipeCard
          key={r.id}
          recipe={r}
          signedIn={signedIn}
          onVote={() => voteMut.mutate(r.id)}
          pending={voteMut.isPending}
        />
      ))}
    </div>
  );
}

function RecipeCard({
  recipe,
  signedIn,
  onVote,
  pending,
}: {
  recipe: CommunityRecipe;
  signedIn: boolean;
  onVote: () => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="ring-paper border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-lg">{recipe.title}</h3>
            {recipe.chefApproved && (
              <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                <Trophy className="mr-1 h-3 w-3" /> Chef Approved
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.summary}</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            {recipe.cuisine && (
              <span className="rounded-full border border-border/60 px-1.5 py-0.5">{recipe.cuisine}</span>
            )}
            <span>{new Date(recipe.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button
          onClick={signedIn ? onVote : undefined}
          disabled={!signedIn || pending}
          className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-[11px] transition ${
            recipe.iVoted
              ? "border-amber-500/40 bg-amber-500/15 text-amber-700"
              : "border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/40"
          } ${!signedIn ? "opacity-60" : ""}`}
          title={signedIn ? "" : "Sign in to vote"}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span className="font-semibold">{recipe.upvotes}</span>
        </button>
      </div>

      <div className="mt-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="text-xs">
          {open ? "Hide recipe" : "View recipe"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3 text-sm">
          {recipe.imageUrl && (
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full rounded-lg object-cover" />
          )}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ingredients</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {recipe.ingredients.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Steps</div>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              {recipe.steps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Card>
  );
}

function SubmitModal({ onClose }: { onClose: () => void }) {
  const submit = useServerFn(submitCommunityRecipe);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [busy, setBusy] = useState(false);

  const ingredientList = useMemo(
    () =>
      ingredients
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [ingredients],
  );
  const stepList = useMemo(
    () =>
      steps
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [steps],
  );

  async function handleSubmit() {
    setBusy(true);
    try {
      await submit({
        data: {
          title: title.trim(),
          summary: summary.trim(),
          ingredients: ingredientList,
          steps: stepList,
          cuisine: cuisine.trim() || undefined,
        },
      });
      toast.success("Recipe submitted! 🎉");
      qc.invalidateQueries({ queryKey: ["community-recipes"] });
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't submit recipe.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    title.trim().length >= 3 &&
    summary.trim().length >= 10 &&
    ingredientList.length > 0 &&
    stepList.length > 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      <Card
        className="w-full max-w-lg overflow-y-auto bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-700">
            <Sparkles className="h-3.5 w-3.5" /> Submit recipe
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-muted/50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-1 font-display text-xl">Share your fridge-rescue win.</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Real meals from real fridges. Standout recipes get the Chef Super J Approved badge.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pantry pasta with tuna & lemon" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Summary</label>
            <Textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What's in it, what makes it work."
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Ingredients (one per line)
            </label>
            <Textarea
              rows={4}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder={"1 can tuna\n8 oz pasta\nLemon\nOlive oil\nGarlic"}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Steps (one per line)
            </label>
            <Textarea
              rows={5}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={"Boil pasta\nSauté garlic in olive oil\nToss with tuna and lemon"}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Cuisine (optional)</label>
            <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Italian, Tex-Mex, etc." />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || busy} className="gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Submit
          </Button>
        </div>
      </Card>
    </div>
  );
}
