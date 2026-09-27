import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Printer, Share2, ChefHat } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { decodeRecipe, printRecipe, shareRecipe, type ShareableRecipe } from "@/lib/recipe-share";
import { recipePhotoPath, recipePhotoUrl } from "@/lib/recipe-photo";

import { toast } from "sonner";

export const Route = createFileRoute("/recipe-card")({
  validateSearch: (search: Record<string, unknown>) => ({
    r: typeof search.r === "string" ? search.r : "",
  }),
  head: ({ match }) => {
    const shared = match.search.r ? decodeRecipe(match.search.r) : null;
    const title = shared?.title ?? "Shared Recipe Card";
    const description =
      shared?.description ??
      "A clean, printable recipe card shared from The Fridge and Cupboard — ingredients, steps and chef tips in one page.";
    const image = recipePhotoUrl(title, shared?.description);
    return {
      meta: [
        { title: `${title} — The Fridge and Cupboard` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} — The Fridge and Cupboard` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
        { name: "robots", content: "noindex" },
      ],
    };
  },

  component: RecipeCardPage,
});

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-[15px] leading-relaxed">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}

function RecipeCardPage() {
  const { r } = Route.useSearch();
  const recipe: ShareableRecipe | null = useMemo(() => (r ? decodeRecipe(r) : null), [r]);

  return (
    <div className="min-h-dvh bg-background">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {!recipe ? (
          <Card className="p-6 text-center">
            <ChefHat className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <h1 className="mt-3 font-display text-2xl">This recipe link didn't open</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The link may have been cut short when it was sent. Ask for it again, or make your own
              from what's in your kitchen.
            </p>
            <Button asChild className="mt-4">
              <Link to="/">Scan my fridge</Link>
            </Button>
          </Card>
        ) : (
          <article>
            <img
              src={recipePhotoPath(recipe.title, recipe.description)}
              alt={`A serving of ${recipe.title}`}
              width={1200}
              height={630}
              className="mb-5 aspect-[1200/630] w-full rounded-2xl object-cover shadow-sm"
            />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              The Fridge &amp; Cupboard
            </p>

            <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">{recipe.title}</h1>
            {recipe.description && (
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {recipe.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {typeof recipe.prepMinutes === "number" && recipe.prepMinutes > 0 && (
                <span>Prep {recipe.prepMinutes} min</span>
              )}
              {typeof recipe.cookMinutes === "number" && recipe.cookMinutes > 0 && (
                <span>Cook {recipe.cookMinutes} min</span>
              )}
              {typeof recipe.timeMinutes === "number" && recipe.timeMinutes > 0 && (
                <span>Total {recipe.timeMinutes} min</span>
              )}
              {typeof recipe.servings === "number" && recipe.servings > 0 && (
                <span>Serves {recipe.servings}</span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 print:hidden">
              <Button
                type="button"
                className="h-11"
                onClick={async () => {
                  const how = await shareRecipe(recipe);
                  if (how === "copied") toast.success("Recipe copied — paste it anywhere.");
                }}
                aria-label="Share this recipe"
              >
                <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Share
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => printRecipe(recipe)}
                aria-label="Print this recipe"
              >
                <Printer className="mr-2 h-4 w-4" aria-hidden="true" /> Print
              </Button>
            </div>

            <List title="What you already have" items={recipe.usesFromFridge} />
            <List title="Also need" items={recipe.alsoNeed} />

            {recipe.steps?.length ? (
              <section className="mt-6">
                <h2 className="font-display text-lg">Steps</h2>
                <ol className="mt-2 list-decimal space-y-2 pl-6 text-[15px] leading-relaxed">
                  {recipe.steps.map((s, i) => (
                    <li key={`${i}-${s.slice(0, 12)}`}>{s}</li>
                  ))}
                </ol>
              </section>
            ) : null}

            {recipe.chefTip && (
              <p className="mt-6 rounded-xl bg-secondary p-4 text-[15px]">
                <strong>Chef Super J tip:</strong> {recipe.chefTip}
              </p>
            )}
            {recipe.storageTip && (
              <p className="mt-3 rounded-xl bg-secondary p-4 text-[15px]">
                <strong>Leftovers:</strong> {recipe.storageTip}
              </p>
            )}

            <p className="mt-8 text-sm text-muted-foreground print:hidden">
              Want meals from your own kitchen?{" "}
              <Link to="/" className="text-primary underline">
                Scan your fridge
              </Link>
              .
            </p>
          </article>
        )}
      </main>
    </div>
  );
}
