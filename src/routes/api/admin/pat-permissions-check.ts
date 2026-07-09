import { createFileRoute } from '@tanstack/react-router';

type CheckOutcome = 'pass' | 'fail' | 'unknown';

interface RequestInfo {
  /** Human label, e.g. "List repo Actions secrets". */
  operation: string;
  method: string;
  url: string;
  /** Body sent to GitHub, if any. */
  requestBody?: string;
}

interface RawResponse {
  status: number | null;
  /** Selected response headers (never Authorization, cookies, etc.). */
  headers: Record<string, string>;
  /** Raw response body text, truncated to 4KB. */
  body: string;
  bodyTruncated: boolean;
}

interface CheckResult {
  outcome: CheckOutcome;
  status: number | null;
  message: string;
  guidance?: string;
  request: RequestInfo;
  /** Present when the check failed or returned an unexpected status. */
  raw?: RawResponse;
}

const SAFE_HEADERS = [
  'content-type',
  'x-github-request-id',
  'x-github-media-type',
  'x-github-api-version-selected',
  'x-accepted-github-permissions',
  'x-oauth-scopes',
  'x-accepted-oauth-scopes',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
  'x-ratelimit-resource',
  'x-ratelimit-used',
  'retry-after',
];

function pickHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of SAFE_HEADERS) {
    const v = h.get(name);
    if (v != null) out[name] = v;
  }
  return out;
}

function buildRaw(status: number, body: string, headers: Headers): RawResponse {
  const MAX = 4096;
  const truncated = body.length > MAX;
  return {
    status,
    headers: pickHeaders(headers),
    body: truncated ? body.slice(0, MAX) : body,
    bodyTruncated: truncated,
  };
}


async function ghFetch(
  url: string,
  pat: string,
  init: RequestInit = {},
): Promise<{ status: number; body: string; headers: Headers }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const body = await res.text();
  return { status: res.status, body, headers: res.headers };
}

function messageFrom(body: string, fallback: string): string {
  try {
    const j = JSON.parse(body);
    return j?.message || fallback;
  } catch {
    return fallback;
  }
}

