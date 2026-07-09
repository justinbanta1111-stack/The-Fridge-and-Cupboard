import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  ChefHat,
  Leaf,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import { getUseSoonItems, type UseSoonItem, type Urgency } from "@/lib/use-soon.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/use-it-soon")({
  component: UseItSoonPage,
  head: () => ({
    meta: [
      { title: "Use It Soon — The Fridge & Cupboard" },
      {
        name: "description",
        content:
          "See which fridge and cupboard items to use first. Red, orange, and yellow urgency labels help you cook before food spoils and save money.",
      },
      { property: "og:title", content: "Use It Soon — The Fridge & Cupboard" },
      {
        property: "og:description",
        content:
          "Use food before it goes bad. The Fridge & Cupboard sorts your scans by urgency so nothing gets wasted.",
      },
    ],
  }),
});

const STORAGE_USED = "fc.useSoon.used.v1";
const STORAGE_STATUS = "fc.useSoon.status.v1";

type UsedRecord = { name: string; usedAt: number };
type StatusOverride = "today" | "week" | "later";

function loadUsed(): UsedRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_USED);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - 60 * 86_400_000;
    return arr.filter((r: UsedRecord) => r && typeof r.name === "string" && r.usedAt > cutoff);
  } catch {
    return [];
  }
}
function saveUsed(list: UsedRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_USED, JSON.stringify(list));
}
function loadStatus(): Record<string, StatusOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_STATUS);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function saveStatus(obj: Record<string, StatusOverride>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_STATUS, JSON.stringify(obj));
}

const URGENCY_LABEL: Record<Urgency, string> = {
  red: "Use now",
  orange: "Use soon",
  yellow: "Watch it",
  green: "Good for later",
};

const URGENCY_STYLE: Record<Urgency, { ring: string; bg: string; text: string; dot: string; tag: string }> = {
  red: {
    ring: "ring-rose-400/50",
    bg: "bg-gradient-to-br from-rose-50 to-rose-100/60",
    text: "text-rose-900",
    dot: "bg-rose-500",
    tag: "bg-rose-500 text-white",
  },
  orange: {
    ring: "ring-orange-400/50",
    bg: "bg-gradient-to-br from-orange-50 to-amber-100/60",
    text: "text-orange-900",
    dot: "bg-orange-500",
    tag: "bg-orange-500 text-white",
  },
  yellow: {
    ring: "ring-yellow-400/50",
    bg: "bg-gradient-to-br from-yellow-50 to-amber-50",
    text: "text-yellow-900",
    dot: "bg-yellow-500",
    tag: "bg-yellow-500 text-yellow-950",
  },
  green: {
    ring: "ring-emerald-400/40",
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    dot: "bg-emerald-500",
    tag: "bg-emerald-500 text-white",
  },
};

