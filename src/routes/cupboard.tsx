import { createFileRoute } from "@tanstack/react-router";
import { ScannerApp } from "./index";

export const Route = createFileRoute("/cupboard")({
  head: () => ({
    meta: [
      { title: "Scan Your Cupboard — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Snap your pantry or cupboard shelves. We identify spices, oils, sauces, rice, pasta, canned goods, baking and dry goods — then turn them into meals you can cook tonight.",
      },
      { property: "og:title", content: "Scan Your Cupboard — Use What You Already Have" },
      {
        property: "og:description",
        content:
          "Pantry-first meal ideas built from the spices, sauces, grains, and canned goods you already own.",
      },
      { property: "og:url", content: "https://thefridgeandcupboard.com/cupboard" },
    ],
    links: [{ rel: "canonical", href: "https://thefridgeandcupboard.com/cupboard" }],
  }),
  component: CupboardPage,
});

function CupboardPage() {
  return <ScannerApp showIntro={false} initialStorage="pantry" />;
}
