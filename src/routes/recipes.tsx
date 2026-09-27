import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SiteNav } from "@/components/SiteNav";
import { cn } from "@/lib/utils";
import { getScanContext } from "@/lib/scan-context";
import { getTopStaples } from "@/lib/memory-kitchen";
import { addShoppingItem, haveInKitchen } from "@/lib/shopping-list";
import { addMyRecipe, getMyRecipes, removeMyRecipe, type MyRecipe } from "@/lib/my-recipes";
import { toast } from "sonner";
import { MealCardGrid, type MealSuggestion } from "@/components/MealCardGrid";
import { myRecipeSuggestions, kitchenMealSuggestions } from "@/lib/meal-suggestions";


export const Route = createFileRoute("/recipes")({
  component: RecipesPage,
  head: () => ({
    meta: [
      { title: "My Recipes — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "Save your own recipes and instantly see which ingredients are already in your fridge and which ones you still need to buy.",
      },
      { property: "og:title", content: "My Recipes — The Fridge & Cupboard" },
      {
        property: "og:description",
        content: "Add a recipe and see exactly what your fridge already covers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function RecipesPage() {
  const [recipes, setRecipes] = useState<MyRecipe[]>([]);
  const [kitchen, setKitchen] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [ownPicks, setOwnPicks] = useState<MealSuggestion[]>([]);
  const [kitchenPicks, setKitchenPicks] = useState<MealSuggestion[]>([]);

  useEffect(() => {
    setRecipes(getMyRecipes());
    const scan = getScanContext();
    setKitchen([...(scan?.items ?? []), ...getTopStaples()]);
    setOwnPicks(myRecipeSuggestions(9));
    setKitchenPicks(kitchenMealSuggestions(9));
  }, []);


  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !ingredients.trim()) return;
    setRecipes(addMyRecipe(title, ingredients, steps));
    setTitle("");
    setIngredients("");
    setSteps("");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
            <BookOpen className="h-8 w-8 text-primary" aria-hidden />
            My Recipes
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Add a recipe and we'll show which ingredients your fridge already covers.
          </p>
        </header>

        <Card className="mb-6 p-4">
          <form onSubmit={add} className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe name (e.g. Sunday chili)"
              aria-label="Recipe name"
              className="h-14 text-lg"
            />
            <Textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Ingredients — one per line, or separated by commas"
              aria-label="Ingredients"
              rows={4}
              className="text-lg"
            />
            <Textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="Steps (optional)"
              aria-label="Steps"
              rows={3}
              className="text-base"
            />
            <Button type="submit" size="lg" className="h-14 w-full text-lg font-bold">
              <Plus className="mr-1 h-5 w-5" aria-hidden /> Save recipe
            </Button>
          </form>
        </Card>

        {recipes.length === 0 ? (
          <Card className="p-6 text-center text-lg text-muted-foreground">
            No recipes yet. Add one above, or{" "}
            <Link to="/fridge-scan" className="font-semibold text-primary underline">
              scan your fridge
            </Link>{" "}
            first.
          </Card>
        ) : (
          <ul className="space-y-4">
            {recipes.map((r) => (
              <li key={r.id}>
                <RecipeCard
                  recipe={r}
                  kitchen={kitchen}
                  onRemove={() => setRecipes(removeMyRecipe(r.id))}
                />
              </li>
            ))}
          </ul>
        )}

        <MealCardGrid
          className="mt-10"
          heading={ownPicks.length ? "Cook one of yours with Chef" : "Real meals you can cook right now"}
          meals={ownPicks.length ? ownPicks : kitchenPicks}
        />
        {ownPicks.length > 0 && (
          <MealCardGrid
            className="mt-8"
            heading="More real meals from your kitchen"
            meals={kitchenPicks}
          />
        )}
      </main>
    </div>
  );
}


function RecipeCard({
  recipe,
  kitchen,
  onRemove,
}: {
  recipe: MyRecipe;
  kitchen: string[];
  onRemove: () => void;
}) {
  const have = useMemo(
    () => recipe.ingredients.filter((i) => haveInKitchen(i, kitchen)),
    [recipe.ingredients, kitchen],
  );
  const need = useMemo(
    () => recipe.ingredients.filter((i) => !haveInKitchen(i, kitchen)),
    [recipe.ingredients, kitchen],
  );

  function addAllMissing() {
    need.forEach((n) => addShoppingItem(n));
    toast.success(`Added ${need.length} item${need.length === 1 ? "" : "s"} to your grocery list.`);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight">{recipe.title}</h2>
          <p className="text-sm text-muted-foreground">
            {have.length} of {recipe.ingredients.length} ingredients already in your kitchen
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label={`Delete ${recipe.title}`} onClick={onRemove}>
          <Trash2 className="h-5 w-5" aria-hidden />
        </Button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {recipe.ingredients.map((ing) => {
          const got = haveInKitchen(ing, kitchen);
          return (
            <li key={ing} className="flex items-center gap-2 text-base">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black",
                  got ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {got ? <Check className="h-4 w-4" /> : "!"}
              </span>
              <span className={cn(got ? "" : "font-semibold")}>{ing}</span>
              <span className="ml-auto text-sm text-muted-foreground">
                {got ? "in your fridge" : "need to buy"}
              </span>
            </li>
          );
        })}
      </ul>

      {recipe.steps && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-muted/50 p-3 text-base">{recipe.steps}</p>
      )}

      <Button asChild className="mt-4 w-full font-bold">
        <Link to="/cook-with-chef" search={{ meal: recipe.title }}>
          Cook this with Chef Super J
        </Link>
      </Button>

      {need.length > 0 && (
        <Button variant="outline" className="mt-2 w-full font-bold" onClick={addAllMissing}>
          <ShoppingBasket className="mr-2 h-5 w-5" aria-hidden />
          Add {need.length} missing item{need.length === 1 ? "" : "s"} to grocery list
        </Button>
      )}

    </Card>
  );
}
