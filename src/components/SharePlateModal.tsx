import { useCallback, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Camera, Share2, Download, X, ImagePlus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function SharePlateButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={compact ? "sm" : "default"}
        className="gap-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:opacity-95"
      >
        <Camera className="h-4 w-4" /> Share My Plate
      </Button>
      {open && <SharePlateModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function SharePlateCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="ring-paper border-rose-500/20 bg-gradient-to-br from-rose-500/8 via-card to-amber-500/5 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-rose-600">
          <Camera className="h-3.5 w-3.5" /> Share My Plate
        </div>
        <h3 className="mt-1 font-display text-xl">From "uh oh" to "oh wow."</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Snap your fridge before, plate after. Share a side-by-side win to text, Instagram, or Facebook.
        </p>
        <div className="mt-3">
          <SharePlateButton />
        </div>
      </Card>
      {open && <SharePlateModal onClose={() => setOpen(false)} />}
    </>
  );
}

function SharePlateModal({ onClose }: { onClose: () => void }) {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [caption, setCaption] = useState("Made this from what I already had! 🥦✨");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>, which: "before" | "after") {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (which === "before") setBefore(url);
      else setAfter(url);
    };
    reader.readAsDataURL(f);
  }

  const renderBlob = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }, []);

  async function handleShare() {
    if (!before && !after) {
      toast.error("Add a before or after photo first.");
      return;
    }
    setBusy(true);
    try {
      const blob = await renderBlob();
      const text = `${caption}\n\nhttps://thefridgeandcupboard.com`;
      const file = blob ? new File([blob], "my-plate.png", { type: "image/png" }) : null;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (file && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text, title: "My plate" });
      } else if (nav.share) {
        await nav.share({ text, title: "My plate" });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Caption copied. Save the image and paste!");
      }
    } catch {
      /* cancelled */
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!before && !after) return;
    setBusy(true);
    try {
      const blob = await renderBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-plate.png";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Saved! Upload to Instagram or Facebook next.");
    } finally {
      setBusy(false);
    }
  }

  const igUrl = "https://www.instagram.com/";
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://thefridgeandcupboard.com")}&quote=${encodeURIComponent(caption)}`;
  const smsUrl = `sms:?&body=${encodeURIComponent(`${caption} https://thefridgeandcupboard.com`)}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md py-6" onClick={(e) => e.stopPropagation()}>
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-4 text-white shadow-2xl"
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] opacity-90">
            <span>The Fridge &amp; Cupboard</span>
            <span>thefridgeandcupboard.com</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PlateSlot label="Before" img={before} />
            <PlateSlot label="After" img={after} />
          </div>

          <div className="mt-3 font-display text-lg leading-tight">{caption || "My plate today"}</div>
          <div className="mt-1 text-[11px] opacity-90">#FromMyFridge #FridgeAndCupboard</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-1 rounded-md border border-white/20 bg-black/30 px-3 py-2 text-xs text-white hover:bg-black/40">
            <ImagePlus className="h-4 w-4" /> Add Before
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e, "before")} />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-1 rounded-md border border-white/20 bg-black/30 px-3 py-2 text-xs text-white hover:bg-black/40">
            <ImagePlus className="h-4 w-4" /> Add After
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e, "after")} />
          </label>
        </div>

        <div className="mt-2">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="bg-black/30 text-white placeholder:text-white/60 border-white/20"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={handleShare} disabled={busy} className="flex-1 gap-1 bg-white text-rose-700 hover:bg-white/90">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button onClick={handleDownload} disabled={busy} variant="outline" className="gap-1 border-white/40 text-white hover:bg-white/10">
            <Download className="h-4 w-4" /> Save
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          <a href={igUrl} target="_blank" rel="noreferrer" className="rounded-md border border-white/20 bg-black/30 py-2 text-center text-white hover:bg-black/40">
            📸 Instagram
          </a>
          <a href={fbShare} target="_blank" rel="noreferrer" className="rounded-md border border-white/20 bg-black/30 py-2 text-center text-white hover:bg-black/40">
            👍 Facebook
          </a>
          <a href={smsUrl} className="rounded-md border border-white/20 bg-black/30 py-2 text-center text-white hover:bg-black/40">
            💬 Text
          </a>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="mx-auto mt-3 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs text-white hover:bg-black/60"
        >
          <X className="h-3 w-3" /> Close
        </button>
        <p className="mt-2 text-center text-[11px] text-white/80">
          <Sparkles className="-mt-0.5 mr-1 inline h-3 w-3" />
          Instagram doesn't accept direct uploads — Save the image, then paste in IG.
        </p>
      </div>
    </div>
  );
}

function PlateSlot({ label, img }: { label: string; img: string | null }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-white/30 bg-black/30">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-[11px] uppercase tracking-widest text-white/70">
          {label}
        </div>
      )}
      <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}
