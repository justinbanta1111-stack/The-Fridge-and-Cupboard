import { createFileRoute } from '@tanstack/react-router';

// Returns the latest iOS preflight job (from the most recent ios-testflight.yml
// run) and the per-step results. Used by the admin build page to show whether
// the signing/provisioning secrets are valid BEFORE the user dispatches a new
// build.

const PREFLIGHT_JOB_NAME_PREFIX = 'Preflight'; // matches "Preflight — validate iOS signing secrets"

export const Route = createFileRoute('/api/admin/build-preflight')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get('authorization');
        const expected = `Bearer ${process.env.ADMIN_API_TOKEN || ''}`;
        if (!process.env.ADMIN_API_TOKEN || authHeader !== expected) {
          return new Response('Unauthorized', { status: 401 });
        }

        const url = new URL(request.url);
        const workflow = url.searchParams.get('workflow') || 'ios-testflight.yml';
        const repoParam = url.searchParams.get('repo');

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

        // Latest run of the workflow (any status).
        const runsRes = await fetch(
          `https://api.github.com/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=1`,
          { headers },
        );
        if (!runsRes.ok) {
          const text = await runsRes.text();
          return Response.json(
            { error: 'GitHub API error listing runs', status: runsRes.status, details: text },
            { status: 502 },
          );
        }
        const runsJson: any = await runsRes.json();
        const run = runsJson?.workflow_runs?.[0];
        if (!run) {
          return Response.json({ preflight: null, run: null });
        }

        const jobsRes = await fetch(
          `https://api.github.com/repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`,
          { headers },
        );
        if (!jobsRes.ok) {
          const text = await jobsRes.text();
          return Response.json(
            { error: 'GitHub API error listing jobs', status: jobsRes.status, details: text },
            { status: 502 },
          );
        }
        const jobsJson: any = await jobsRes.json();
        const jobs: any[] = jobsJson?.jobs || [];
        const preflightJob = jobs.find((j) => typeof j.name === 'string' && j.name.startsWith(PREFLIGHT_JOB_NAME_PREFIX));

        if (!preflightJob) {
          return Response.json({
            preflight: null,
            run: {
              id: run.id,
              status: run.status,
              conclusion: run.conclusion,
              htmlUrl: run.html_url,
              runNumber: run.run_number,
              createdAt: run.created_at,
              updatedAt: run.updated_at,
              displayTitle: run.display_title,
            },
            note: 'No preflight job found in the latest run. Old runs predate the preflight job — trigger a new build to populate this.',
          });
        }

        const steps = (preflightJob.steps || []).map((s: any) => ({
          name: s.name as string,
          status: s.status as string, // queued | in_progress | completed
          conclusion: (s.conclusion ?? null) as string | null, // success | failure | skipped | cancelled | null
          number: s.number as number,
          startedAt: s.started_at as string | null,
          completedAt: s.completed_at as string | null,
        }));

        // Find the first failing step (skip setup/checkout/post steps for user clarity).
        const failingStep = steps.find(
          (s: any) => s.conclusion === 'failure' && !/^Set up job|^Checkout|^Post |^Complete job/i.test(s.name),
        );

        return Response.json({
          repo,
          workflow,
          run: {
            id: run.id,
            status: run.status,
            conclusion: run.conclusion,
            htmlUrl: run.html_url,
            runNumber: run.run_number,
            createdAt: run.created_at,
            updatedAt: run.updated_at,
            displayTitle: run.display_title,
          },
          preflight: {
            jobId: preflightJob.id,
            name: preflightJob.name,
            status: preflightJob.status, // queued | in_progress | completed
            conclusion: preflightJob.conclusion, // success | failure | ...
            htmlUrl: preflightJob.html_url,
            startedAt: preflightJob.started_at,
            completedAt: preflightJob.completed_at,
            steps,
            failingStep: failingStep
              ? {
                  name: failingStep.name,
                  logUrl: `${preflightJob.html_url}#step:${failingStep.number}:1`,
                }
              : null,
          },
        });
      },
    },
  },
});
