import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import html2canvas from "html2canvas";
import { Award, DollarSign, Recycle, ShoppingCart, Share2, Download, Copy, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSavingsSummary } from "@/lib/savings.functions";
import { supabase } from "@/integrations/supabase/client";

type BragKind = "savings" | "trips" | "rescued";

const TRIP_COST_CENTS = 4500; // ~$45 avoided per skipped trip — rough but realistic

function money(cents: number) {
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
  return `$${d.toFixed(d < 10 && d > 0 ? 2 : 0)}`;
}

function tripsAvoided(weekMeals: number) {
  // Assume ~3 meals at home = 1 grocery trip skipped.
  return Math.floor(weekMeals / 3);
}

export function SavingsBragMode() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => l.subscription.unsubscribe();
  }, []);

  const getSummary = useServerFn(getSavingsSummary);
  const q = useQuery({
    queryKey: ["savings-summary-brag"],
    queryFn: () => getSummary(),
    enabled: signedIn,
    staleTime: 60_000,
    retry: false,
  });

  const [open, setOpen] = useState<BragKind | null>(null);

  const data = q.data;
  const weekTrips = useMemo(() => tripsAvoided(data?.weekMeals ?? 0), [data?.weekMeals]);
  const monthTrips = useMemo(() => tripsAvoided(data?.monthMeals ?? 0), [data?.monthMeals]);

  return (
    <>
      <Card className="ring-paper border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-card to-amber-500/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-700">
            <Award className="h-3.5 w-3.5" /> Brag Mode
          </div>
          {data && (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
              {data.streakDays}-day streak
            </Badge>
          )}
        </div>
        <h3 className="mt-1 font-display text-xl">Share what you saved this week.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          One tap creates a shareable badge for text, Instagram, or Facebook.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <BragTile
            tone="emerald"
            icon={DollarSign}
            label="Saved this week"
            value={money(data?.weekCents ?? 0)}
            onClick={() => setOpen("savings")}
          />
          <BragTile
            tone="amber"
            icon={ShoppingCart}
            label="Grocery trips skipped"
            value={`${weekTrips}`}
            onClick={() => setOpen("trips")}
          />
          <BragTile
            tone="violet"
            icon={Recycle}
            label="Foods rescued"
            value={`${data?.mealsCount ?? 0}`}
            onClick={() => setOpen("rescued")}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5">
            ≈ {money(monthTrips * TRIP_COST_CENTS)} in skipped trips this month
          </span>
          <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5">
            {(data?.totalPounds ?? 0).toFixed(1)} lb total rescued
          </span>
        </div>
      </Card>

      {open && data && (
        <BragShareModal
          kind={open}
          onClose={() => setOpen(null)}
          weekCents={data.weekCents}
          monthCents={data.monthCents}
          weekTrips={weekTrips}
          monthTrips={monthTrips}
          totalPounds={data.totalPounds}
          mealsCount={data.mealsCount}
          streakDays={data.streakDays}
        />
      )}
    </>
  );
}

function BragTile({
  tone,
  icon: Icon,
  label,
  value,
  onClick,
}: {
  tone: "emerald" | "amber" | "violet";
  icon: typeof DollarSign;
  label: string;
  value: string;
  onClick: () => void;
}) {
  const palette: Record<typeof tone, string> = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 border-emerald-500/30",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-700 border-amber-500/30",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-700 border-violet-500/30",
  };
  return (
    <button
      onClick={onClick}
      className={`group rounded-xl border bg-gradient-to-br p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${palette[tone]}`}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4" />
        <Share2 className="h-3 w-3 opacity-60 transition group-hover:opacity-100" />
      </div>
      <div className="mt-2 font-display text-2xl leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest opacity-80">{label}</div>
    </button>
  );
}

function BragShareModal({
  kind,
  onClose,
  weekCents,
  monthCents,
  weekTrips,
  monthTrips,
  totalPounds,
  mealsCount,
  streakDays,
}: {
  kind: BragKind;
  onClose: () => void;
  weekCents: number;
  monthCents: number;
  weekTrips: number;
  monthTrips: number;
  totalPounds: number;
  mealsCount: number;
  streakDays: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const { headline, sub, accent, emoji, text } = useMemo(() => {
    if (kind === "savings") {
      return {
        headline: `I saved ${money(weekCents)} this week`,
        sub: `${money(monthCents)} this month with The Fridge & Cupboard`,
        accent: "from-emerald-500 to-emerald-700",
        emoji: "💵",
        text: `I saved ${money(weekCents)} this week cooking from what I already had. 🥦✨\n\nhttps://thefridgeandcupboard.com`,
      };
    }
    if (kind === "trips") {
      return {
        headline: `I skipped ${weekTrips} grocery trip${weekTrips === 1 ? "" : "s"}`,
        sub: `${monthTrips} skipped this month using my fridge & cupboard`,
        accent: "from-amber-500 to-orange-600",
        emoji: "🛒",
        text: `I skipped ${weekTrips} grocery trip${weekTrips === 1 ? "" : "s"} this week — cooked from what I already had. 🛒❌\n\nhttps://thefridgeandcupboard.com`,
      };
    }
    return {
      headline: `I rescued ${mealsCount} food${mealsCount === 1 ? "" : "s"}`,
      sub: `${totalPounds.toFixed(1)} lb saved from the trash`,
      accent: "from-violet-500 to-fuchsia-600",
      emoji: "♻️",
      text: `I rescued ${mealsCount} food${mealsCount === 1 ? "" : "s"} (${totalPounds.toFixed(1)} lb) from being thrown away. ♻️🌍\n\nhttps://thefridgeandcupboard.com`,
    };
  }, [kind, weekCents, monthCents, weekTrips, monthTrips, mealsCount, totalPounds]);

  const renderBlob = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }, []);

  async function handleShare() {
    setBusy(true);
    try {
      const blob = await renderBlob();
      const file = blob ? new File([blob], "fac-brag.png", { type: "image/png" }) : null;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (file && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text, title: "My fridge & cupboard win" });
      } else if (nav.share) {
        await nav.share({ text, title: "My fridge & cupboard win" });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied! Paste it anywhere.");
      }
    } catch (e) {
      // user cancelled or share failed silently
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const blob = await renderBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fridge-cupboard-${kind}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Saved to your device");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div
          ref={cardRef}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-2xl ${accent}`}
        >
          <div className="text-[10px] uppercase tracking-[0.25em] opacity-80">The Fridge &amp; Cupboard</div>
          <div className="mt-3 text-5xl">{emoji}</div>
          <div className="mt-2 font-display text-2xl leading-tight">{headline}</div>
          <p className="mt-1 text-sm opacity-90">{sub}</p>
          <div className="mt-4 flex items-center justify-between text-[11px] opacity-90">
            <span>{streakDays}-day streak 🔥</span>
            <span>thefridgeandcupboard.com</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={handleShare} disabled={busy} className="flex-1 gap-1">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button onClick={handleDownload} disabled={busy} variant="outline" className="gap-1">
            <Download className="h-4 w-4" /> Save
          </Button>
          <Button onClick={handleCopy} variant="outline" className="gap-1">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy text"}
          </Button>
          <Button onClick={onClose} variant="ghost" size="icon" aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-2 text-center text-[11px] text-white/80">
          Tap Share to post to Instagram, Facebook, or text. Save to upload manually.
        </p>
      </div>
    </div>
  );
}
