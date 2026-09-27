import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { SecretGroupStatus } from '@/lib/build-secrets';

export const Route = createFileRoute('/admin/ios-secrets-check')({
  head: () => ({
    meta: [
      { title: 'iOS Secrets Validation — Admin' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: IosSecretsCheckPage,
});

interface DryCheckResponse {
  ok: boolean;
  stage?: string;
  httpStatus?: number;
  message?: string;
  error?: string;
  hint?: string;
  appCount?: number;
  sampleApp?: { bundleId?: string; name?: string; sku?: string } | null;
  apple?: unknown;
}

function DryCheckCard({
  adminToken,
  autoRunKey,
}: {
  adminToken: string;
  autoRunKey: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [keyId, setKeyId] = useState('');
  const [issuerId, setIssuerId] = useState('');
  const [p8, setP8] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DryCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(useServer: boolean) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/testflight-dry-check', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(useServer ? {} : { keyId: keyId.trim(), issuerId: issuerId.trim(), p8 }),
      });
      const json = (await res.json().catch(() => ({}))) as DryCheckResponse;
      setResult(json);
      if (!res.ok && !json.error) setError(`HTTP ${res.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Auto-run using server-side secrets as soon as we have an admin token
  // and the secrets-status check completes. Re-runs when autoRunKey changes.
  useEffect(() => {
    if (!adminToken || !autoRunKey) return;
    run(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, autoRunKey]);

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">TestFlight upload dry-check</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Signs an ES256 JWT with your App Store Connect API key and calls
          <code className="mx-1 font-mono">GET /v1/apps</code> to prove the Key
          ID, Issuer ID, and .p8 all match — without building or uploading
          anything. Nothing is stored server-side when you paste values here.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!adminToken || loading}
          onClick={() => run(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Run dry-check (use server-side secrets)'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors"
        >
          {open ? 'Hide manual form' : 'Paste values instead…'}
        </button>
      </div>

      {open && (
        <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
          <label className="block text-xs font-medium">
            Key ID
            <input
              type="text"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="10-char Key ID"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="block text-xs font-medium">
            Issuer ID
            <input
              type="text"
              value={issuerId}
              onChange={(e) => setIssuerId(e.target.value)}
              placeholder="UUID"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="block text-xs font-medium">
            .p8 contents (full PEM including BEGIN/END lines)
            <textarea
              value={p8}
              onChange={(e) => setP8(e.target.value)}
              rows={6}
              placeholder={'-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----'}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-[11px]"
            />
          </label>
          <button
            type="button"
            disabled={!adminToken || !keyId.trim() || !issuerId.trim() || !p8.trim() || loading}
            onClick={() => run(false)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Run dry-check with pasted values'}
          </button>
          <p className="text-[10px] text-muted-foreground">
            Values are sent to your own server for a single JWT sign and one
            App Store Connect request, then discarded. Not written to disk, not
            logged, not stored.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`rounded-md border p-3 text-sm ${
            result.ok
              ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
              : 'border-destructive/40 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="font-semibold">
            {result.ok
              ? '✓ Credentials authenticated with App Store Connect'
              : `✗ Dry-check failed${result.stage ? ` (${result.stage})` : ''}`}
          </div>
          <div className="mt-1 text-xs space-y-1">
            {result.message && <div>{result.message}</div>}
            {result.error && <div>{result.error}</div>}
            {result.hint && <div className="opacity-80">Hint: {result.hint}</div>}
            {typeof result.appCount === 'number' && (
              <div>
                Apps visible to this key: <strong>{result.appCount}</strong>
              </div>
            )}
            {result.sampleApp && (
              <div className="font-mono text-[11px] opacity-80">
                Sample: {result.sampleApp.name} ({result.sampleApp.bundleId})
              </div>
            )}
            {result.apple !== undefined && result.apple !== null && (
              <details className="pt-1">
                <summary className="cursor-pointer opacity-80">Apple response</summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-background/60 p-2 text-[10px] whitespace-pre-wrap break-all">
                  {typeof result.apple === 'string'
                    ? result.apple
                    : JSON.stringify(result.apple, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

interface TriggerResponse {
  success?: boolean;
  workflow?: string;
  repo?: string;
  ref?: string;
  message?: string;
  error?: string;
  hint?: string;
  missing?: string[];
  fix?: string;
  details?: string;
  status?: number;
}

function TriggerBuildCard({ adminToken, repo }: { adminToken: string; repo: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriggerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function trigger() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/trigger-build', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow: 'ios-testflight.yml',
          ref: 'main',
          ...(repo ? { repo } : {}),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as TriggerResponse;
      setResult({ ...json, status: res.status });
      if (!res.ok && !json.error) setError(`HTTP ${res.status}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  const actionsUrl = result?.repo
    ? `https://github.com/${result.repo}/actions/workflows/ios-testflight.yml`
    : null;

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Trigger iOS build</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Dispatches <code className="font-mono">ios-testflight.yml</code> on{' '}
          <code className="font-mono">main</code> via GitHub Actions. Preflight
          verifies all required repo secrets before dispatching.
        </p>
      </div>

      {!confirming ? (
        <button
          type="button"
          disabled={!adminToken || loading}
          onClick={() => setConfirming(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Trigger iOS build
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={trigger}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
          >
            {loading ? 'Dispatching…' : 'Confirm: dispatch build'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirming(false)}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`rounded-md border p-3 text-sm ${
            result.success
              ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
              : 'border-destructive/40 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="font-semibold">
            {result.success ? '✓ Build dispatched' : '✗ Dispatch failed'}
          </div>
          <div className="mt-1 text-xs space-y-1">
            {result.message && <div>{result.message}</div>}
            {result.error && <div>{result.error}</div>}
            {result.hint && <div className="opacity-80">Hint: {result.hint}</div>}
            {result.missing && result.missing.length > 0 && (
              <div>
                Missing secrets:{' '}
                <code className="font-mono">{result.missing.join(', ')}</code>
              </div>
            )}
            {result.fix && <div className="opacity-80">{result.fix}</div>}
            {result.details && (
              <details className="pt-1">
                <summary className="cursor-pointer opacity-80">Details</summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-background/60 p-2 text-[10px] whitespace-pre-wrap break-all">
                  {result.details}
                </pre>
              </details>
            )}
            {actionsUrl && (
              <div>
                <a
                  className="underline"
                  href={actionsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open GitHub Actions →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

const REQUIRED = [
  'ASC_KEY_ID',
  'APP_STORE_CONNECT_API_ISSUER_ID',
  'APP_STORE_CONNECT_API_KEY_P8',
  'IOS_TEAM_ID',
] as const;

const HELP: Record<(typeof REQUIRED)[number], { where: string; hint?: string; url?: string }> = {
  ASC_KEY_ID: {
    where: 'App Store Connect → Users and Access → Integrations → Team Keys',
    url: 'https://appstoreconnect.apple.com/access/integrations/api',
    hint: '10-character Key ID (e.g. ABC123XYZ9).',
  },
  APP_STORE_CONNECT_API_ISSUER_ID: {
    where: 'Same page as the Key ID (Issuer ID at the top of the Team Keys table).',
    url: 'https://appstoreconnect.apple.com/access/integrations/api',
    hint: 'UUID.',
  },
  APP_STORE_CONNECT_API_KEY_P8: {
    where: 'Downloaded once when the API key was created (AuthKey_XXXX.p8).',
    hint: 'Paste full file contents including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- lines plus trailing newline.',
  },
  IOS_TEAM_ID: {
    where: 'Apple Developer → Membership → Team ID.',
    url: 'https://developer.apple.com/account#MembershipDetailsCard',
    hint: '10-character alphanumeric Team ID.',
  },
};

const TOKEN_KEY = 'admin_api_token';

interface StatusResponse {
  repo: string;
  checkedAt: string;
  allOk: boolean;
  settingsUrl: string;
  groups: SecretGroupStatus[];
}

function IosSecretsCheckPage() {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  async function check(t: string, r: string) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch('/api/admin/build-secrets-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(r ? { repo: r } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`);
        return;
      }
      setData(json as StatusResponse);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = token.trim();
    if (!t) return;
    sessionStorage.setItem(TOKEN_KEY, t);
    const id = setTimeout(() => check(t, repo.trim()), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, repo]);

  // Compute status of the 4 required iOS secrets from the response.
  const configured = new Set<string>();
  if (data) {
    for (const g of data.groups) {
      g.requiredPresent.forEach((n) => configured.add(n));
      g.optionalPresent.forEach((n) => configured.add(n));
    }
  }
  const rows = REQUIRED.map((name) => ({ name, present: configured.has(name) }));
  const missing = rows.filter((r) => !r.present).map((r) => r.name);

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">iOS Secrets Validation</h1>
        <p className="text-sm text-muted-foreground">
          Checks that the 4 GitHub Actions secrets required to build and upload
          the iOS app to TestFlight are configured.
        </p>
      </header>

      <form
        className="rounded-lg border bg-card p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (token.trim()) check(token.trim(), repo.trim());
        }}
      >
        <label className="block text-sm font-medium">
          Admin API token
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_API_TOKEN"
            autoComplete="off"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Repo override{' '}
          <span className="text-muted-foreground font-normal">(optional, owner/repo)</span>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="leave blank to use GITHUB_REPO"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={!token.trim() || loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Check secrets'}
        </button>
      </form>

      <DryCheckCard adminToken={token.trim()} autoRunKey={data?.checkedAt ?? null} />

      <TriggerBuildCard adminToken={token.trim()} repo={repo.trim()} />





      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <section className="space-y-4">
          <div
            className={`rounded-lg border p-4 text-sm ${
              missing.length === 0
                ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            }`}
          >
            <div className="font-semibold">
              {missing.length === 0
                ? '✓ All 4 iOS secrets are configured'
                : `✗ Missing ${missing.length} of 4 iOS secrets`}
            </div>
            <div className="mt-1 text-xs">
              Repo: <code>{data.repo}</code> · checked{' '}
              {new Date(data.checkedAt).toLocaleString()} ·{' '}
              <a
                className="underline"
                href={data.settingsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Manage in GitHub →
              </a>
            </div>
          </div>

          <ul className="space-y-2">
            {rows.map(({ name, present }) => {
              const help = HELP[name];
              return (
                <li
                  key={name}
                  className={`rounded-lg border p-3 text-sm ${
                    present
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-amber-500/40 bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-xs">{name}</code>
                    <span
                      className={`text-xs font-semibold ${
                        present ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {present ? 'PRESENT' : 'MISSING'}
                    </span>
                  </div>
                  {!present && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div>
                        <strong>Where:</strong> {help.where}
                        {help.url && (
                          <>
                            {' '}
                            <a
                              className="underline"
                              href={help.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              open
                            </a>
                          </>
                        )}
                      </div>
                      {help.hint && (
                        <div>
                          <strong>Format:</strong> {help.hint}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {missing.length > 0 && (
            <div className="rounded-lg border bg-card p-4 text-sm space-y-2">
              <div className="font-semibold">Next step</div>
              <p className="text-xs text-muted-foreground">
                Open{' '}
                <a
                  className="underline"
                  href={data.settingsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub → Settings → Secrets and variables → Actions
                </a>{' '}
                and add each missing secret above.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
