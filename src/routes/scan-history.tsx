import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Camera, Loader2, Minus, Plus, Repeat, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getScanHistory, type ScanSnapshot } from "@/lib/scans.functions";
import { ensureGuestSession } from "@/lib/guest";

export const Route = createFileRoute("/scan-history")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Scan History — Compare Your Fridge Over Time" },
      {
        name: "description",
        content:
          "Every fridge and cupboard scan is saved so you can compare them over time — see what was added, what got used, and which foods keep going bad.",
      },
      { property: "og:title", content: "Scan History — Compare Your Fridge Over Time" },
      {
        property: "og:description",
        content: "See how your fridge changes scan by scan: items added, items used up, staples, and repeat waste.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanHistoryPage,
});

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ChangeList({
  label,
  names,
  tone,
  icon: Icon,
}: {
  label: string;
  names: string[];
  tone: string;
  icon: typeof Plus;
}) {
  if (names.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {names.map((n) => (
          <span key={n} className={`rounded-full border px-2.5 py-1 text-sm ${tone}`}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScanCard({ scan, isLatest }: { scan: ScanSnapshot; isLatest: boolean }) {
  const [open, setOpen] = useState(isLatest);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {scan.imageUrl ? (
          <img
            src={scan.imageUrl}
            alt={`Fridge scan from ${fmt(scan.createdAt)}`}
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-card/60">
            <Camera className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold">{fmt(scan.createdAt)}</span>
            {isLatest && <Badge className="text-[10px] uppercase tracking-widest">Latest</Badge>}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {scan.itemCount} items · {scan.useSoonCount} to use soon · {scan.atRiskCount} at risk
          </p>
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          {scan.summary && <p className="text-sm text-muted-foreground">{scan.summary}</p>}
          <ChangeList label="New since last scan" names={scan.added} tone="border-primary/40 bg-primary/10" icon={Plus} />
          <ChangeList label="Gone since last scan" names={scan.gone} tone="border-border bg-card/60 text-muted-foreground" icon={Minus} />
          <ChangeList label="Still there" names={scan.kept} tone="border-border bg-card/40 text-muted-foreground" icon={Repeat} />
          {scan.added.length === 0 && scan.gone.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {scan.items.slice(0, 12).join(", ")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function ScanHistoryPage() {
  const historyFn = useServerFn(getScanHistory);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void ensureGuestSession().finally(() => setReady(true));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["scan-history"],
    queryFn: () => historyFn(),
    enabled: ready,
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Your scan history</h1>
        <p className="text-muted-foreground">
          Every scan is saved, so you can see exactly how your fridge changes — what you added, what got used, and what
          keeps going bad.
        </p>
      </header>

      {(!ready || isLoading) && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-4">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading your scans…
        </div>
      )}

      {data && data.scans.length === 0 && (
        <Card className="space-y-3 p-6 text-center">
          <p className="text-lg font-bold">No scans saved yet</p>
          <p className="text-muted-foreground">Scan your fridge once and we'll start tracking how it changes.</p>
          <Button asChild>
            <Link to="/fridge-scan">
              Scan my fridge <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </Card>
      )}

      {data && data.scans.length > 0 && (
        <>
          <Card className="grid grid-cols-3 gap-2 p-4 text-center">
            <div>
              <div className="text-2xl font-black">{data.totals.scanCount}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Scans</div>
            </div>
            <div>
              <div className="text-2xl font-black">{data.totals.avgItems}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Avg items</div>
            </div>
            <div>
              <div className="text-2xl font-black">{data.scans[0]?.atRiskCount ?? 0}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">At risk now</div>
            </div>
          </Card>

          {data.staples.length > 0 && (
            <Card className="space-y-2 p-4">
              <h2 className="text-lg font-bold">Your staples</h2>
              <p className="text-sm text-muted-foreground">Foods that show up scan after scan.</p>
              <div className="flex flex-wrap gap-1.5">
                {data.staples.map((s) => (
                  <span key={s.name} className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-sm">
                    {s.name} <span className="text-muted-foreground">×{s.appearances}</span>
                  </span>
                ))}
              </div>
            </Card>
          )}

          {data.repeatOffenders.length > 0 && (
            <Card className="space-y-2 p-4">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <TrendingDown className="h-4 w-4" aria-hidden /> Keeps going bad
              </h2>
              <p className="text-sm text-muted-foreground">Buy less of these, or plan a meal around them sooner.</p>
              <div className="flex flex-wrap gap-1.5">
                {data.repeatOffenders.map((r) => (
                  <span key={r.name} className="rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-sm">
                    {r.name} <span className="text-muted-foreground">×{r.times}</span>
                  </span>
                ))}
              </div>
            </Card>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Timeline</h2>
            {data.scans.map((s, i) => (
              <ScanCard key={s.id} scan={s} isLatest={i === 0} />
            ))}
          </section>
        </>
      )}
    </main>
  );
}
