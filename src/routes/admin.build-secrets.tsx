import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { REQUIRED_SECRETS, SECRET_SOURCES, type SecretGroupStatus, type SecretSource, type WorkflowId } from '@/lib/build-secrets';
import { SecretsGuide } from '@/components/admin/SecretsGuide';
import { MobileAppBuildSection } from '@/components/admin/MobileAppBuildSection';

export const Route = createFileRoute('/admin/build-secrets')({
  head: () => ({
    meta: [
      { title: 'Build Secrets Status — Admin' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: BuildSecretsAdminPage,
});

interface StatusResponse {
  repo: string;
  checkedAt: string;
  allOk: boolean;
  settingsUrl: string;
  groups: SecretGroupStatus[];
  tokenSource?: 'GITHUB_PAT' | 'GITHUB_PERSONAL_ACCESS_TOKEN' | null;
}

interface StatusErrorResponse {
  error?: string;
  hint?: string;
  githubStatus?: number | null;
  githubMessage?: string | null;
  tokenSource?: 'GITHUB_PAT' | 'GITHUB_PERSONAL_ACCESS_TOKEN' | null;
  settingsUrl?: string;
  details?: string;
  code?: string;
}

interface ConfigCheckResponse {
  githubRepoConfigured: boolean;
  githubRepo: string | null;
  githubPatConfigured: boolean;
  tokenSource: 'GITHUB_PAT' | 'GITHUB_PERSONAL_ACCESS_TOKEN' | null;
  tokenLength: number;
  tokenPrefix: string | null;
  adminTokenConfigured: boolean;
  repoExists: boolean | null;
  repoReachable: boolean | null;
  patStatus: number | null;
  patAuthOk: boolean | null;
  patError: string | null;
  patScopes: string | null;
  patRepoAccessStatus: number | null;
  patRepoAccessError: string | null;
  settingsUrl: string | null;
}

const TOKEN_KEY = 'admin_api_token';

function BuildSecretsAdminPage() {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [version, setVersion] = useState('');
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<StatusErrorResponse | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [configCheck, setConfigCheck] = useState<ConfigCheckResponse | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  // Load lightweight config check on mount
  useEffect(() => {
    setConfigLoading(true);
    fetch('/api/admin/build-config-check')
      .then((res) => res.json().catch(() => null))
      .then((json) => {
        if (json) setConfigCheck(json as ConfigCheckResponse);
      })
      .finally(() => setConfigLoading(false));
  }, []);

  // Auto-sync: whenever the token value changes, persist it and immediately
  // re-verify against the server so a freshly rotated/saved ADMIN_API_TOKEN
  // is checked without requiring a manual button press.
  useEffect(() => {
    const trimmed = token.trim();
    if (!trimmed) return;
    sessionStorage.setItem(TOKEN_KEY, trimmed);
    const t = setTimeout(() => {
      if (!loading) check();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function check() {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setErrorDetail(null);
    setStatus(null);
    setData(null);
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      const res = await fetch('/api/admin/build-secrets-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(repo ? { repo } : {}),
      });
      const json = await res.json().catch(() => ({}));
      setStatus(res.status);
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`);
        setErrorCode(json?.code || null);
        setErrorDetail(json as StatusErrorResponse);
        return;
      }
      setData(json as StatusResponse);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Mobile Build Secrets</h1>
        <p className="text-sm text-muted-foreground">
          Verifies that all GitHub Actions secrets required by the iOS TestFlight
          and Android Play Internal workflows are configured.
        </p>
      </header>

      <MobileAppBuildSection adminToken={token.trim()} repo={repo.trim()} />

      <RepoConnectionCard config={configCheck} loading={configLoading} />

      <PatPermissionsCheckCard adminToken={token.trim()} repo={repo.trim()} />

      <form
        className="rounded-lg border bg-card p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (token && !loading) check();
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
          Repo override <span className="text-muted-foreground font-normal">(optional, e.g. owner/repo)</span>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="leave blank to use GITHUB_REPO"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Press Enter or click <strong>Verify &amp; check</strong> after pasting a rotated token — the page
          immediately re-authenticates and refreshes the green status below.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-xs font-medium">
              <span className="mb-1 text-muted-foreground">Tag / ref (optional)</span>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value.trim())}
                placeholder="v1.0.1 or main"
                className="w-48 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              <span className="mt-1 text-[10px] text-muted-foreground">
                Git ref to dispatch against. Blank = <code>main</code>. Tag must already exist on the remote.
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!token || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify & check'}
            </button>
            <TriggerBuildButton
              label="Trigger iOS TestFlight"
              workflow="ios-testflight.yml"
              token={token}
              repo={repo}
              version={version}
            />
            <TriggerBuildButton
              label="Trigger Android Play Internal"
              workflow="android-play-internal.yml"
              token={token}
              repo={repo}
              version={version}
            />
          </div>
        </div>
        {status === 200 && data && (
          <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-300">
            ✓ Admin token authenticated — status refreshed {new Date(data.checkedAt).toLocaleTimeString()}
          </div>
        )}
      </form>

      <RotateTokenCard onUseToken={setToken} verifyStatus={status} verifyError={error} verifyLoading={loading} verifyData={data} />


      {error && (
        <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2 font-semibold">
            {status === 401 ? '🔒 Admin API token rejected' : `Error${status ? ` (HTTP ${status})` : ''}`}
          </div>
          <div className="text-destructive/90">{error}</div>
          {errorCode === 'admin_token_invalid' && (
            <ul className="ml-4 list-disc text-xs text-destructive/80">
              <li>Open the secret manager and copy <code className="font-mono">ADMIN_API_TOKEN</code> again — values are masked, so re-copy to be sure.</li>
              <li>Strip any surrounding quotes or whitespace before pasting.</li>
              <li>Do not include the <code className="font-mono">Bearer </code> prefix — the page adds it automatically.</li>
              <li>If you recently rotated the token, the browser session may have an old value cached. Clear the field and paste the new one.</li>
            </ul>
          )}
          {errorCode === 'admin_token_unset' && (
            <div className="text-xs text-destructive/80">
              The server has no <code className="font-mono">ADMIN_API_TOKEN</code> set. Add it as a runtime secret and retry.
            </div>
          )}
          {status === 502 && errorDetail && (
            <div className="space-y-1.5 rounded-md border border-destructive/30 bg-background/40 p-3 text-xs">
              <div className="font-semibold text-destructive">GitHub API rejected the request</div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-destructive/90">
                <span className="text-muted-foreground">Token env var</span>
                <span><code className="font-mono">{errorDetail.tokenSource || 'none'}</code></span>
                <span className="text-muted-foreground">GitHub status</span>
                <span><code className="font-mono">{errorDetail.githubStatus ?? '—'}</code></span>
                <span className="text-muted-foreground">GitHub message</span>
                <span className="break-words"><code className="font-mono">{errorDetail.githubMessage || '—'}</code></span>
                {errorDetail.hint && (
                  <>
                    <span className="text-muted-foreground">Hint</span>
                    <span>{errorDetail.hint}</span>
                  </>
                )}
              </div>
              {errorDetail.details && (
                <details className="pt-1">
                  <summary className="cursor-pointer text-muted-foreground">Raw response</summary>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-background/60 p-2 text-[11px] text-destructive/90 whitespace-pre-wrap break-all">
                    {errorDetail.details}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {!data && (
        <>
          <ChecklistPreview />
          <SecretsGuide />
        </>
      )}

      {data && (
        <section className="space-y-4">
          <div
            className={`rounded-lg border p-4 text-sm ${
              data.allOk
                ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            }`}
          >
            <div className="font-semibold">
              {data.allOk ? 'All required secrets present' : 'Missing required secrets'}
            </div>
            <div className="mt-1 text-xs">
              Repo: <code>{data.repo}</code> · checked{' '}
              {new Date(data.checkedAt).toLocaleString()} ·{' '}
              <a className="underline" href={data.settingsUrl} target="_blank" rel="noreferrer">
                Manage in GitHub →
              </a>
            </div>
          </div>

          {data.groups.map((g) => (
            <GroupCard key={g.workflow} group={g} settingsUrl={data.settingsUrl} repo={data.repo} />
          ))}

          <SecretsGuide
            settingsUrl={data.settingsUrl}
            configured={
              new Set(
                data.groups.flatMap((g) => [...g.requiredPresent, ...g.optionalPresent])
              )
            }
          />
        </section>
      )}
    </div>
  );
}

function RotateTokenCard({
  onUseToken,
  verifyStatus,
  verifyError,
  verifyLoading,
  verifyData,
}: {
  onUseToken: (t: string) => void;
  verifyStatus: number | null;
  verifyError: string | null;
  verifyLoading: boolean;
  verifyData: StatusResponse | null;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [verifyRequested, setVerifyRequested] = useState(false);


  function generate() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    // url-safe base64
    const b64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    setRevealed(b64);
    setConfirming(false);
    setCopied(false);
    setAcknowledged(false);
    setVerifyRequested(false);
  }

  function verifyNow() {
    if (!revealed) return;
    setVerifyRequested(true);
    onUseToken(revealed); // triggers parent auto-verify useEffect
  }

  async function copy() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function dismiss() {
    setRevealed(null);
    setConfirming(false);
    setAcknowledged(false);
    setVerifyRequested(false);
  }

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Rotate ADMIN_API_TOKEN</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Generates a fresh cryptographically random token (32 bytes, url-safe base64).
          The value is shown <strong>once</strong> on this screen and is never stored
          or transmitted anywhere by this page — copy it now, then paste it into
          Project Settings → Secrets as <code className="font-mono">ADMIN_API_TOKEN</code>.
          If you navigate away or refresh, it's gone forever.
        </p>
      </div>

      {!revealed && !confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors"
        >
          Generate new token…
        </button>
      )}

      {!revealed && confirming && (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <div className="font-semibold">Confirm rotation</div>
          <p className="text-xs">
            Generating a new token does not by itself invalidate the current one — the
            existing <code className="font-mono">ADMIN_API_TOKEN</code> stays active
            until you paste the new value into Project Settings → Secrets and save.
            Until then, any cached sessions keep working.
          </p>
          <div className="flex gap-2">
            <button
              onClick={generate}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Yes, generate and reveal once
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {revealed && (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <div className="text-xs font-semibold text-destructive">
            ⚠ Shown once — this value will not be retrievable again
          </div>
          <div className="flex items-center gap-2">
            <code className="block flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 font-mono text-xs select-all">
              {revealed}
            </code>
            <button
              onClick={copy}
              className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <ol className="ml-4 list-decimal text-xs text-muted-foreground space-y-0.5">
            <li>Copy the value above.</li>
            <li>Open Project Settings → Secrets and update <code className="font-mono">ADMIN_API_TOKEN</code>.</li>
            <li>Save, then paste the same value into the Admin API token field above to re-verify.</li>
          </ol>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={verifyNow}
              disabled={verifyLoading}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              title="Sends this token to the server and re-runs the secrets check"
            >
              {verifyLoading && verifyRequested ? 'Verifying…' : 'Verify against server now'}
            </button>
            <span className="text-[11px] text-muted-foreground">
              Use after you've saved it as <code className="font-mono">ADMIN_API_TOKEN</code> in Project Settings → Secrets.
            </span>
          </div>

          {verifyRequested && !verifyLoading && verifyStatus === 200 && verifyData && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-300">
              ✓ Server accepted the new token — verified {new Date(verifyData.checkedAt).toLocaleTimeString()}.
              {verifyData.allOk ? ' All required build secrets present.' : ' (Some build secrets are still missing — see below.)'}
            </div>
          )}
          {verifyRequested && !verifyLoading && verifyStatus && verifyStatus !== 200 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              ✗ Server rejected the new token (HTTP {verifyStatus}). {verifyError || ''} — confirm you saved this exact value as <code className="font-mono">ADMIN_API_TOKEN</code> with no extra whitespace, then click Verify again.
            </div>
          )}
          {verifyRequested && !verifyLoading && !verifyStatus && verifyError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              ✗ Verification failed: {verifyError}
            </div>
          )}


          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            I've saved this token somewhere safe.
          </label>
          <button
            onClick={dismiss}
            disabled={!acknowledged}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
          >
            Hide forever
          </button>
        </div>
      )}
    </section>
  );
}


function RepoConnectionCard({
  config,
  loading,
}: {
  config: ConfigCheckResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="rounded-lg border bg-card p-4">
        <div className="text-sm text-muted-foreground">Checking GitHub connection…</div>
      </section>
    );
  }

  if (!config) {
    return null;
  }

  const allGood =
    config.githubRepoConfigured &&
    config.githubPatConfigured &&
    config.adminTokenConfigured;

  return (
    <section
      className={`rounded-lg border p-4 space-y-2 ${
        allGood
          ? 'border-green-500/40 bg-green-500/10'
          : 'border-amber-500/40 bg-amber-500/10'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {allGood ? (
          <>
            <span className="text-green-700 dark:text-green-300">✓ GitHub repo connected for mobile builds</span>
          </>
        ) : (
          <>
            <span className="text-amber-700 dark:text-amber-300">⚠ GitHub connection incomplete</span>
          </>
        )}
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className={config.githubRepoConfigured ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}>
            {config.githubRepoConfigured ? '✓' : '✗'} GITHUB_REPO
          </span>
          {config.githubRepoConfigured && config.githubRepo && (
            <a
              className="underline text-muted-foreground"
              href={`https://github.com/${config.githubRepo}`}
              target="_blank"
              rel="noreferrer"
            >
              {config.githubRepo} →
            </a>
          )}
        </div>
        <div className={config.githubPatConfigured ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}>
          {config.githubPatConfigured ? '✓' : '✗'} GitHub PAT{' '}
          {config.tokenSource && (
            <span className="text-muted-foreground">
              (from <code className="font-mono">{config.tokenSource}</code>
              {config.tokenLength ? `, ${config.tokenLength} chars` : ''}
              {config.tokenPrefix ? `, starts "${config.tokenPrefix}…"` : ''})
            </span>
          )}
        </div>
        <div className={config.adminTokenConfigured ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}>
          {config.adminTokenConfigured ? '✓' : '✗'} ADMIN_API_TOKEN
        </div>
      </div>

      {/* PAT authentication probe */}
      {config.githubPatConfigured && (
        <div className="rounded-md border border-border bg-background/60 p-2.5 text-xs space-y-1">
          <div className="font-semibold text-foreground">GitHub PAT probe</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground">GET /user</span>
            <span className={config.patAuthOk ? 'text-green-700 dark:text-green-300' : 'text-destructive'}>
              {config.patStatus ?? '—'} {config.patAuthOk ? 'OK' : (config.patError || 'failed')}
            </span>
            {config.patScopes !== null && (
              <>
                <span className="text-muted-foreground">x-oauth-scopes</span>
                <span><code className="font-mono">{config.patScopes || '(empty — fine-grained PAT)'}</code></span>
              </>
            )}
            {config.githubRepo && (
              <>
                <span className="text-muted-foreground">GET /repos/{config.githubRepo}</span>
                <span className={config.patRepoAccessStatus === 200 ? 'text-green-700 dark:text-green-300' : 'text-destructive'}>
                  {config.patRepoAccessStatus ?? '—'} {config.patRepoAccessStatus === 200 ? 'OK' : (config.patRepoAccessError || 'failed')}
                </span>
              </>
            )}
          </div>
          {config.patAuthOk === false && config.patStatus === 401 && (
            <p className="text-destructive">
              PAT rejected as Bad credentials — token is expired, revoked, or malformed. Regenerate it on GitHub and update the env var shown above.
            </p>
          )}
          {config.patAuthOk && config.patRepoAccessStatus === 404 && (
            <p className="text-amber-700 dark:text-amber-300">
              PAT authenticates but cannot see <code className="font-mono">{config.githubRepo}</code>. For fine-grained PATs, add this repo to "Repository access" and grant <code className="font-mono">Metadata: Read</code>, <code className="font-mono">Actions: Read</code>, and <code className="font-mono">Secrets: Read</code>.
            </p>
          )}
          {config.patAuthOk && config.patRepoAccessStatus === 403 && (
            <p className="text-amber-700 dark:text-amber-300">
              Repo access forbidden — PAT lacks required permissions, or org SSO is not authorized for this token.
            </p>
          )}
        </div>
      )}

      {!config.githubRepoConfigured && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          GITHUB_REPO is not set. Add it as a runtime secret with the format <code className="font-mono">owner/repo</code>.
        </p>
      )}
      {config.githubRepoConfigured && !config.githubPatConfigured && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          No GitHub PAT configured. Add either <code className="font-mono">GITHUB_PAT</code> or <code className="font-mono">GITHUB_PERSONAL_ACCESS_TOKEN</code> with <code className="font-mono">Actions: Read</code> and <code className="font-mono">Secrets: Read</code> on this repo.
        </p>
      )}
      {config.githubRepoConfigured && config.githubPatConfigured && !config.adminTokenConfigured && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          ADMIN_API_TOKEN is not set. Add it as a runtime secret and paste it into the field below to verify.
        </p>
      )}

      {allGood && config.repoExists === false && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          The configured repo <code className="font-mono">{config.githubRepo}</code> could not be found on GitHub. Double-check the owner/repo spelling.
        </p>
      )}
    </section>
  );
}

function GroupCard({ group, settingsUrl, repo }: { group: SecretGroupStatus; settingsUrl: string; repo: string }) {
  return (
    <article className="rounded-lg border bg-card p-4 space-y-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{group.label}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            group.ok
              ? 'bg-green-500/15 text-green-700 dark:text-green-300'
              : 'bg-destructive/15 text-destructive'
          }`}
        >
          {group.ok ? 'Ready' : `${group.requiredMissing.length} missing`}
        </span>
      </header>

      <SecretList title="Required — present" tone="ok" names={group.requiredPresent} />
      {group.requiredMissing.length > 0 && (
        <SecretList
          title="Required — missing"
          tone="error"
          names={group.requiredMissing}
          actionUrl={settingsUrl}
          showSource
          repo={repo}
        />
      )}
      <SecretList title="Optional — present" tone="ok" names={group.optionalPresent} muted />
      <SecretList title="Optional — missing" tone="warn" names={group.optionalMissing} muted showSource repo={repo} />
    </article>
  );
}

function SecretList({
  title,
  tone,
  names,
  muted = false,
  actionUrl,
  showSource = false,
  repo,
}: {
  title: string;
  tone: 'ok' | 'warn' | 'error';
  names: string[];
  muted?: boolean;
  actionUrl?: string;
  showSource?: boolean;
  repo?: string;
}) {
  if (names.length === 0) return null;
  const dot =
    tone === 'ok' ? 'bg-green-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-destructive';
  return (
    <div className={muted ? 'opacity-80' : ''}>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
        {actionUrl && (
          <>
            {' · '}
            <a className="underline" href={actionUrl} target="_blank" rel="noreferrer">
              Add in GitHub
            </a>
          </>
        )}
      </div>
      <ul className="space-y-2">
        {names.map((n) => {
          const src = showSource ? SECRET_SOURCES[n] : undefined;
          const newSecretUrl = repo ? `https://github.com/${repo}/settings/secrets/actions/new` : undefined;
          return (
            <li key={n} className="flex items-start gap-2 text-sm">
              <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <div className="min-w-0 flex-1">
                <code className="font-mono text-sm">{n}</code>
                {src && (
                  <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                    <div>{src.description}</div>
                    <div>
                      <span className="font-medium text-foreground/80">Source:</span>{' '}
                      {src.url ? (
                        <a
                          className="underline"
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {src.where}
                        </a>
                      ) : (
                        src.where
                      )}
                    </div>
                    {src.hint && (
                      <div>
                        <span className="font-medium text-foreground/80">Hint:</span>{' '}
                        <code className="font-mono">{src.hint}</code>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      <CopySetupButton name={n} source={src} />
                      {newSecretUrl && (
                        <a
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                          href={newSecretUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open GitHub Actions secrets page to add this secret"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open in GitHub
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function generateSetupSteps(name: string, src: SecretSource): string {
  const lines: string[] = [];
  lines.push(`## ${name}`);
  lines.push('');
  lines.push(`- [ ] ${src.description}`);
  lines.push(`  Source: ${src.where}`);
  if (src.url) lines.push(`  Link: ${src.url}`);
  if (src.hint) lines.push(`  CLI hint: \`${src.hint}\``);
  lines.push(`  Set in GitHub: Settings → Secrets and variables → Actions → New repository secret → Name: \`${name}\``);
  return lines.join('\n');
}

function CopySetupButton({ name, source }: { name: string; source: SecretSource }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(generateSetupSteps(name, source));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={copy}
      className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
      title="Copy setup steps to paste into a checklist"
    >
      {copied ? (
        <>
          <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy setup steps
        </>
      )}
    </button>
  );
}

function TriggerBuildButton({
  label,
  workflow,
  token,
  repo,
  version,
}: {
  label: string;
  workflow: 'ios-testflight.yml' | 'android-play-internal.yml';
  token: string;
  repo: string;
  version?: string;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function trigger() {
    if (!token) return;
    const ref = version && version.length > 0 ? version : 'main';
    if (!confirm(`Dispatch ${workflow} on ${repo || 'configured repo'} @ ref="${ref}"?`)) return;
    setState('loading');
    setMessage(null);
    try {
      const inputs: Record<string, string> = {};
      // Pass version as override input where the workflow accepts it.
      if (version) {
        // Strip leading "v" for numeric-ish overrides.
        const numeric = version.replace(/^v/, '');
        if (workflow === 'ios-testflight.yml') {
          // build_number expects integer; only pass if it parses.
          const asInt = parseInt(numeric.replace(/\./g, ''), 10);
          if (!Number.isNaN(asInt)) inputs.build_number = String(asInt);
        } else if (workflow === 'android-play-internal.yml') {
          const asInt = parseInt(numeric.replace(/\./g, ''), 10);
          if (!Number.isNaN(asInt)) inputs.version_code = String(asInt);
        }
      }
      const res = await fetch('/api/admin/trigger-build', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow,
          ref,
          inputs,
          ...(repo ? { repo } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState('error');
        const missing = Array.isArray(json?.missing) ? ` Missing: ${json.missing.join(', ')}` : '';
        setMessage(`${json?.error || `HTTP ${res.status}`}${missing}`);
        return;
      }
      setState('ok');
      setMessage(json?.message || 'Workflow dispatched.');
    } catch (e: any) {
      setState('error');
      setMessage(e?.message || String(e));
    }
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={trigger}
        disabled={!token || state === 'loading'}
        className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        title={`POST /api/admin/trigger-build with workflow=${workflow}`}
      >
        {state === 'loading' ? 'Dispatching…' : label}
      </button>
      {message && (
        <span
          className={`mt-1 max-w-xs text-xs ${
            state === 'error' ? 'text-destructive' : 'text-green-600 dark:text-green-400'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}

function ChecklistPreview() {
  const workflows = Object.keys(REQUIRED_SECRETS) as WorkflowId[];
  return (
    <section className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">What this page will check</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Once your admin token is accepted, the page calls the GitHub Actions Secrets API for the
          configured repo and reports which of the following are present. No values are ever read —
          only secret names.
        </p>
      </div>
      {workflows.map((wf) => {
        const spec = REQUIRED_SECRETS[wf];
        return (
          <div key={wf} className="space-y-2">
            <h3 className="text-sm font-semibold">{spec.label}</h3>
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground/80 mb-1">Required ({spec.required.length})</div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                {spec.required.map((n) => (
                  <li key={n} className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                    <code className="font-mono">{n}</code>
                  </li>
                ))}
              </ul>
              {spec.optional.length > 0 && (
                <>
                  <div className="font-medium text-foreground/80 mb-1 mt-2">Optional ({spec.optional.length})</div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                    {spec.optional.map((n) => (
                      <li key={n} className="flex items-center gap-1.5 opacity-80">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                        <code className="font-mono">{n}</code>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}


interface PatPermCheckResult {
  outcome: 'pass' | 'fail' | 'unknown';
  status: number | null;
  message: string;
  guidance?: string;
  request: {
    operation: string;
    method: string;
    url: string;
    requestBody?: string;
  };
  raw?: {
    status: number | null;
    headers: Record<string, string>;
    body: string;
    bodyTruncated: boolean;
  };
}

interface PatPermCheckResponse {
  repo: string;
  checkedAt: string;
  tokenSource: 'GITHUB_PAT' | 'GITHUB_PERSONAL_ACCESS_TOKEN' | null;
  tokenKind: 'fine-grained' | 'classic' | 'unknown';
  scopes: string | null;
  allPass: boolean;
  settingsUrl: string;
  patSettingsUrl: string;
  probeWorkflow: string;
  checks: {
    repoVisibility: PatPermCheckResult;
    secretsRead: PatPermCheckResult;
    workflowFiles: Array<PatPermCheckResult & { file: string }>;
    actionsWrite: PatPermCheckResult;
  };
}

function PatPermissionsCheckCard({ adminToken, repo }: { adminToken: string; repo: string }) {
  const [data, setData] = useState<PatPermCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!adminToken) {
      setError('Enter the Admin API token below first, then run the check.');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch('/api/admin/pat-permissions-check', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(repo ? { repo } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || `HTTP ${res.status}`);
        return;
      }
      setData(json as PatPermCheckResponse);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const explainStatus = (
    kind: 'repoVisibility' | 'secretsRead' | 'workflowFile' | 'actionsWrite',
    status: number | null,
  ): string => {
    if (status == null) return 'No response from GitHub.';
    if (kind === 'repoVisibility') {
      switch (status) {
        case 200:
          return 'GitHub returned repo metadata — the repo exists and this PAT can see it.';
        case 401:
          return 'GitHub rejected the PAT itself (invalid, expired, or revoked). Regenerate the token.';
        case 403:
          return 'Repo exists but the PAT is forbidden from reading it (SSO not authorized, IP allowlist, or missing Metadata: Read on a fine-grained PAT).';
        case 404:
          return 'GitHub returns 404 for repos this PAT cannot see — most often a typo in GITHUB_REPO, or a private repo the PAT has no access to.';
        default:
          return `Unexpected HTTP ${status} from GitHub while probing repo metadata.`;
      }
    }
    if (kind === 'secretsRead') {
      switch (status) {
        case 200:
          return 'GitHub returned the Actions secrets list — PAT has Secrets: Read on this repo.';
        case 401:
          return 'GitHub rejected the PAT itself (invalid, expired, or revoked). Regenerate the token.';
        case 403:
          return 'PAT authenticated but is not allowed to read Actions secrets on this repo (missing "Secrets: Read", or SSO not authorized for the org).';
        case 404:
          return 'Repo not visible to this PAT. For fine-grained PATs, the repo must be in the selected repositories list with Metadata: Read granted.';
        default:
          return `Unexpected HTTP ${status} from GitHub while listing repo secrets.`;
    }
    if (kind === 'workflowFile') {
      switch (status) {
        case 200:
          return 'GitHub has this workflow registered on the default branch — dispatch targets will resolve.';
        case 401:
          return 'GitHub rejected the PAT itself (invalid, expired, or revoked).';
        case 403:
          return 'PAT authenticated but is forbidden from reading workflows on this repo (missing Actions: Read, or SSO not authorized).';
        case 404:
          return 'Workflow file is not on the default branch. Commit and push the file to the default branch — workflows on feature branches are not dispatchable.';
        default:
          return `Unexpected HTTP ${status} from GitHub while probing workflow file.`;
      }
    }
    }
    switch (status) {
      case 204:
        return 'GitHub accepted the workflow dispatch — PAT has Actions: Read and write.';
      case 422:
        return 'GitHub accepted the request and only rejected the (deliberately invalid) ref — PAT has Actions: Read and write.';
      case 401:
        return 'GitHub rejected the PAT itself (invalid, expired, or revoked). Regenerate the token.';
      case 403:
        return 'PAT authenticated but is not allowed to dispatch workflows on this repo (missing "Actions: Read and write" for fine-grained, or "workflow" scope for classic).';
      case 404:
        return 'Workflow or repo not visible to this PAT. Either the workflow file is missing on the default branch, or this repo is not in the PAT\'s selected repositories.';
      default:
        return `Unexpected HTTP ${status} from GitHub while probing workflow dispatch.`;
    }
  };


  const renderCheck = (
    label: string,
    permName: string,
    kind: 'repoVisibility' | 'secretsRead' | 'workflowFile' | 'actionsWrite',
    c: PatPermCheckResult,
  ) => {
    const cls =
      c.outcome === 'pass'
        ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
        : c.outcome === 'fail'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    const icon = c.outcome === 'pass' ? '✓' : c.outcome === 'fail' ? '✗' : '?';
    const badge = c.outcome === 'pass' ? 'Pass' : c.outcome === 'fail' ? 'Fail' : 'Unknown';
    return (
      <div className={`rounded-md border px-3 py-2 text-xs space-y-1.5 ${cls}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">
            {icon} {label}{' '}
            <code className="font-mono text-[11px] opacity-80">({permName})</code>
          </span>
          <span className="shrink-0 rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
            {badge} · HTTP {c.status ?? '—'}
          </span>
        </div>
        <div className="text-[11px] opacity-90">
          <span className="font-semibold">Request: </span>
          {c.request.operation} —{' '}
          <code className="font-mono">
            {c.request.method} {c.request.url.replace('https://api.github.com', '')}
          </code>
        </div>
        <div className="text-[11px] opacity-95">
          <span className="font-semibold">What HTTP {c.status ?? '—'} means: </span>
          {explainStatus(kind, c.status)}
        </div>
        {c.message && (
          <div className="text-[11px] opacity-80 break-words">
            <span className="font-semibold">GitHub said: </span>
            <code className="font-mono">{c.message}</code>
          </div>
        )}
        {c.guidance && c.outcome !== 'pass' && (
          <div className="text-[11px] rounded bg-background/50 px-2 py-1">
            <span className="font-semibold">How to fix: </span>
            {c.guidance}
          </div>
        )}
        {c.raw && (
          <details className="text-[11px] rounded bg-background/60 px-2 py-1 open:pb-2">
            <summary className="cursor-pointer font-semibold">
              Raw response (HTTP {c.raw.status ?? '—'})
            </summary>
            <div className="mt-2 space-y-2">
              {c.request.requestBody && (
                <div>
                  <div className="font-semibold opacity-80">Request body</div>
                  <pre className="mt-0.5 max-h-32 overflow-auto rounded bg-background/80 p-2 font-mono text-[10.5px] whitespace-pre-wrap break-all">
                    {c.request.requestBody}
                  </pre>
                </div>
              )}
              {Object.keys(c.raw.headers).length > 0 && (
                <div>
                  <div className="font-semibold opacity-80">Response headers</div>
                  <pre className="mt-0.5 max-h-40 overflow-auto rounded bg-background/80 p-2 font-mono text-[10.5px] whitespace-pre-wrap break-all">
                    {Object.entries(c.raw.headers)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('\n')}
                  </pre>
                </div>
              )}
              <div>
                <div className="font-semibold opacity-80">
                  Response body{c.raw.bodyTruncated ? ' (truncated to 4KB)' : ''}
                </div>
                <pre className="mt-0.5 max-h-48 overflow-auto rounded bg-background/80 p-2 font-mono text-[10.5px] whitespace-pre-wrap break-all">
                  {c.raw.body || '(empty)'}
                </pre>
              </div>
            </div>
          </details>
        )}
      </div>
    );
  };


  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">GitHub PAT permissions</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Verifies that the server's GitHub PAT can read Actions secrets and
            dispatch workflows on the configured repo. The write check uses a
            bogus ref so nothing actually runs.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading || !adminToken}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Run permissions check'}
        </button>
      </div>

      {!adminToken && (
        <div className="text-xs text-muted-foreground">
          Enter the Admin API token below, then click <strong>Run permissions check</strong>.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-2">
          <div
            className={`rounded-md border px-3 py-2 text-xs font-semibold ${
              data.allPass
                ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            }`}
          >
            {data.allPass ? '✓ PAT has both required permissions' : '✗ PAT is missing at least one required permission'}
            <span className="ml-2 font-normal opacity-80">
              · Repo <code className="font-mono">{data.repo}</code> · Token{' '}
              <code className="font-mono">{data.tokenKind}</code>
              {data.scopes ? ` · scopes: ${data.scopes}` : ''}
            </span>
          </div>

          {renderCheck('Repo visibility', 'Metadata: Read', 'repoVisibility', data.checks.repoVisibility)}
          {renderCheck('Secrets read', 'Secrets: Read', 'secretsRead', data.checks.secretsRead)}
          {data.checks.workflowFiles.map((wf) =>
            renderCheck(
              `Workflow file: ${wf.file}`,
              'on default branch',
              'workflowFile',
              wf,
            ),
          )}
          {renderCheck(
            'Actions write (workflow_dispatch)',
            'Actions: Read and write',
            'actionsWrite',
            data.checks.actionsWrite,
          )}

          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
            <a className="underline" href={data.patSettingsUrl} target="_blank" rel="noreferrer">
              Manage PAT permissions →
            </a>
            <a className="underline" href={data.settingsUrl} target="_blank" rel="noreferrer">
              Repo Actions secrets →
            </a>
            <span>
              Checked {new Date(data.checkedAt).toLocaleTimeString()} · probed workflow{' '}
              <code className="font-mono">{data.probeWorkflow}</code>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
