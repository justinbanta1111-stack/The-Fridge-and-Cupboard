import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { CuisineWheel } from "@/components/CuisineWheel";

export const Route = createFileRoute("/around-the-world")({
  head: () => ({
    meta: [
      { title: "Around the World Night — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Spin the cuisine wheel and let Chef Super J build a meal from anywhere in the world — Italian, Thai, Mexican, Greek, Japanese, Indian, and more.",
      },
    ],
  }),
  component: AroundTheWorldPage,
});

function AroundTheWorldPage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl">Around the World Night</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Stuck in a rotation rut? Spin the wheel, get a cuisine, and let Chef Super J build dinner.
        </p>
        <div className="mt-8">
          <CuisineWheel />
        </div>
      </main>
    </div>
  );
}
