import { createFileRoute } from '@tanstack/react-router';

// Temporary diagnostic + dispatcher. Delete after use.
export const Route = createFileRoute('/api/public/tf-dispatch')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get('action') || 'status';
        const pat = process.env.GITHUB_PAT || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '';
        const repo = process.env.GITHUB_REPO || '';
        if (!pat || !repo) {
          return Response.json({ error: 'missing GITHUB_PAT or GITHUB_REPO', hasPat: !!pat, hasRepo: !!repo }, { status: 500 });
        }
        const h = {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'lovable-tf-dispatch',
        };

        if (action === 'status') {
          const [repoRes, wfRes, fileRes] = await Promise.all([
            fetch(`https://api.github.com/repos/${repo}`, { headers: h }),
            fetch(`https://api.github.com/repos/${repo}/actions/workflows`, { headers: h }),
            fetch(`https://api.github.com/repos/${repo}/contents/.github/workflows/ios-testflight.yml`, { headers: h }),
          ]);
          const repoJson: any = repoRes.ok ? await repoRes.json() : await repoRes.text();
          const wfJson: any = wfRes.ok ? await wfRes.json() : await wfRes.text();
          const fileOk = fileRes.ok;
          const secretsRes = await fetch(`https://api.github.com/repos/${repo}/actions/secrets?per_page=100`, { headers: h });
          const secretsJson: any = secretsRes.ok ? await secretsRes.json() : await secretsRes.text();
          return Response.json({
            repo,
            repoInfo: repoRes.ok ? { size: repoJson.size, pushed_at: repoJson.pushed_at, default_branch: repoJson.default_branch, private: repoJson.private } : { status: repoRes.status, body: repoJson },
            workflows: wfRes.ok ? wfJson.workflows?.map((w: any) => ({ name: w.name, path: w.path, state: w.state })) : { status: wfRes.status, body: wfJson },
            iosWorkflowFile: { status: fileRes.status, exists: fileOk },
            secrets: secretsRes.ok ? { count: secretsJson.total_count, names: secretsJson.secrets?.map((s: any) => s.name) } : { status: secretsRes.status, body: secretsJson },
          });
        }

        if (action === 'dispatch') {
          const ref = url.searchParams.get('ref') || 'main';
          const buildNumber = url.searchParams.get('build') || '';
          const dRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/ios-testflight.yml/dispatches`, {
            method: 'POST',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref, inputs: buildNumber ? { build_number: buildNumber } : {} }),
          });
          const text = await dRes.text();
          return Response.json({ dispatched: dRes.ok, status: dRes.status, body: text, actionsUrl: `https://github.com/${repo}/actions` });
        }

        if (action === 'runs') {
          const rRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/ios-testflight.yml/runs?per_page=5`, { headers: h });
          const rJson: any = rRes.ok ? await rRes.json() : await rRes.text();
          return Response.json({
            runs: rRes.ok ? rJson.workflow_runs?.map((r: any) => ({ id: r.id, status: r.status, conclusion: r.conclusion, event: r.event, head_sha: r.head_sha?.slice(0, 7), created_at: r.created_at, html_url: r.html_url })) : { status: rRes.status, body: rJson },
          });
        }

        return Response.json({ error: 'unknown action' }, { status: 400 });
      },
    },
  },
});
