import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/admin/build-config-check')({
  server: {
    handlers: {
      GET: async () => {
        const githubRepo = process.env.GITHUB_REPO;
        const adminToken = process.env.ADMIN_API_TOKEN;

        // Determine which env var supplied the PAT (prefer GITHUB_PAT)
        let tokenSource: 'GITHUB_PAT' | 'GITHUB_PERSONAL_ACCESS_TOKEN' | null = null;
        let githubPat: string | undefined;
        if (process.env.GITHUB_PAT) {
          tokenSource = 'GITHUB_PAT';
          githubPat = process.env.GITHUB_PAT;
        } else if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
          tokenSource = 'GITHUB_PERSONAL_ACCESS_TOKEN';
          githubPat = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        }
        const tokenLength = githubPat?.length ?? 0;
        const tokenPrefix = githubPat ? githubPat.slice(0, 4) : null;

        // Public repo reachability (no auth)
        let repoReachable: boolean | null = null;
        let repoExists: boolean | null = null;
        if (githubRepo) {
          try {
            const res = await fetch(`https://api.github.com/repos/${githubRepo}`, {
              headers: { Accept: 'application/vnd.github+json' },
            });
            repoExists = res.status === 200;
            repoReachable = res.status === 200 || res.status === 404;
          } catch {
            repoReachable = false;
          }
        }

        // PAT auth check — call GitHub with the token to surface the exact error
        let patStatus: number | null = null;
        let patAuthOk: boolean | null = null;
        let patError: string | null = null;
        let patScopes: string | null = null;
        let patRepoAccessStatus: number | null = null;
        let patRepoAccessError: string | null = null;
        if (githubPat) {
          try {
            const res = await fetch('https://api.github.com/user', {
              headers: {
                Authorization: `Bearer ${githubPat}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
            });
            patStatus = res.status;
            patAuthOk = res.ok;
            patScopes = res.headers.get('x-oauth-scopes');
            if (!res.ok) {
              const text = await res.text();
              try {
                const j = JSON.parse(text);
                patError = j?.message || text.slice(0, 300);
              } catch {
                patError = text.slice(0, 300);
              }
            }
          } catch (e: any) {
            patAuthOk = false;
            patError = e?.message || String(e);
          }

          // Authenticated repo access — fine-grained PATs only return 200 if
          // the repo is in the selected list AND has Metadata: Read.
          if (githubRepo) {
            try {
              const res = await fetch(`https://api.github.com/repos/${githubRepo}`, {
                headers: {
                  Authorization: `Bearer ${githubPat}`,
                  Accept: 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                },
              });
              patRepoAccessStatus = res.status;
              if (!res.ok) {
                const text = await res.text();
                try {
                  const j = JSON.parse(text);
                  patRepoAccessError = j?.message || text.slice(0, 300);
                } catch {
                  patRepoAccessError = text.slice(0, 300);
                }
              }
            } catch (e: any) {
              patRepoAccessError = e?.message || String(e);
            }
          }
        }

        return Response.json({
          githubRepoConfigured: !!githubRepo,
          githubRepo: githubRepo || null,
          githubPatConfigured: !!githubPat,
          tokenSource,
          tokenLength,
          tokenPrefix,
          adminTokenConfigured: !!adminToken,
          repoExists,
          repoReachable,
          patStatus,
          patAuthOk,
          patError,
          patScopes,
          patRepoAccessStatus,
          patRepoAccessError,
          settingsUrl: githubRepo ? `https://github.com/${githubRepo}/settings/secrets/actions` : null,
        });
      },
    },
  },
});
