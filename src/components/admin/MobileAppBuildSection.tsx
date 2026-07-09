import { useEffect, useRef, useState } from 'react';

function deriveBuildNumber(v: string): string | null {
  const digits = v.replace(/^v/i, '').split('.').map((p) => p.replace(/\D/g, ''));
  if (digits.some((d) => d === '')) return null;
  const [maj = '0', min = '0', patch = '0'] = digits;
  const n = Number(maj) * 10000 + Number(min) * 100 + Number(patch);
  return Number.isFinite(n) && n > 0 ? String(n) : null;
}

type Phase =
  | 'idle'
  | 'checking-secrets'
  | 'secrets-failed'
  | 'dispatching'
  | 'building'
  | 'failed'
  | 'complete';

interface RunInfo {
  id: number;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  runNumber: number;
  displayTitle: string;
}
interface Artifact {
  name: string;
  size: number;
  downloadUrl: string;
}

interface PreflightStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
}

interface PreflightResponse {
  run?: {
    runNumber: number;
    htmlUrl: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    conclusion: string | null;
  } | null;
  preflight?: {
    status: string;
    conclusion: string | null;
    htmlUrl: string;
    startedAt: string | null;
    completedAt: string | null;
    steps: PreflightStep[];
    failingStep: { name: string; logUrl: string } | null;
  } | null;
  note?: string;
}

const IOS_WORKFLOW = 'ios-testflight.yml';
const ANDROID_WORKFLOW = 'android-play-internal.yml';

export function MobileAppBuildSection({ adminToken, repo }: { adminToken: string; repo: string }) {
  const [version, setVersion] = useState('');
  return (
    <section className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-5 space-y-4 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-xl font-bold flex items-center gap-2">
          📱 Mobile App Build
        </h2>
        <p className="text-sm text-muted-foreground">
          Build a signed, store-ready package of your app. Uses your saved GitHub secrets
          (<code className="font-mono text-xs">GITHUB_PAT</code>,{' '}
          <code className="font-mono text-xs">APPLE_KEY_ID</code>,{' '}
          <code className="font-mono text-xs">APPLE_ISSUER_ID</code>,{' '}
          <code className="font-mono text-xs">APPLE_API_KEY_BASE64</code>).
        </p>
      </header>

      <div className="rounded-lg border-2 border-primary/40 bg-background p-3 space-y-1.5">
        <label htmlFor="mab-version" className="block text-sm font-semibold">
          Tag / version to build
        </label>
        <input
          id="mab-version"
          type="text"
          value={version}
          onChange={(e) => setVersion(e.target.value.trim())}
          placeholder="v1.0.1 (blank = main)"
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Git ref dispatched to GitHub Actions. Blank uses <code className="font-mono">main</code>.
          A tag like <code className="font-mono">v1.0.1</code> becomes build number{' '}
          <code className="font-mono">{deriveBuildNumber(version) ?? '—'}</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BuildCard
          icon="🍎"
          title="iPhone App (iOS)"
          buttonLabel="Build iPhone App"
          workflow={IOS_WORKFLOW}
          target="App Store / TestFlight"
          adminToken={adminToken}
          repo={repo}
          version={version}
          showPreflight
        />
        <BuildCard
          icon="🤖"
          title="Android App"
          buttonLabel="Build Android App"
          workflow={ANDROID_WORKFLOW}
          target="Google Play Internal"
          adminToken={adminToken}
          repo={repo}
          version={version}
        />
      </div>
    </section>
  );
}