export const Route = createFileRoute('/api/admin/pat-permissions-check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get('authorization');
        const expectedToken = process.env.ADMIN_API_TOKEN || '';
        if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
          return Response.json(
            { error: 'Unauthorized — invalid or missing ADMIN_API_TOKEN.' },
            { status: 401 },
          );
        }

        let body: any = {};
        try {
          body = await request.json();
        } catch {}

        let tokenSource: 'GITHUB_PAT' | 'GITHUB_PERSONAL_ACCESS_TOKEN' | null = null;
        let pat: string | undefined;
        if (process.env.GITHUB_PAT) {
          tokenSource = 'GITHUB_PAT';
          pat = process.env.GITHUB_PAT;
        } else if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
          tokenSource = 'GITHUB_PERSONAL_ACCESS_TOKEN';
          pat = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        }
        const repo = body?.repo || process.env.GITHUB_REPO;

        if (!pat || !repo) {
          return Response.json(
            {
              error: 'Missing GitHub PAT or GITHUB_REPO.',
              guidance:
                'Set GITHUB_PAT and GITHUB_REPO (owner/repo) as project secrets, then retry.',
              tokenSource,
              repo: repo || null,
            },
            { status: 500 },
          );
        }

        const tokenKind: 'fine-grained' | 'classic' | 'unknown' = pat.startsWith(
          'github_pat_',
        )
          ? 'fine-grained'
          : pat.startsWith('ghp_')
            ? 'classic'
            : 'unknown';

        const settingsUrl = `https://github.com/${repo}/settings/secrets/actions`;
        const patSettingsUrl =
          tokenKind === 'fine-grained'
            ? 'https://github.com/settings/personal-access-tokens'
            : 'https://github.com/settings/tokens';

        // --- 0. Repo visibility — GET /repos/{owner}/{repo}
        //     200: repo visible to this PAT.
        //     404: repo does not exist OR is private/forbidden and GitHub
        //          hides existence (typo, wrong owner, no access, or —
        //          for fine-grained PATs — not in the selected repos list).
        //     403: repo exists but PAT is forbidden (SSO not authorized on
        //          org token, IP allowlist, or Metadata permission missing).
        //     401: PAT itself is invalid/expired/revoked.
        const visibilityUrl = `https://api.github.com/repos/${repo}`;
        const visibilityReq: RequestInfo = {
          operation: 'Get repo metadata (visibility probe)',
          method: 'GET',
          url: visibilityUrl,
        };
        const visibilityRes = await ghFetch(visibilityUrl, pat);
        let repoVisibility: CheckResult;
        if (visibilityRes.status === 200) {
          let visibility: string | null = null;
          try {
            const j = JSON.parse(visibilityRes.body);
            visibility = j?.visibility || (j?.private ? 'private' : 'public');
          } catch {}
          repoVisibility = {
            outcome: 'pass',
            status: 200,
            message: `Repo is visible to this PAT${visibility ? ` (${visibility})` : ''}.`,
            request: visibilityReq,
          };
        } else if (visibilityRes.status === 404) {
          repoVisibility = {
            outcome: 'fail',
            status: 404,
            message: 'Not Found — repo is not visible to this PAT.',
            guidance:
              tokenKind === 'fine-grained'
                ? `GitHub returns 404 instead of 403 to hide private repos. Verify GITHUB_REPO="${repo}" is spelled correctly (owner and repo, case-sensitive) and that the repo is in this fine-grained PAT's selected repositories with at least "Metadata: Read". Manage at ${patSettingsUrl}.`
                : `GitHub returns 404 instead of 403 to hide private repos. Verify GITHUB_REPO="${repo}" is spelled correctly (owner and repo, case-sensitive) and that the PAT's user account has access to the repo (collaborator or org member). Classic PATs also need the "repo" scope for private repos — manage at ${patSettingsUrl}.`,
            request: visibilityReq,
            raw: buildRaw(visibilityRes.status, visibilityRes.body, visibilityRes.headers),
          };
        } else if (visibilityRes.status === 403) {
          const msg = messageFrom(visibilityRes.body, 'Forbidden');
          const isSso = /saml|sso|single sign/i.test(visibilityRes.body);
          repoVisibility = {
            outcome: 'fail',
            status: 403,
            message: msg,
            guidance: isSso
              ? `The repo's org enforces SAML SSO and this PAT has not been authorized for it. Open ${patSettingsUrl}, find this token, and click "Configure SSO" → "Authorize" for the org that owns "${repo}".`
              : `PAT authenticated but is forbidden from reading this repo. Common causes: org IP allowlist blocks the request, fine-grained PAT is missing "Metadata: Read", or org policies block PAT access. Manage at ${patSettingsUrl}.`,
            request: visibilityReq,
            raw: buildRaw(visibilityRes.status, visibilityRes.body, visibilityRes.headers),
          };
        } else if (visibilityRes.status === 401) {
          const msg = messageFrom(visibilityRes.body, 'Bad credentials');
          repoVisibility = {
            outcome: 'fail',
            status: 401,
            message: msg,
            guidance: `GitHub rejected the PAT itself (invalid, expired, or revoked). Regenerate it at ${patSettingsUrl} and update the GITHUB_PAT secret.`,
            request: visibilityReq,
            raw: buildRaw(visibilityRes.status, visibilityRes.body, visibilityRes.headers),
          };
        } else {
          const msg = messageFrom(visibilityRes.body, `HTTP ${visibilityRes.status}`);
          repoVisibility = {
            outcome: 'unknown',
            status: visibilityRes.status,
            message: msg,
            guidance: 'Unexpected response from GitHub while probing repo visibility. See raw response for details.',
            request: visibilityReq,
            raw: buildRaw(visibilityRes.status, visibilityRes.body, visibilityRes.headers),
          };
        }

        // --- 1. Secrets: Read — list repo Actions secrets (page 1 is enough)
        const secretsUrl = `https://api.github.com/repos/${repo}/actions/secrets?per_page=1`;
        const secretsReq: RequestInfo = {
          operation: 'List repo Actions secrets',
          method: 'GET',
          url: secretsUrl,
        };
        const secretsRes = await ghFetch(secretsUrl, pat);
        let secretsRead: CheckResult;
        if (secretsRes.status === 200) {
          secretsRead = {
            outcome: 'pass',
            status: 200,
            message: 'PAT can list Actions secrets on this repo.',
            request: secretsReq,
          };
        } else {
          const msg = messageFrom(secretsRes.body, `HTTP ${secretsRes.status}`);
          secretsRead = {
            outcome: 'fail',
            status: secretsRes.status,
            message: msg,
            guidance:
              tokenKind === 'fine-grained'
                ? `Fine-grained PAT needs "Secrets: Read" on ${repo}, and this repo must be in the token's selected repositories. Update at ${patSettingsUrl}.`
                : `Classic PAT needs the "repo" scope (and "admin:repo_hook" is not enough). Regenerate at ${patSettingsUrl} with "repo" checked.`,
            request: secretsReq,
            raw: buildRaw(secretsRes.status, secretsRes.body, secretsRes.headers),
          };
        }

        // --- 1b. Workflow files present on default branch
        //     GET /repos/{owner}/{repo}/actions/workflows/{file}
        //     200: workflow is registered on the default branch — dispatch will work.
        //     404: file is missing from the default branch (not pushed / on a
        //          feature branch / wrong filename / different case).
        const workflowFilesToProbe: string[] = Array.isArray(body?.workflowFiles) && body.workflowFiles.length
          ? body.workflowFiles.filter((s: unknown) => typeof s === 'string')
          : ['ios-testflight.yml', 'android-play-internal.yml'];
        const workflowFiles: Array<CheckResult & { file: string }> = [];
        for (const file of workflowFilesToProbe) {
          const wfUrl = `https://api.github.com/repos/${repo}/actions/workflows/${file}`;
          const wfReq: RequestInfo = {
            operation: `Get workflow "${file}" on default branch`,
            method: 'GET',
            url: wfUrl,
          };
          const wfRes = await ghFetch(wfUrl, pat);
          if (wfRes.status === 200) {
            let state: string | null = null;
            let path: string | null = null;
            try {
              const j = JSON.parse(wfRes.body);
              state = j?.state || null;
              path = j?.path || null;
            } catch {}
            workflowFiles.push({
              file,
              outcome: state && state !== 'active' ? 'unknown' : 'pass',
              status: 200,
              message: `Workflow registered on default branch${path ? ` at ${path}` : ''}${state ? ` (state: ${state})` : ''}.`,
              guidance:
                state && state !== 'active'
                  ? `Workflow exists but its state is "${state}" — dispatch may be rejected. Re-enable it in the repo's Actions tab.`
                  : undefined,
              request: wfReq,
              raw: buildRaw(wfRes.status, wfRes.body, wfRes.headers),
            });
          } else if (wfRes.status === 404) {
            workflowFiles.push({
              file,
              outcome: 'fail',
              status: 404,
              message: 'Not Found — workflow file is not registered on the default branch.',
              guidance: `GitHub only registers workflows that exist on the default branch. Confirm .github/workflows/${file} is committed and pushed to the default branch of ${repo} (not a feature branch), and that the filename matches exactly (case-sensitive).`,
              request: wfReq,
              raw: buildRaw(wfRes.status, wfRes.body, wfRes.headers),
            });
          } else {
            const msg = messageFrom(wfRes.body, `HTTP ${wfRes.status}`);
            workflowFiles.push({
              file,
              outcome: wfRes.status === 200 ? 'pass' : 'unknown',
              status: wfRes.status,
              message: msg,
              guidance:
                wfRes.status === 403
                  ? 'PAT authenticated but is forbidden from reading workflows on this repo (missing Actions: Read, or SSO not authorized).'
                  : 'Unexpected response from GitHub while probing workflow file. See raw response for details.',
              request: wfReq,
              raw: buildRaw(wfRes.status, wfRes.body, wfRes.headers),
            });
          }
        }

        // --- 2. Actions: Write — probe workflow dispatch with an invalid ref.
        //     GitHub returns 422 ("No ref found") when the PAT has write
        //     permission but the ref is bogus, 403/404 when it does not.
        //     This dispatches nothing because the ref does not exist.
        const probeWorkflow = body?.workflow || 'ios-testflight.yml';
        const probeRef = '__lovable_permcheck_nonexistent_ref__';
        const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/${probeWorkflow}/dispatches`;
        const dispatchBody = JSON.stringify({ ref: probeRef });
        const dispatchReq: RequestInfo = {
          operation: `Dispatch workflow ${probeWorkflow} (probe with invalid ref)`,
          method: 'POST',
          url: dispatchUrl,
          requestBody: dispatchBody,
        };
        const dispatchRes = await ghFetch(dispatchUrl, pat, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: dispatchBody,
        });
        let actionsWrite: CheckResult;
        if (dispatchRes.status === 422) {
          actionsWrite = {
            outcome: 'pass',
            status: 422,
            message:
              'PAT can dispatch workflows on this repo (probed with an invalid ref).',
            request: dispatchReq,
          };
        } else if (dispatchRes.status === 204) {
          actionsWrite = {
            outcome: 'pass',
            status: 204,
            message: 'PAT can dispatch workflows on this repo.',
            request: dispatchReq,
          };
        } else if (dispatchRes.status === 403 || dispatchRes.status === 404) {
          const msg = messageFrom(dispatchRes.body, `HTTP ${dispatchRes.status}`);
          actionsWrite = {
            outcome: 'fail',
            status: dispatchRes.status,
            message: msg,
            guidance:
              tokenKind === 'fine-grained'
                ? `Fine-grained PAT needs "Actions: Read and write" on ${repo}, and this repo must be in the token's selected repositories. Update at ${patSettingsUrl}, then reconnect. Also confirm the workflow file "${probeWorkflow}" exists on the default branch.`
                : `Classic PAT needs the "workflow" scope (in addition to "repo") to dispatch Actions. Regenerate at ${patSettingsUrl} with "workflow" checked. Also confirm the workflow file "${probeWorkflow}" exists on the default branch.`,
            request: dispatchReq,
            raw: buildRaw(dispatchRes.status, dispatchRes.body, dispatchRes.headers),
          };
        } else {
          const msg = messageFrom(dispatchRes.body, `HTTP ${dispatchRes.status}`);
          actionsWrite = {
            outcome: 'unknown',
            status: dispatchRes.status,
            message: msg,
            guidance:
              'Unexpected response from GitHub while probing workflow dispatch. See raw response for details.',
            request: dispatchReq,
            raw: buildRaw(dispatchRes.status, dispatchRes.body, dispatchRes.headers),
          };
        }


        // Bubble up classic PAT scopes when present (fine-grained returns none).
        const scopes = secretsRes.headers.get('x-oauth-scopes') || null;

        const allPass =
          repoVisibility.outcome === 'pass' &&
          secretsRead.outcome === 'pass' &&
          workflowFiles.every((w) => w.outcome === 'pass') &&
          actionsWrite.outcome === 'pass';

        return Response.json({
          repo,
          checkedAt: new Date().toISOString(),
          tokenSource,
          tokenKind,
          scopes,
          allPass,
          settingsUrl,
          patSettingsUrl,
          probeWorkflow,
          checks: {
            repoVisibility,
            secretsRead,
            workflowFiles,
            actionsWrite,
          },
        });
      },
    },
  },
});
