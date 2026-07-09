import { useCallback, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Share2, Download, Copy, Check, X, Flame, Leaf, ChefHat, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type SavingsShareData = {
  monthCents: number;
  totalPounds: number;
  meals: number;
  streakDays: number;
};

function money(cents: number) {
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
  return `$${d.toFixed(d < 10 && d > 0 ? 2 : 0)}`;
}

function buildShareText(d: SavingsShareData) {
  const parts: string[] = [];
  parts.push(`I saved ${money(d.monthCents)} this month`);
  if (d.meals > 0) parts.push(`and cooked ${d.meals} meal${d.meals === 1 ? "" : "s"} from ingredients I already had`);
  else if (d.totalPounds > 0) parts.push(`and rescued ${d.totalPounds.toFixed(1)} lb of food from waste`);
  let text = parts.join(" ") + " with The Fridge & Cupboard! 🥦✨";
  if (d.streakDays > 1) text += ` ${d.streakDays}-day cooking streak going strong. 🔥`;
  text += "\n\nhttps://thefridgeandcupboard.com";
  return text;
}

export function SavingsShareModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: SavingsShareData;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareText = buildShareText(data);

  const renderCanvas = useCallback(async () => {
    if (!cardRef.current) return null;
    return html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
  }, []);

  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));

  const handleNativeShare = useCallback(async () => {
    setBusy(true);
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas);
      const file = blob ? new File([blob], `fridge-cupboard-savings.png`, { type: "image/png" }) : null;
      const navAny = navigator as Navigator & { canShare?: (d: ShareData) => boolean };

      if (file && navAny.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText, title: "My Fridge & Cupboard wins" });
        toast.success("Shared!");
        return;
      }
      if (navigator.share) {
        await navigator.share({ text: shareText, title: "My Fridge & Cupboard wins", url: "https://thefridgeandcupboard.com" });
        toast.success("Shared!");
        return;
      }
      // Fallback: download the image so the user can attach it manually.
      const link = document.createElement("a");
      link.download = `fridge-cupboard-savings.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Card saved — attach it to your post!");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        toast.error("Couldn't open share. Try downloading the card instead.");
      }
    } finally {
      setBusy(false);
    }
  }, [renderCanvas, shareText]);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `fridge-cupboard-savings.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Saved to your downloads!");
    } finally {
      setBusy(false);
    }
  }, [renderCanvas]);

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  }, [shareText]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[94vh] w-full max-w-md flex-col rounded-2xl border border-border/60 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h3 className="font-display text-lg font-bold">Share your wins</h3>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* The shareable card — sized 1080x1350 (Instagram 4:5) */}
          <div className="mx-auto w-full max-w-[360px]">
            <div
              ref={cardRef}
              className="overflow-hidden rounded-3xl"
              style={{
                fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                width: "100%",
                aspectRatio: "4 / 5",
                background:
                  "linear-gradient(135deg, #f97316 0%, #ef4444 35%, #db2777 70%, #7c3aed 100%)",
                color: "#fff",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                boxShadow: "0 24px 80px -20px rgba(0,0,0,0.5)",
              }}
            >
              {/* Decorative emoji blobs */}
              <div style={{ position: "absolute", top: 14, right: 18, fontSize: 32, opacity: 0.85 }}>🥦</div>
              <div style={{ position: "absolute", bottom: 90, left: 14, fontSize: 28, opacity: 0.7 }}>🍅</div>
              <div style={{ position: "absolute", top: 120, left: 16, fontSize: 22, opacity: 0.6 }}>🧅</div>
              <div style={{ position: "absolute", bottom: 18, right: 18, fontSize: 26, opacity: 0.75 }}>🧄</div>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    height: 38, width: 38, borderRadius: 12, background: "rgba(255,255,255,0.18)",
                    display: "grid", placeItems: "center", fontSize: 20,
                  }}
                >
                  🧊
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>The Fridge &amp; Cupboard</div>
                  <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 2 }}>
                    Use what you already have
                  </div>
                </div>
              </div>

              {/* Headline */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  This month I saved
                </div>
                <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 1, marginTop: 6, letterSpacing: "-0.02em", textShadow: "0 4px 24px rgba(0,0,0,0.25)" }}>
                  {money(data.monthCents)}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, opacity: 0.95, marginTop: 8, maxWidth: 280 }}>
                  by cooking with what I already had in my fridge &amp; cupboard.
                </div>
              </div>

              {/* Stat grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Stat emoji="🥬" label="Food rescued" value={`${data.totalPounds.toFixed(1)} lb`} />
                <Stat emoji="👨‍🍳" label="Meals cooked" value={`${data.meals}`} />
                <Stat emoji="🔥" label="Cooking streak" value={`${data.streakDays} ${data.streakDays === 1 ? "day" : "days"}`} />
                <Stat emoji="🌱" label="Less waste" value="Earth wins" />
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>thefridgeandcupboard.com</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>Try it free →</div>
              </div>
            </div>
          </div>

          {/* Caption preview */}
          <div className="mt-4 rounded-xl border border-border/60 bg-secondary/40 p-3 text-sm text-foreground">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Caption</div>
            <p className="whitespace-pre-wrap leading-relaxed">{shareText}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 p-4 sm:flex-row">
          <Button onClick={handleNativeShare} disabled={busy} className="flex-1">
            <Share2 className="mr-2 h-4 w-4" /> Share now
          </Button>
          <Button onClick={handleDownload} disabled={busy} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" /> Download card
          </Button>
          <Button onClick={handleCopyText} variant="ghost" className="sm:flex-none">
            {copied ? <><Check className="mr-2 h-4 w-4" /> Copied</> : <><Copy className="mr-2 h-4 w-4" /> Copy caption</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.16)",
        borderRadius: 14,
        padding: "10px 12px",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.22)",
      }}
    >
      <div style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, lineHeight: 1.05 }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// Re-export icons so SavingsDashboard can keep its imports tight if it wants them.
export const SavingsShareIcons = { Share2, Flame, Leaf, ChefHat, DollarSign };
