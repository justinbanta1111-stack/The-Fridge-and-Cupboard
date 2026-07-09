import { createFileRoute } from "@tanstack/react-router";
import { ScannerApp } from "./index";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan Your Fridge — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Take or upload a fridge, freezer, pantry, or cupboard photo and get AI inventory results, freshness warnings, and meal ideas.",
      },
      { property: "og:title", content: "Scan Your Fridge — The Fridge and Cupboard" },
      {
        property: "og:description",
        content: "Upload a food storage photo and turn what's inside into a prioritized cooking plan.",
      },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  return <ScannerApp showIntro={false} />;
}