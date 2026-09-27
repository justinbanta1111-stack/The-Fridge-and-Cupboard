import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Refrigerator, Snowflake, RotateCcw, AlertTriangle, Check, Pencil, Trash2, X, ThumbsUp, ThumbsDown, TrendingUp } from "lucide-react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { analyzeFridge } from "@/lib/fridge.functions";
import { ensureGuestSession } from "@/lib/guest";
import { submitScanFeedback } from "@/lib/feedback.functions";
import { saveScan } from "@/lib/scans.functions";
import { setScanContext } from "@/lib/scan-context";
import { trackScannedItems } from "@/lib/expiry";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


export const Route = createFileRoute("/fridge-scan")({
  head: () => ({
    meta: [
      { title: "Fridge & Freezer Photo Scan — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Upload or snap a fridge or freezer photo and get every detected item with an estimated time since stored and a confidence score.",
      },
      { property: "og:title", content: "Fridge & Freezer Photo Scan" },
      {
        property: "og:description",
        content: "Detected items, estimated time since stored, and confidence scores from one photo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FridgeScanPage,
});

type Analyze = Awaited<ReturnType<typeof analyzeFridge>>;
type Storage = "fridge" | "freezer";

const FRESHNESS_STYLE: Record<string, string> = {
  fresh: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "use-soon": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  questionable: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "throw-out": "bg-red-500/15 text-red-300 border-red-500/30",
};

function confidenceLabel(c: number) {
  if (c >= 0.85) return "High confidence";
  if (c >= 0.6) return "Medium confidence";
  return "Low confidence";
}

type ConfidenceVote = "accurate" | "too-high" | "too-low";
type Override = { name: string; confirmed: boolean; removed: boolean; confidenceVote?: ConfidenceVote };

const LOW_CONFIDENCE = 0.6;

function FridgeScanPage() {
  const [storage, setStorage] = useState<Storage>("fridge");
  const [preview, setPreview] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const analyzeFn = useServerFn(analyzeFridge);
  const sendFeedback = useServerFn(submitScanFeedback);
  const saveScanFn = useServerFn(saveScan);

  const scan = useMutation({
    mutationFn: async (input: { imageDataUrl: string; extraImageDataUrls?: string[] }) => {
      await ensureGuestSession();
      const res = (await analyzeFn({ data: { ...input, storage } })) as Analyze;
      if (!res || !Array.isArray(res.items)) {
        throw new Error("That scan didn't come back. Try another photo.");
      }
      // Keep a permanent record of this scan so it can be compared over time.
      void saveScanFn({
        data: {
          imageDataUrl: input.imageDataUrl,
          items: res.items,
          summary: res.summary,
        },
      }).catch(() => {
        /* history is best-effort — never block the scan */
      });
      return res;
    },
    onSuccess: () => setOverrides({}),
    onError: (err) => toast.error(err instanceof Error ? err.message : "That scan didn't go through. Try another photo."),
  });


  const result = scan.data;

  const itemKey = (item: Analyze["items"][number]) => `${item.name}-${item.priorityRank}`;

  const resolved = useMemo(() => {
    if (!result) return [];
    return result.items.map((item) => {
      const key = itemKey(item);
      const o = overrides[key];
      return {
        item,
        key,
        name: o?.name || item.name,
        confirmed: o?.confirmed ?? false,
        removed: o?.removed ?? false,
        confidenceVote: o?.confidenceVote,
        corrected: !!o?.name && o.name !== item.name,
      };
    });
  }, [result, overrides]);

  // Keep the chef's memory in sync with whatever the user has confirmed or corrected.
  useEffect(() => {
    if (!result) return;
    const usable = resolved.filter((r) => !r.removed && r.item.freshness !== "throw-out" && !r.item.unsafe);
    setScanContext({
      items: usable.map((r) => r.name),
      useFirst: usable
        .filter((r) => r.item.freshness === "use-soon" || r.item.freshness === "questionable")
        .map((r) => r.name),
      summary: result.summary,
      storage,
    });
    // Start gentle expiration reminders for what's in the fridge now.
    trackScannedItems(usable.map((r) => r.name));
  }, [result, resolved, storage]);

  function setOverride(key: string, patch: Partial<Override>) {
    setOverrides((prev) => {
      const base: Override = prev[key] ?? { name: "", confirmed: false, removed: false };
      return { ...prev, [key]: { ...base, ...patch } };
    });
  }

  // Confidence-score feedback: tells us whether the score we showed matched
  // reality, so future scans can be calibrated. Fire-and-forget.
  function rateConfidence(
    entry: { key: string; name: string; item: Analyze["items"][number] },
    vote: ConfidenceVote,
  ) {
    setOverride(entry.key, { confidenceVote: vote });
    const pct = Math.round((entry.item.confidence ?? 0) * 100);
    const noteByVote: Record<ConfidenceVote, string> = {
      accurate: `Confidence ${pct}% was about right`,
      "too-high": `Confidence ${pct}% was too high — the app was more sure than it should have been`,
      "too-low": `Confidence ${pct}% was too low — the detection was actually correct`,
    };
    void sendFeedback({
      data: {
        original: { name: entry.item.name, freshness: entry.item.freshness as never, estimatedAge: entry.item.estimatedAge ?? undefined },
        corrected: { name: entry.name },
        storage,
        note: noteByVote[vote],
      },
    }).catch(() => {
      /* feedback is best-effort — never block the scan flow */
    });
    toast.success("Thanks — that helps future scans");
  }




  function startEdit(key: string, currentName: string) {
    setEditingKey(key);
    setDraftName(currentName);
  }

  function saveEdit(key: string) {
    const name = draftName.trim();
    if (!name) return;
    setOverride(key, { name, confirmed: true, removed: false });
    setEditingKey(null);
    setDraftName("");
    toast.success(`Updated to ${name}`);
  }

  function reset() {
    setPreview(null);
    setOverrides({});
    setEditingKey(null);
    scan.reset();
  }


  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Fridge &amp; Freezer Scan</h1>
        <p className="text-muted-foreground">
          Snap or upload a photo (or a short video pan). You'll get every item we can see, how long it's likely been
          stored, and how sure we are.
        </p>
        <Link
          to="/scan-history"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <TrendingUp className="h-4 w-4" aria-hidden /> Compare your scans over time
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {([
          { key: "fridge", label: "Fridge", icon: Refrigerator },
          { key: "freezer", label: "Freezer", icon: Snowflake },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStorage(key)}
            aria-pressed={storage === key}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border p-4 text-lg font-bold transition",
              storage === key ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card/60 text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {!result && (
        <Card className="p-4">
          <PhotoPicker
            label={storage === "freezer" ? "Photograph your freezer" : "Photograph your fridge"}
            onPick={(_file, dataUrl) => {
              setPreview(dataUrl);
              scan.mutate({ imageDataUrl: dataUrl });
            }}
            onPickMedia={(media) => {
              setPreview(media.primaryDataUrl);
              scan.mutate({
                imageDataUrl: media.primaryDataUrl,
                extraImageDataUrls: media.dataUrls.slice(1, 8),
              });
            }}
          />
        </Card>
      )}

      {preview && (
        <img
          src={preview}
          alt={`Your ${storage} photo being scanned`}
          className="w-full rounded-2xl border border-border object-cover max-h-72"
        />
      )}

      {scan.isPending && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-4 text-lg">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Reading your {storage}…
        </div>
      )}

      {result && (
        <section className="space-y-4">
          <Card className="p-4 space-y-1">
            <h2 className="text-xl font-bold">What we found</h2>
            <p className="text-muted-foreground">{result.summary}</p>
          </Card>

          {result.safetyWarnings?.length > 0 && (
            <Card className="p-4 border-red-500/40 bg-red-500/10 space-y-2">
              <p className="flex items-center gap-2 font-bold text-red-300">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Safety first
              </p>
              <ul className="list-disc pl-5 text-sm text-red-200/90">
                {result.safetyWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Card>
          )}

          <p className="text-sm text-muted-foreground">
            Anything look wrong? Confirm it or swap in the right food — we'll cook from your version, not our guess.
          </p>

          <ul className="space-y-3">
            {resolved.map(({ item, key, name, confirmed, removed, corrected, confidenceVote }) => {
              const pct = Math.round((item.confidence ?? 0) * 100);
              const lowConfidence = (item.confidence ?? 0) < LOW_CONFIDENCE;
              const isEditing = editingKey === key;
              return (
                <li key={key}>
                  <Card
                    className={cn(
                      "p-4 space-y-3 transition",
                      removed && "opacity-50",
                      !removed && lowConfidence && !confirmed && "border-amber-500/50 bg-amber-500/5",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className={cn("text-lg font-bold", removed && "line-through")}>{name}</h3>
                      <div className="flex items-center gap-2">
                        {confirmed && !removed && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                            {corrected ? "You corrected this" : "Confirmed"}
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("capitalize", FRESHNESS_STYLE[item.freshness])}>
                          {item.freshness.replace("-", " ")}
                        </Badge>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Time since stored</dt>
                        <dd className="font-semibold">{item.estimatedAge || "Not clear from the photo"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Time left</dt>
                        <dd className="font-semibold">{item.timeLeftLabel || "—"}</dd>
                      </div>
                    </dl>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{confidenceLabel(item.confidence ?? 0)}</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} aria-label={`Detection confidence for ${name}`} />
                    </div>

                    {!removed && (
                      <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Was that {pct}% confidence right?
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {([
                            { vote: "accurate" as const, label: "Spot on", Icon: ThumbsUp },
                            { vote: "too-high" as const, label: "Too confident", Icon: ThumbsDown },
                            { vote: "too-low" as const, label: "Should be higher", Icon: TrendingUp },
                          ]).map(({ vote, label, Icon }) => (
                            <Button
                              key={vote}
                              size="sm"
                              variant={confidenceVote === vote ? "secondary" : "outline"}
                              onClick={() => rateConfidence({ key, name, item }, vote)}
                              className="gap-1.5 text-xs"
                            >
                              <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
                            </Button>
                          ))}
                        </div>
                        {confidenceVote && (
                          <p className="mt-2 text-xs text-emerald-300">
                            Thanks — we'll use this to tune future scans.
                          </p>
                        )}
                      </div>
                    )}


                    {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}

                    {isEditing ? (
                      <div className="space-y-2">
                        <label htmlFor={`rename-${key}`} className="text-sm font-semibold">
                          What is it really?
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <Input
                            id={`rename-${key}`}
                            autoFocus
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(key);
                              if (e.key === "Escape") setEditingKey(null);
                            }}
                            placeholder="e.g. leftover roast chicken"
                            className="min-w-[12rem] flex-1 text-base"
                          />
                          <Button onClick={() => saveEdit(key)} className="gap-2">
                            <Check className="h-4 w-4" aria-hidden /> Save
                          </Button>
                          <Button variant="ghost" onClick={() => setEditingKey(null)} className="gap-2">
                            <X className="h-4 w-4" aria-hidden /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lowConfidence && !confirmed && !removed && (
                          <p className="text-sm font-semibold text-amber-300">
                            We're not sure about this one — is it right?
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {removed ? (
                            <Button variant="outline" onClick={() => setOverride(key, { removed: false })} className="gap-2">
                              <RotateCcw className="h-4 w-4" aria-hidden /> Put it back
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant={confirmed ? "secondary" : "default"}
                                onClick={() => setOverride(key, { confirmed: true })}
                                className="gap-2"
                              >
                                <Check className="h-4 w-4" aria-hidden /> {confirmed ? "Confirmed" : "Yes, that's right"}
                              </Button>
                              <Button variant="outline" onClick={() => startEdit(key, name)} className="gap-2">
                                <Pencil className="h-4 w-4" aria-hidden /> It's something else
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => setOverride(key, { removed: true, confirmed: false })}
                                className="gap-2 text-muted-foreground"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden /> Not there
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>


          <div className="flex flex-wrap gap-3">
            <Button onClick={reset} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden /> Scan again
            </Button>
            <Button asChild>
              <Link to="/leftovers">See what to cook first</Link>
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