function BuildCard({
  icon,
  title,
  buttonLabel,
  workflow,
  target,
  adminToken,
  repo,
  version = '',
  showPreflight = false,
}: {
  icon: string;
  title: string;
  buttonLabel: string;
  workflow: string;
  target: string;
  adminToken: string;
  repo: string;
  version?: string;
  showPreflight?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [run, setRun] = useState<RunInfo | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const pollRef = useRef<number | null>(null);
  const preflightPollRef = useRef<number | null>(null);

  // Fetch latest run + preflight on mount so the card shows current state.
  useEffect(() => {
    if (!adminToken) return;
    void refreshStatus();
    if (showPreflight) void refreshPreflight();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (preflightPollRef.current) window.clearInterval(preflightPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, repo]);

  // Poll preflight while it is running so the button unlocks as soon as it passes.
  useEffect(() => {
    if (!showPreflight) return;
    if (preflightPollRef.current) {
      window.clearInterval(preflightPollRef.current);
      preflightPollRef.current = null;
    }
    const pf = preflight?.preflight;
    if (pf && pf.status !== 'completed') {
      preflightPollRef.current = window.setInterval(() => void refreshPreflight(), 10000);
    }
    return () => {
      if (preflightPollRef.current) {
        window.clearInterval(preflightPollRef.current);
        preflightPollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preflight?.preflight?.status, showPreflight]);


  async function refreshPreflight() {
    if (!adminToken) return;
    setPreflightLoading(true);
    try {
      const params = new URLSearchParams({ workflow });
      if (repo) params.set('repo', repo);
      const res = await fetch(`/api/admin/build-preflight?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as PreflightResponse;
      setPreflight(json);
    } catch {
      /* ignore */
    } finally {
      setPreflightLoading(false);
    }
  }


  async function refreshStatus() {
    try {
      const params = new URLSearchParams({ workflow });
      if (repo) params.set('repo', repo);
      const res = await fetch(`/api/admin/build-status?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.run) {
        setRun(json.run);
        setArtifacts(json.artifacts || []);
        // Sync phase with current run state (only if not actively dispatching).
        if (json.run.status !== 'completed') {
          setPhase('building');
        } else if (json.run.conclusion === 'success') {
          setPhase('complete');
        } else if (phase !== 'idle' && phase !== 'dispatching' && phase !== 'checking-secrets') {
          // Only show failed if we're tracking a recent attempt
        }
      }
    } catch {
      /* ignore */
    }
  }

  function startPolling() {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const params = new URLSearchParams({ workflow });
      if (repo) params.set('repo', repo);
      try {
        const res = await fetch(`/api/admin/build-status?${params.toString()}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.run) {
          setRun(json.run);
          setArtifacts(json.artifacts || []);
          if (json.run.status === 'completed') {
            if (pollRef.current) window.clearInterval(pollRef.current);
            if (json.run.conclusion === 'success') {
              setPhase('complete');
              setMessage('Build complete.');
            } else {
              setPhase('failed');
              setMessage(`Build ${json.run.conclusion || 'failed'}.`);
            }
          }
        }
      } catch {
        /* ignore */
      }
    }, 10000);
  }

  async function build() {
    if (!adminToken) {
      setMessage('Enter the admin token above first.');
      setPhase('failed');
      return;
    }
    setPhase('checking-secrets');
    setMessage('Verifying GitHub secrets…');
    setMissing([]);

    // 1. Check secrets exist
    try {
      const statusRes = await fetch('/api/admin/build-secrets-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(repo ? { repo } : {}),
      });
      const statusJson = await statusRes.json().catch(() => ({}));
      if (!statusRes.ok) {
        setPhase('secrets-failed');
        setMessage(statusJson?.error || `Secret check failed (HTTP ${statusRes.status}).`);
        return;
      }
      const group = (statusJson.groups || []).find((g: any) => g.workflow === workflow);
      if (group && !group.ok) {
        setPhase('secrets-failed');
        setMissing(group.requiredMissing || []);
        setMessage('Missing required secrets — add them in GitHub Settings.');
        return;
      }
    } catch (e: any) {
      setPhase('secrets-failed');
      setMessage(e?.message || 'Could not reach secret-check API.');
      return;
    }

    // 2. Dispatch the workflow
    setPhase('dispatching');
    setMessage('Starting build on GitHub Actions…');
    try {
      const res = await fetch('/api/admin/trigger-build', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow,
          ref: version || 'main',
          inputs: (() => {
            const bn = deriveBuildNumber(version);
            if (!bn) return {};
            return workflow === 'ios-testflight.yml'
              ? { build_number: bn }
              : { version_code: bn };
          })(),
          ...(repo ? { repo } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhase('failed');
        const miss = Array.isArray(json?.missing) ? ` Missing: ${json.missing.join(', ')}` : '';
        setMessage(`${json?.error || `HTTP ${res.status}`}${miss}`);
        return;
      }
      setPhase('building');
      setMessage('Build queued. Polling status every 15s…');
      // Give GitHub a moment to register the run, then begin polling.
      window.setTimeout(() => {
        void refreshStatus();
        startPolling();
      }, 4000);
    } catch (e: any) {
      setPhase('failed');
      setMessage(e?.message || 'Dispatch failed.');
    }
  }

  const isWorking = phase === 'checking-secrets' || phase === 'dispatching' || phase === 'building';

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-1.5">
            <span aria-hidden>{icon}</span> {title}
          </h3>
          <p className="text-xs text-muted-foreground">Target: {target}</p>
        </div>
        <PhaseBadge phase={phase} />
      </div>

      {showPreflight && (
        <PreflightPanel
          data={preflight}
          loading={preflightLoading}
          onRefresh={refreshPreflight}
        />
      )}

      <BuildButton
        adminToken={adminToken}
        phase={phase}
        buttonLabel={buttonLabel}
        showPreflight={showPreflight}
        preflight={preflight}
        preflightLoading={preflightLoading}
        onClick={build}
      />


      {message && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            phase === 'failed' || phase === 'secrets-failed'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : phase === 'complete'
                ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                : 'border-border bg-muted/40 text-muted-foreground'
          }`}
        >
          {message}
        </div>
      )}

      {missing.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
          <div className="font-semibold text-destructive mb-1">Missing secrets:</div>
          <ul className="ml-4 list-disc text-destructive/90 font-mono">
            {missing.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}

      {run && (
        <RunStatusPanel run={run} phase={phase} />
      )}


      {phase === 'complete' && artifacts.length > 0 && (
        <div className="rounded-md border border-green-500/40 bg-green-500/5 p-2.5 text-xs space-y-1.5">
          <div className="font-semibold text-green-700 dark:text-green-300">
            ✓ Build complete — download:
          </div>
          <ul className="space-y-1">
            {artifacts.map((a) => (
              <li key={a.name}>
                <a
                  href={a.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-mono"
                >
                  ⬇ {a.name}
                </a>{' '}
                <span className="text-muted-foreground">
                  ({(a.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            GitHub requires sign-in to download artifacts.
          </p>
        </div>
      )}

      {phase === 'complete' && artifacts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Build succeeded. If this workflow uploads directly to TestFlight / Play, no artifact will appear here —
          check the store console.
        </p>
      )}
    </div>
  );
}

function BuildButton({
  adminToken,
  phase,
  buttonLabel,
  showPreflight,
  preflight,
  preflightLoading,
  onClick,
}: {
  adminToken: string;
  phase: Phase;
  buttonLabel: string;
  showPreflight: boolean;
  preflight: PreflightResponse | null;
  preflightLoading: boolean;
  onClick: () => void;
}) {
  const isWorking = phase === 'checking-secrets' || phase === 'dispatching' || phase === 'building';

  const pf = preflight?.preflight;
  const preflightPassed = showPreflight && pf?.conclusion === 'success';
  const preflightRunning = showPreflight && !!pf && pf.status !== 'completed';
  const preflightFailed = showPreflight && pf?.conclusion === 'failure';
  const noPreflight = showPreflight && !pf && !preflightLoading;
  const preflightBlocking = showPreflight && !preflightPassed;

  const disabled = !adminToken || isWorking || preflightBlocking;

  let label = buttonLabel;
  if (phase === 'checking-secrets') {
    label = 'Checking secrets…';
  } else if (phase === 'dispatching') {
    label = 'Starting build…';
  } else if (phase === 'building') {
    label = 'Building…';
  } else if (showPreflight) {
    if (preflightLoading && !preflight) {
      label = 'Checking preflight…';
    } else if (preflightRunning) {
      label = 'Preflight running…';
    } else if (preflightFailed) {
      label = 'Preflight failed — fix secrets';
    } else if (noPreflight) {
      label = 'No preflight result';
    } else if (!preflightPassed) {
      label = 'Preflight not passed';
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
    >
      {label}
    </button>
  );
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const map: Record<Phase, { label: string; cls: string }> = {
    idle: { label: 'Ready', cls: 'bg-muted text-muted-foreground' },
    'checking-secrets': { label: 'Checking secrets', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
    'secrets-failed': { label: 'Secrets missing', cls: 'bg-destructive/15 text-destructive' },
    dispatching: { label: 'Starting', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
    building: { label: 'Building…', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 animate-pulse' },
    failed: { label: 'Failed', cls: 'bg-destructive/15 text-destructive' },
    complete: { label: 'Complete', cls: 'bg-green-500/15 text-green-700 dark:text-green-300' },
  };

  const { label, cls } = map[phase];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// Estimated total build time in seconds — used to render a progress bar
// while GitHub Actions is running. iOS builds are slower (Xcode + upload),
// Android builds are faster (Gradle only).
const ESTIMATED_BUILD_SECONDS: Record<string, number> = {
  'ios-testflight.yml': 22 * 60,
  'android-play-internal.yml': 12 * 60,
};

function RunStatusPanel({ run, phase }: { run: RunInfo; phase: Phase }) {
  const [now, setNow] = useState(() => Date.now());
  const isRunning = run.status !== 'completed';

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const startMs = new Date(run.createdAt || run.updatedAt).getTime();
  const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
  const elapsedLabel = `${Math.floor(elapsedSec / 60)}m ${String(elapsedSec % 60).padStart(2, '0')}s`;

  // Progress bar uses run.name/workflow indirectly via display title; fall
  // back to the Android estimate since this panel is used for both.
  const estimate =
    ESTIMATED_BUILD_SECONDS[/ios/i.test(run.displayTitle) ? 'ios-testflight.yml' : 'android-play-internal.yml'] || 900;
  const pct = isRunning ? Math.min(95, Math.round((elapsedSec / estimate) * 100)) : 100;

  const failed = run.status === 'completed' && run.conclusion !== 'success';
  const jobsUrl = `${run.htmlUrl}${run.htmlUrl.includes('?') ? '&' : '?'}pr=`; // link to run page (jobs visible)

  return (
    <div className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          Run #{run.runNumber}
          {isRunning && <span className="ml-2 text-amber-600 dark:text-amber-400">● live</span>}
        </span>
        <a
          href={run.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline font-medium"
        >
          View on GitHub →
        </a>
      </div>

      <div className="text-muted-foreground">
        {isRunning
          ? `${run.status === 'queued' ? 'Queued' : 'In progress'} · elapsed ${elapsedLabel} / ~${Math.round(estimate / 60)}m`
          : `${run.conclusion || 'completed'} · finished ${new Date(run.updatedAt).toLocaleString()}`}
      </div>

      {isRunning && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {failed && (
        <a
          href={jobsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 font-semibold text-destructive hover:bg-destructive/20"
        >
          🔍 View failing logs on GitHub →
        </a>
      )}

      {phase === 'complete' && (
        <div className="text-green-700 dark:text-green-300 font-medium">
          ✓ Uploaded — check the store console (TestFlight / Play Internal).
        </div>
      )}
    </div>
  );
}

function PreflightPanel({
  data,
  loading,
  onRefresh,
}: {
  data: PreflightResponse | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (!data && loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-2.5 text-xs text-muted-foreground">
        Loading latest preflight…
      </div>
    );
  }
  if (!data) return null;

  const pf = data.preflight;
  const runNum = data.run?.runNumber;

  // No preflight job on the latest run (old workflow, or never run).
  if (!pf) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs space-y-1.5">
        <div className="font-semibold text-amber-700 dark:text-amber-300">
          No preflight result yet
        </div>
        <div className="text-muted-foreground">
          {data.note || 'The latest run has no preflight job. Dispatch a new build to populate this.'}
        </div>
        <RefreshLink loading={loading} onClick={onRefresh} />
      </div>
    );
  }

  const running = pf.status !== 'completed';
  const ok = pf.conclusion === 'success';
  const failed = pf.conclusion === 'failure';

  const tone = running
    ? 'border-blue-500/40 bg-blue-500/5'
    : ok
      ? 'border-green-500/40 bg-green-500/5'
      : 'border-destructive/40 bg-destructive/5';

  const label = running
    ? 'Preflight running…'
    : ok
      ? '✓ Preflight passed — secrets valid'
      : `✗ Preflight ${pf.conclusion || 'failed'}`;

  const labelTone = running
    ? 'text-blue-700 dark:text-blue-300'
    : ok
      ? 'text-green-700 dark:text-green-300'
      : 'text-destructive';

  const failingSteps = pf.steps.filter((s) => s.conclusion === 'failure');

  return (
    <div className={`rounded-md border p-2.5 text-xs space-y-2 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-semibold ${labelTone}`}>
          {label}
          {runNum ? <span className="ml-1 font-normal text-muted-foreground">(run #{runNum})</span> : null}
        </span>
        <div className="flex items-center gap-2">
          <RefreshLink loading={loading} onClick={onRefresh} />
          <a
            href={pf.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium"
          >
            View job →
          </a>
        </div>
      </div>

      {failed && failingSteps.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-semibold text-destructive">Failing checks:</div>
          <ul className="ml-4 list-disc space-y-0.5 text-destructive/90">
            {failingSteps.map((s) => (
              <li key={s.number}>
                <a
                  href={`${pf.htmlUrl}#step:${s.number}:1`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted hover:decoration-solid"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
          <div className="text-muted-foreground">
            Fix the flagged secrets in{' '}
            <a
              href="https://github.com/settings"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              GitHub Settings → Secrets and variables → Actions
            </a>
            , then click <strong>Build iPhone App</strong> to rerun.
          </div>
        </div>
      )}

      {ok && (
        <div className="text-muted-foreground">
          All signing/provisioning secrets validated on the last run — safe to dispatch a new build.
        </div>
      )}

      {running && (
        <div className="text-muted-foreground">
          The preflight job is still running. Wait for it to finish before reading results.
        </div>
      )}
    </div>
  );
}

function RefreshLink({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="text-primary hover:underline font-medium disabled:opacity-50"
    >
      {loading ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}

