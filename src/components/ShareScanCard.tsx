import { useRef, useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { ChefHat, Clock, AlertTriangle, Trash2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AnalyzeResult = {
  items: Array<{
    name: string;
    freshness: string;
    category?: string;
    timeLeftLabel?: string;
    estimatedQuantity?: string;
    estimatedAge?: string;
    confidence?: number;
    unsafe?: boolean;
    unsafeReason?: string;
    priorityRank?: number;
    timeLeftMinDays?: number;
    timeLeftMaxDays?: number;
    notes?: string;
  }>;
  summary?: string;
  safetyWarnings?: string[];
  chefNote?: string;
  priorityOrder?: string[];
};

type RecipesResult = {
  recipes: Array<{
    title: string;
    description: string;
    timeMinutes: number;
    difficulty: string;
    usesFromFridge: string[];
    alsoNeed: string[];
    steps: string[];
  }>;
};

const freshnessEmoji: Record<string, string> = {
  fresh: "✨",
  "use-soon": "⏰",
  questionable: "⚠️",
  "throw-out": "🗑️",
};

const freshnessColor: Record<string, string> = {
  fresh: "#22c55e",
  "use-soon": "#f59e0b",
  questionable: "#f97316",
  "throw-out": "#ef4444",
};

export function ShareScanModal({
  imageDataUrl,
  analysis,
  recipes,
  open,
  onClose,
}: {
  imageDataUrl: string;
  analysis: AnalyzeResult;
  recipes?: RecipesResult;
  open: boolean;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `fridge-scan-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Failed to generate image", e);
    } finally {
      setDownloading(false);
    }
  }, []);

  if (!open) return null;

  const useSoon = analysis.items.filter(
    (i) => i.freshness === "use-soon" && i.category !== "leftover"
  );
  const leftovers = analysis.items.filter((i) => i.category === "leftover");
  const goingBad = analysis.items.filter(
    (i) =>
      i.freshness === "use-soon" &&
      i.category !== "leftover" &&
      (i.timeLeftMaxDays ?? 99) <= 2
  );
  const toss = analysis.items.filter(
    (i) => i.freshness === "throw-out" || i.freshness === "questionable"
  );
  const topRecipe = recipes?.recipes?.[0];

  // Pick top 4 urgent items for the card
  const urgentItems = [...analysis.items]
    .filter((i) => i.freshness === "use-soon" || i.freshness === "throw-out" || i.category === "leftover")
    .sort((a, b) => {
      const ra = a.freshness === "throw-out" ? 0 : a.category === "leftover" ? 1 : 2;
      const rb = b.freshness === "throw-out" ? 0 : b.category === "leftover" ? 1 : 2;
      if (ra !== rb) return ra - rb;
      return (a.priorityRank ?? 99) - (b.priorityRank ?? 99);
    })
    .slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-2xl border border-border/60 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h3 className="font-display text-lg">Share your scan</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* The shareable card */}
          <div
            ref={cardRef}
            className="mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-border/40 bg-white shadow-lg"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            {/* Header */}
            <div
              className="px-5 py-4"
              style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}
            >
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z"/><path d="M5 10h14"/><path d="M15 7v3"/></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">The Fridge and Cupboard</div>
                  <div className="text-[10px] text-white/60 uppercase tracking-wider">AI Inventory Scan</div>
                </div>
              </div>
            </div>

            {/* Photo */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
              <img
                src={imageDataUrl}
                alt="Fridge scan"
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                <div className="text-xs font-medium text-white/80">
                  {analysis.items.length} items found · {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-0 border-b border-gray-100">
              {[
                { label: "Use Soon", value: useSoon.length, color: "#f59e0b", icon: "⏰" },
                { label: "Leftovers", value: leftovers.length, color: "#8b5cf6", icon: "🍽️" },
                { label: "Going Bad", value: goingBad.length, color: "#ef4444", icon: "🚨" },
                { label: "Toss", value: toss.length, color: "#6b7280", icon: "🗑️" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center border-r border-gray-100 px-2 py-3 last:border-r-0">
                  <span className="text-lg">{stat.icon}</span>
                  <span className="mt-0.5 text-base font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Urgent items list */}
            <div className="px-5 py-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                Priority Items
              </div>
              <div className="space-y-2.5">
                {urgentItems.map((item, i) => {
                  const color = freshnessColor[item.freshness] ?? "#22c55e";
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.timeLeftLabel || item.estimatedQuantity || freshnessEmoji[item.freshness]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tonight's recipe preview */}
            {topRecipe && (
              <div className="border-t border-gray-100 px-5 py-4" style={{ background: "#f8fafc" }}>
                <div className="mb-2 flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Tonight's Pick
                  </span>
                </div>
                <div className="text-base font-bold text-gray-900">{topRecipe.title}</div>
                <div className="mt-0.5 text-xs text-gray-600">{topRecipe.description}</div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
                  <span>⏱ {topRecipe.timeMinutes} min</span>
                  <span>🍳 {topRecipe.difficulty}</span>
                </div>
              </div>
            )}

            {/* Chef note */}
            {analysis.chefNote && (
              <div className="border-t border-gray-100 px-5 py-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="text-[11px] italic leading-relaxed text-gray-600">
                    {analysis.chefNote}
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">thefridgeandcupboard.com</span>
                <span className="text-[10px] font-medium text-indigo-600">Scan your fridge →</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border/60 px-5 py-4">
          <Button
            className="flex-1 bg-primary uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? "Generating…" : "Download PNG"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
