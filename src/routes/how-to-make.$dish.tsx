import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { GuidePage, GuideSection, LinkGrid } from "@/components/seo/GuidePage";
import { Button } from "@/components/ui/button";
import { DISHES, SITE_URL, findDish, isoDuration, type Dish } from "@/lib/seo/content";
import { pageHead, breadcrumbLd, noindexMeta } from "@/lib/seo/meta";
import { recipePhotoPath, recipePhotoUrl } from "@/lib/recipe-photo";
import { addShoppingItem } from "@/lib/shopping-list";
import { RecipeActions } from "@/components/RecipeActions";
import { DishPhotoGallery } from "@/components/DishPhotoGallery";
import type { ShareableRecipe } from "@/lib/recipe-share";

function dishToShareable(dish: Dish): ShareableRecipe {
  return {
    title: dish.name,
    description: dish.summary,
    usesFromFridge: dish.ingredients,
    steps: dish.steps,
    prepMinutes: dish.prepMinutes,
    cookMinutes: dish.cookMinutes,
    servings: dish.servings,
    chefTip: dish.tips[0] ?? null,
  };
}


export const Route = createFileRoute("/how-to-make/$dish")({
  loader: ({ params }) => {
    const dish = findDish(params.dish);
    if (!dish) throw notFound();
    return { dish };
  },
  head: ({ params, loaderData }) => {
    const dish = loaderData?.dish;
    if (!dish) {
      return { meta: [{ title: "Recipe not found" }, noindexMeta] };
    }
    const title = `How to Make ${dish.name} — Recipe, Time & Temperature`;
    const description = `${dish.summary} Ready in about ${dish.prepMinutes + dish.cookMinutes} minutes, serves ${dish.servings}.`;
    return pageHead({
      title,
      description,
      path: `/how-to-make/${params.dish}`,
      ogKind: "recipe",
      image: recipePhotoUrl(dish.name, dish.summary),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          name: dish.name,
          description: dish.summary,
          image: [recipePhotoUrl(dish.name, dish.summary)],

          recipeCategory: dish.category,
          recipeCuisine: dish.cuisine,
          recipeYield: `${dish.servings} servings`,
          prepTime: isoDuration(dish.prepMinutes),
          cookTime: isoDuration(dish.cookMinutes),
          totalTime: isoDuration(dish.prepMinutes + dish.cookMinutes),
          recipeIngredient: dish.ingredients,
          recipeInstructions: dish.steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            text: s,
          })),
          author: { "@type": "Organization", name: "The Fridge and Cupboard" },
          url: `${SITE_URL}/how-to-make/${dish.slug}`,
        },
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "How to Make", path: "/how-to-make" },
          { name: dish.name, path: `/how-to-make/${dish.slug}` },
        ]),
      ],
    });
  },
  component: DishPage,
  notFoundComponent: DishNotFound,
});

function DishNotFound() {
  return (
    <GuidePage title="Recipe not found" intro="Browse the full recipe library instead.">
      <Link to="/how-to-make" className="text-primary underline">
        All recipes
      </Link>
    </GuidePage>
  );
}

function DishPage() {
  const { dish } = Route.useLoaderData();
  const related = DISHES.filter((d) => d.slug !== dish.slug && d.category === dish.category).slice(0, 4);

  return (
    <GuidePage
      eyebrow={`${dish.cuisine} · ${dish.category}`}
      title={`How to Make ${dish.name}`}
      intro={dish.summary}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "How to Make", to: "/how-to-make" },
      ]}
    >
      <DishPhotoGallery
        slug={dish.slug}
        dishName={dish.name}
        stockPhoto={recipePhotoPath(dish.name, dish.summary)}
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Prep" value={`${dish.prepMinutes} min`} />
        <Stat label="Cook" value={`${dish.cookMinutes} min`} />
        <Stat label="Serves" value={String(dish.servings)} />
        <Stat label="Oven" value={dish.ovenTemp ?? "Stovetop"} />
      </dl>

      <AddDishToShoppingList dish={dish} />
      <RecipeActions recipe={dishToShareable(dish)} />


      <GuideSection heading="Ingredients">
        <ul className="list-disc space-y-1 pl-5">
          {dish.ingredients.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection heading={`How to cook ${dish.name.toLowerCase()} step by step`}>
        <ol className="list-decimal space-y-2 pl-5">
          {dish.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection heading="Chef's tips">
        <ul className="list-disc space-y-1 pl-5">
          {dish.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection heading="Cook it with what you already have">
        <p className="text-muted-foreground">
          Scan your fridge or cupboard and The Fridge and Cupboard will tell you what you can make from this
          recipe right now, and what to swap for anything missing.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link to="/scan" className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground">
            Scan your fridge
          </Link>
          <Link to="/cupboard" className="rounded-full border border-border px-4 py-2">
            Scan your cupboard
          </Link>
        </div>
      </GuideSection>

      {related.length > 0 && (
        <GuideSection heading="More recipes like this">
          <LinkGrid
            items={related.map((d) => ({
              to: "/how-to-make/$dish",
              params: { dish: d.slug },
              title: `How to make ${d.name}`,
            }))}
          />
        </GuideSection>
      )}
    </GuidePage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function AddDishToShoppingList({ dish }: { dish: Dish }) {
  const [added, setAdded] = useState(false);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button
        onClick={() => {
          for (const line of dish.ingredients) addShoppingItem(line);
          setAdded(true);
          toast.success(`Added ${dish.ingredients.length} ingredients to your shopping list.`);
        }}
      >
        {added ? <Check className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
        {added ? "On your shopping list" : "Add ingredients to shopping list"}
      </Button>
      <Link to="/shopping-list" className="text-sm text-primary underline">
        Open shopping list
      </Link>
    </div>
  );
}
