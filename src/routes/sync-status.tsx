import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, GitBranch, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Updated whenever a sync is triggered from the editor.
const LAST_SYNC_AT = "2026-06-16T00:00:00Z";
const LAST_SYNC_STATUS: "success" | "failed" | "unknown" = "unknown";
const LAST_SYNC_NOTE =
  "Lovable auto-syncs on every code change. Final push status can only be confirmed in GitHub → Actions / commit history.";

export const Route = createFileRoute("/sync-status")({
  head: () => ({
    meta: [
      { title: "Sync Status — The Fridge and Cupboard" },
      {
        name: "description",
        content:
          "Latest GitHub sync timestamp and push status for the connected repository.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SyncStatusPage,
});

function SyncStatusPage() {
  const date = new Date(LAST_SYNC_AT);
  const formatted = date.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });

  const statusMeta = {
    success: {
      icon: CheckCircle2,
      label: "Push succeeded",
      tone: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
    failed: {
      icon: AlertCircle,
      label: "Push failed",
      tone: "text-red-600",
      bg: "bg-red-50 border-red-200",
    },
    unknown: {
      icon: AlertCircle,
      label: "Status unknown — verify on GitHub",
      tone: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
  }[LAST_SYNC_STATUS];

  const Icon = statusMeta.icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <GitBranch className="h-4 w-4" />
        <span>Repository sync</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Sync Status</h1>
      <p className="mt-2 text-muted-foreground">
        Last known GitHub push for this project.
      </p>

      <Card className={`mt-6 border p-5 ${statusMeta.bg}`}>
        <div className="flex items-start gap-3">
          <Icon className={`h-6 w-6 shrink-0 ${statusMeta.tone}`} />
          <div className="flex-1">
            <div className={`font-medium ${statusMeta.tone}`}>
              {statusMeta.label}
            </div>
            <div className="mt-1 text-sm text-foreground/80">
              Last push: <span className="font-medium">{formatted}</span>
            </div>
            <p className="mt-3 text-sm text-foreground/70">{LAST_SYNC_NOTE}</p>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="font-medium">Verify on GitHub</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Open the connected repository on GitHub.</li>
          <li>Check the latest commit timestamp on the default branch.</li>
          <li>
            Open <span className="font-mono">Actions</span> to see whether the
            iOS / Android build workflows succeeded.
          </li>
        </ol>
        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open GitHub <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
