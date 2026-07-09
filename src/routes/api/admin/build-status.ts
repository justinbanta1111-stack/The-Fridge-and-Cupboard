import { createFileRoute } from '@tanstack/react-router';

// Returns the latest workflow run for a given workflow file, plus any
// downloadable artifacts. Used by the "Mobile App Build" UI to show
// real-time build progress and a final download link.

export const Route = createFileRoute('/api/admin/build-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get('authorization');
        const expected = `Bearer ${process.env.ADMIN_API_TOKEN || ''}`;
        if (!process.env.ADMIN_API_TOKEN || authHeader !== expected) {
          return new Response('Unauthorized', { status: 401 });
        }

        const url = new URL(request.url);
        const workflow = url.searchParams.get('workflow');
        const repoParam = url.searchParams.get('repo');

        if (!workflow) {
          return Response.json({ error: 'workflow query param required' }, { status: 400 });
        }

        const pat = process.env.GITHUB_PAT || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        const repo = repoParam || process.env.GITHUB_REPO;
        if (!pat || !repo) {
          return Response.json({ error: 'Missing GITHUB_PAT or GITHUB_REPO' }, { status: 500 });
        }

        const headers = {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        };

        const runsRes = await fetch(
          `https://api.github.com/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=1`,
          { headers },
        );
        if (!runsRes.ok) {
          const text = await runsRes.text();
          return Response.json(
            { error: 'GitHub API error', status: runsRes.status, details: text },
            { status: 502 },
          );
        }
        const runsJson: any = await runsRes.json();
        const run = runsJson?.workflow_runs?.[0];
        if (!run) {
          return Response.json({ run: null, artifacts: [] });
        }

        let artifacts: Array<{ name: string; size: number; downloadUrl: string }> = [];
        if (run.status === 'completed') {
          const artRes = await fetch(
            `https://api.github.com/repos/${repo}/actions/runs/${run.id}/artifacts`,
            { headers },
          );
          if (artRes.ok) {
            const artJson: any = await artRes.json();
            artifacts = (artJson?.artifacts || []).map((a: any) => ({
              name: a.name,
              size: a.size_in_bytes,
              downloadUrl: `https://github.com/${repo}/actions/runs/${run.id}/artifacts/${a.id}`,
            }));
          }
        }

        return Response.json({
          repo,
          workflow,
          run: {
            id: run.id,
            status: run.status,
            conclusion: run.conclusion,
            htmlUrl: run.html_url,
            createdAt: run.created_at,
            updatedAt: run.updated_at,
            headBranch: run.head_branch,
            displayTitle: run.display_title,
            runNumber: run.run_number,
          },
          artifacts,
        });
      },
    },
  },
});
