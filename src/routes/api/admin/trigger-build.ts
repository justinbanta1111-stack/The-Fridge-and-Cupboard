import { createFileRoute } from '@tanstack/react-router';

// Required GitHub Actions repository secrets per workflow. These are the
// secrets the build/sign/upload steps reference; missing any of them means
// the run will fail partway through. Optional secrets are listed separately
// (defaults exist in the workflow).
const REQUIRED_SECRETS: Record<string, { required: string[]; optional: string[] }> = {
  'ios-testflight.yml': {
    required: [
      // Identity / bundle
      'IOS_TEAM_ID',
      'IOS_BUNDLE_ID',
      'IOS_SIGNING_IDENTITY',
      // Signing cert + provisioning
      'IOS_CERTIFICATE_BASE64',
      'IOS_CERTIFICATE_PASSWORD',
      'IOS_KEYCHAIN_PASSWORD',
      'IOS_PROVISIONING_PROFILE_BASE64',
      // App Store Connect API key (TestFlight upload)
      'APP_STORE_CONNECT_API_KEY_ID',
      'APP_STORE_CONNECT_API_ISSUER_ID',
      'APP_STORE_CONNECT_API_KEY_BASE64',
    ],
    optional: ['IOS_APS_ENVIRONMENT'],
  },
  'android-play-internal.yml': {
    required: [
      // Identity / bundle
      'ANDROID_PACKAGE_NAME',
      // Keystore
      'ANDROID_KEYSTORE_BASE64',
      'ANDROID_KEY_ALIAS',
      'ANDROID_KEYSTORE_PASSWORD',
      'ANDROID_KEY_PASSWORD',
      // Play upload
      'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
    ],
    optional: ['ANDROID_EXPECTED_SHA1'],
  },
};

async function fetchRepoSecretNames(repo: string, pat: string): Promise<Set<string>> {
  // GitHub returns secrets paginated. 100/page is the max.
  const names = new Set<string>();
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/secrets?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub secrets API ${res.status}: ${text}`);
    }
    const data: { total_count: number; secrets: Array<{ name: string }> } = await res.json();
    for (const s of data.secrets) names.add(s.name);
    if (data.secrets.length < 100) break;
    page += 1;
  }
  return names;
}

export const Route = createFileRoute('/api/admin/trigger-build')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get('authorization');
        const expected = `Bearer ${process.env.ADMIN_API_TOKEN || ''}`;
        if (!process.env.ADMIN_API_TOKEN || authHeader !== expected) {
          return new Response('Unauthorized', { status: 401 });
        }

        let body: any = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { workflow, ref = 'main', inputs = {}, repo, skipSecretCheck = false } = body;

        if (!workflow || !REQUIRED_SECRETS[workflow]) {
          return Response.json(
            { error: 'workflow required: ios-testflight.yml or android-play-internal.yml' },
            { status: 400 }
          );
        }

        const githubPat = process.env.GITHUB_PAT || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        const githubRepo = repo || process.env.GITHUB_REPO;

        if (!githubPat || !githubRepo) {
          return Response.json(
            { error: 'Missing GITHUB_PAT or GITHUB_REPO. Pass repo in body or set GITHUB_REPO env var.' },
            { status: 500 }
          );
        }

        // ---- Preflight: verify required secrets exist in the repo ----
        const spec = REQUIRED_SECRETS[workflow];
        let presentOptional: string[] = [];
        if (!skipSecretCheck) {
          let configured: Set<string>;
          try {
            configured = await fetchRepoSecretNames(githubRepo, githubPat);
          } catch (e: any) {
            return Response.json(
              {
                error: 'Preflight failed: could not list repository secrets',
                hint: 'The GITHUB_PAT must have `repo` + `actions:read`/`secrets:read` scope (or fine-grained "Secrets: Read") on this repo.',
                details: e?.message || String(e),
              },
              { status: 502 }
            );
          }

          const missing = spec.required.filter((name) => !configured.has(name));
          if (missing.length > 0) {
            return Response.json(
              {
                error: 'Preflight failed: required GitHub Actions secrets are missing',
                workflow,
                repo: githubRepo,
                missing,
                fix: `Add the missing secrets at https://github.com/${githubRepo}/settings/secrets/actions, then retry. Pass {"skipSecretCheck": true} to bypass (not recommended).`,
              },
              { status: 412 }
            );
          }
          presentOptional = spec.optional.filter((name) => configured.has(name));
        }

        const url = `https://api.github.com/repos/${githubRepo}/actions/workflows/${workflow}/dispatches`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubPat}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref, inputs }),
        });

        if (!response.ok) {
          const text = await response.text();
          return Response.json(
            { error: 'GitHub API error', status: response.status, details: text },
            { status: 502 }
          );
        }

        return Response.json({
          success: true,
          workflow,
          repo: githubRepo,
          ref,
          preflight: skipSecretCheck
            ? { skipped: true }
            : {
                requiredSecretsVerified: spec.required,
                optionalSecretsPresent: presentOptional,
                optionalSecretsMissing: spec.optional.filter((n) => !presentOptional.includes(n)),
              },
          message: `Workflow dispatch queued. Check https://github.com/${githubRepo}/actions`,
        });
      },
    },
  },
});
