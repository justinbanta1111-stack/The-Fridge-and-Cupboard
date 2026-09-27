import { createFileRoute } from '@tanstack/react-router';
import { diffSecrets, fetchRepoSecretNames } from '@/lib/build-secrets';

export const Route = createFileRoute('/api/admin/build-secrets-status')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get('authorization');
        const expectedToken = process.env.ADMIN_API_TOKEN || '';
        if (!expectedToken) {
          return Response.json(
            {
              error: 'ADMIN_API_TOKEN is not configured on the server.',
              code: 'admin_token_unset',
            },
            { status: 401 },
          );
        }
        if (authHeader !== `Bearer ${expectedToken}`) {
          return Response.json(
            {
              error: 'Admin API token rejected. Paste the current ADMIN_API_TOKEN value exactly — no quotes, no "Bearer " prefix, no extra whitespace.',
              code: 'admin_token_invalid',
            },
            { status: 401 },
          );
        }

        let body: any = {};
        try {
          body = await request.json();
        } catch {
          // empty body is fine
        }

        let tokenSource: 'GITHUB_PAT' | 'GITHUB_PERSONAL_ACCESS_TOKEN' | null = null;
        let githubPat: string | undefined;
        if (process.env.GITHUB_PAT) {
          tokenSource = 'GITHUB_PAT';
          githubPat = process.env.GITHUB_PAT;
        } else if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
          tokenSource = 'GITHUB_PERSONAL_ACCESS_TOKEN';
          githubPat = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        }
        const githubRepo = body?.repo || process.env.GITHUB_REPO;
        if (!githubPat || !githubRepo) {
          return Response.json(
            {
              error: 'Missing GitHub PAT or GITHUB_REPO',
              tokenSource,
              githubRepo: githubRepo || null,
              githubPatConfigured: !!githubPat,
            },
            { status: 500 }
          );
        }

        let configuredSecrets: Set<string>;
        try {
          configuredSecrets = await fetchRepoSecretNames(githubRepo, githubPat);
        } catch (e: any) {
          // Try to extract HTTP status + message from "GitHub secrets API <status>: <body>"
          const raw = e?.message || String(e);
          const m = /GitHub secrets API (\d+):\s*([\s\S]*)$/.exec(raw);
          let ghStatus: number | null = null;
          let ghMessage: string = raw;
          if (m) {
            ghStatus = Number(m[1]);
            const bodyText = m[2];
            try {
              const j = JSON.parse(bodyText);
              ghMessage = j?.message || bodyText;
            } catch {
              ghMessage = bodyText.slice(0, 500);
            }
          }
          let hint =
            'PAT needs Actions: Read and Secrets: Read on this repo. For fine-grained PATs, the repo must also be in the selected repository list.';
          if (ghStatus === 401) hint = 'PAT is invalid, expired, or revoked. Regenerate it on GitHub and update GITHUB_PAT.';
          if (ghStatus === 403) hint = 'PAT authenticated but lacks the required scopes (Actions: Read + Secrets: Read), or SSO is not authorized for the org.';
          if (ghStatus === 404) hint = 'Repo not visible to this PAT — for fine-grained PATs make sure this exact repo is selected and Metadata: Read is granted.';
          return Response.json(
            {
              error: 'GitHub API rejected the request when listing repo secrets',
              hint,
              githubStatus: ghStatus,
              githubMessage: ghMessage,
              tokenSource,
              repo: githubRepo,
              settingsUrl: `https://github.com/${githubRepo}/settings/secrets/actions`,
              details: raw.slice(0, 800),
            },
            { status: 502 }
          );
        }

        const groups = diffSecrets(configuredSecrets);
        const allOk = groups.every((g) => g.ok);
        return Response.json({
          repo: githubRepo,
          checkedAt: new Date().toISOString(),
          allOk,
          tokenSource,
          settingsUrl: `https://github.com/${githubRepo}/settings/secrets/actions`,
          groups,
        });
      },
    },
  },
});