function UseItSoonPage() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => l.subscription.unsubscribe();
  }, []);

  const getItems = useServerFn(getUseSoonItems);
  const q = useQuery({
    queryKey: ["use-soon-items"],
    queryFn: () => getItems(),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const [used, setUsed] = useState<UsedRecord[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, StatusOverride>>({});
  useEffect(() => {
    setUsed(loadUsed());
    setStatusMap(loadStatus());
  }, []);

  const usedNames = useMemo(() => new Set(used.map((u) => u.name.toLowerCase())), [used]);

  const markUsed = (name: string) => {
    const next = [...used.filter((u) => u.name.toLowerCase() !== name.toLowerCase()), { name, usedAt: Date.now() }];
    setUsed(next);
    saveUsed(next);
    toast.success(`Saved ${name} from the bin 🌱`);
  };
  const undoUsed = (name: string) => {
    const next = used.filter((u) => u.name.toLowerCase() !== name.toLowerCase());
    setUsed(next);
    saveUsed(next);
  };
  const setItemStatus = (name: string, status: StatusOverride) => {
    const next = { ...statusMap, [name.toLowerCase()]: status };
    setStatusMap(next);
    saveStatus(next);
  };

  const all = (q.data?.items ?? []).filter((i) => !usedNames.has(i.name.toLowerCase()));
  const red = all.filter((i) => effectiveUrgency(i, statusMap) === "red");
  const orange = all.filter((i) => effectiveUrgency(i, statusMap) === "orange");
  const yellow = all.filter((i) => effectiveUrgency(i, statusMap) === "yellow");

  const savedCount = used.length;
  const weekCutoff = Date.now() - 7 * 86_400_000;
  const savedThisWeek = used.filter((u) => u.usedAt >= weekCutoff).length;
  // Rough money saved: $4.60 average per rescued item (USDA avg perishable waste cost).
  const PER_ITEM_CENTS = 460;
  const savedDollars = ((savedCount * PER_ITEM_CENTS) / 100).toFixed(savedCount * PER_ITEM_CENTS >= 10000 ? 0 : 2);
  const weekDollars = ((savedThisWeek * PER_ITEM_CENTS) / 100).toFixed(2);

  // Recipe priority: red first, then orange, then yellow — oldest within each tier.
  const priorityIngredients = useMemo(() => {
    return [...red, ...orange, ...yellow].slice(0, 6).map((i) => i.name);
  }, [red, orange, yellow]);
  const rescueHref = priorityIngredients.length
    ? `/rescue?ingredients=${encodeURIComponent(priorityIngredients.join(","))}`
    : "/rescue";

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[oklch(0.98_0.02_85)] via-background to-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-700">
            <AlarmClock className="h-3.5 w-3.5" /> Use It Soon
          </div>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Cook the things about to turn — first.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Mark items as <strong>use today</strong>, <strong>use this week</strong>, or
            <strong> good for later</strong>. We'll rank your fridge & cupboard scans by urgency so nothing gets wasted.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Use now" value={red.length} tone="red" icon={<AlertTriangle className="h-4 w-4" />} />
          <StatCard label="Use soon" value={orange.length} tone="orange" icon={<AlarmClock className="h-4 w-4" />} />
          <StatCard label="Watch it" value={yellow.length} tone="yellow" icon={<Leaf className="h-4 w-4" />} />
          <StatCard
            label="Saved from waste"
            value={savedCount}
            tone="green"
            icon={<Check className="h-4 w-4" />}
            footer={
              savedCount > 0
                ? `~$${savedDollars} saved · ${savedThisWeek} this week ($${weekDollars})`
                : "Tap 'Used' on a card to start tracking"
            }
          />
        </div>

        {red.length > 0 && (
          <Card className="mt-5 ring-1 ring-rose-300/60 bg-gradient-to-r from-rose-50 to-orange-50 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-500 text-white">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-widest text-rose-700">Reminder</div>
                <p className="mt-0.5 text-sm font-semibold text-rose-900">
                  Your <span className="capitalize">{red[0].name}</span> needs used today
                  {red[1] ? `, and ${red[1].name} is ${red[1].daysOld}d old.` : "."}
                </p>
                <p className="mt-1 text-xs text-rose-800/80">
                  We'll build tonight's recipe around the {red.length} {red.length === 1 ? "item" : "items"} flagged red first.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild className="bg-rose-600 hover:bg-rose-700">
            <Link to={rescueHref}>
              <ChefHat className="mr-2 h-4 w-4" /> Build a recipe around these
            </Link>
          </Button>
          <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            {q.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/reminders">
              <AlarmClock className="mr-2 h-4 w-4" /> Reminder settings
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/">
              <Camera className="mr-2 h-4 w-4" /> Scan more
            </Link>
          </Button>
        </div>

        {!signedIn ? (
          <EmptyCard
            title="Sign in to see what's about to turn"
            body="Your fridge and cupboard scans power the urgency view. Sign in to load yours."
            actionLabel="Sign in"
            actionHref="/auth"
          />
        ) : q.isLoading ? (
          <div className="mt-8 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Sorting your kitchen…
          </div>
        ) : q.isError ? (
          <EmptyCard
            title="Couldn't load your scans"
            body={(q.error as Error)?.message ?? "Please try again."}
            actionLabel="Retry"
            onAction={() => q.refetch()}
          />
        ) : all.length === 0 ? (
          <EmptyCard
            title="Nothing urgent — nice work."
            body="No perishables flagged from your recent scans. Snap your fridge to keep this view up to date."
            actionLabel="Scan my fridge"
            actionHref="/"
          />
        ) : (
          <div className="mt-8 space-y-8">
            <UrgencyGroup
              tone="red"
              title="Use today"
              caption="Cook tonight or freeze before the day ends."
              items={red}
              onMarkUsed={markUsed}
              onSetStatus={setItemStatus}
            />
            <UrgencyGroup
              tone="orange"
              title="Eat this in 1–2 days"
              caption="Plan tomorrow's meal around these."
              items={orange}
              onMarkUsed={markUsed}
              onSetStatus={setItemStatus}
            />
            <UrgencyGroup
              tone="yellow"
              title="Watch it this week"
              caption="Still good — start including them in meal planning."
              items={yellow}
              onMarkUsed={markUsed}
              onSetStatus={setItemStatus}
            />
          </div>
        )}

        {used.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <Leaf className="h-3.5 w-3.5" /> Rescued
            </div>
            <Card className="ring-1 ring-emerald-500/20 bg-emerald-50/60 p-4">
              <ul className="flex flex-wrap gap-2">
                {used.map((u) => (
                  <li key={u.name}>
                    <button
                      onClick={() => undoUsed(u.name)}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                      title="Tap to undo"
                    >
                      <Check className="h-3 w-3" /> {u.name}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-emerald-900">
                You saved <strong>{savedCount}</strong> {savedCount === 1 ? "item" : "items"} from being thrown away
                {savedCount > 0 ? ` — about $${savedDollars}.` : "."}
              </p>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

function effectiveUrgency(item: UseSoonItem, statusMap: Record<string, StatusOverride>): Urgency {
  const override = statusMap[item.name.toLowerCase()];
  if (override === "today") return "red";
  if (override === "week") return "orange";
  if (override === "later") return "yellow";
  return item.urgency;
}

function StatCard({
  label,
  value,
  tone,
  icon,
  footer,
}: {
  label: string;
  value: number;
  tone: Urgency;
  icon: React.ReactNode;
  footer?: string;
}) {
  const s = URGENCY_STYLE[tone];
  return (
    <Card className={cn("p-4 ring-1", s.ring, s.bg)}>
      <div className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-wider", s.text)}>
        {icon} {label}
      </div>
      <div className={cn("mt-1 font-display text-3xl font-semibold", s.text)}>{value}</div>
      {footer && <div className={cn("mt-1 text-xs", s.text, "opacity-80")}>{footer}</div>}
    </Card>
  );
}

function UrgencyGroup({
  tone,
  title,
  caption,
  items,
  onMarkUsed,
  onSetStatus,
}: {
  tone: Urgency;
  title: string;
  caption: string;
  items: UseSoonItem[];
  onMarkUsed: (n: string) => void;
  onSetStatus: (n: string, s: StatusOverride) => void;
}) {
  if (items.length === 0) return null;
  const s = URGENCY_STYLE[tone];
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className={cn("inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest", s.tag)}>
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" /> {URGENCY_LABEL[tone]}
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          <p className="text-sm text-muted-foreground">{caption}</p>
        </div>
        <div className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "item" : "items"}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Card key={`${it.scanId}-${it.name}`} className={cn("p-4 ring-1", s.ring, s.bg)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                  <h3 className={cn("font-display text-lg font-semibold leading-tight", s.text)}>{it.name}</h3>
                </div>
                <p className={cn("mt-1 text-xs", s.text, "opacity-80")}>
                  {it.reason} · from {it.scanLabel} scan
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{it.category}</Badge>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onMarkUsed(it.name)}
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Used
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Button
                asChild
                size="sm"
                className={cn("h-7 rounded-full px-3 text-[11px] font-bold", s.tag)}
              >
                <Link to={`/rescue?ingredients=${encodeURIComponent(it.name)}` as any}>
                  <ChefHat className="mr-1 h-3 w-3" /> Use It Soon → recipe
                </Link>
              </Button>
              <StatusPill onClick={() => onSetStatus(it.name, "today")}>Use today</StatusPill>
              <StatusPill onClick={() => onSetStatus(it.name, "week")}>Use this week</StatusPill>
              <StatusPill onClick={() => onSetStatus(it.name, "later")}>Good for later</StatusPill>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-foreground/15 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-foreground/80 hover:bg-white"
    >
      {children}
    </button>
  );
}

function EmptyCard({
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="mt-8 p-6 ring-1 ring-foreground/10">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <div className="mt-4">
        {actionHref ? (
          <Button asChild>
            <Link to={actionHref}>
              {actionLabel} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button onClick={onAction}>
            {actionLabel} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
