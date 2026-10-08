import { createFileRoute } from '@tanstack/react-router';
import iosWorkflowSource from '../../../../.github/workflows/ios-testflight.yml?raw';
import capacitorConfigSource from '../../../../capacitor.config.ts?raw';
import packageSource from '../../../../package.json?raw';
import bunLockSource from '../../../../bun.lock?raw';
import podfileSource from '../../../../ios/App/Podfile?raw';
import appDelegateSource from '../../../../ios/App/App/AppDelegate.swift?raw';
import infoPlistSource from '../../../../ios/App/App/Info.plist?raw';
import xcodeProjectSource from '../../../../ios/App/App.xcodeproj/project.pbxproj?raw';
import nativeShellSource from '../../../../scripts/build-native-shell.mjs?raw';
import sanitizeBundleSource from '../../../../scripts/ios-sanitize-bundle.sh?raw';
import iosTestFlightScriptSource from '../../../../scripts/ios-testflight.sh?raw';
import iosPruneUnusedPluginsSource from '../../../../scripts/ios-prune-unused-plugins.mjs?raw';
import nativeDeviceSetupSource from '../../../components/NativeDeviceSetup.tsx?raw';
import photoPickerSource from '../../../components/PhotoPicker.tsx?raw';
import nativeBridgeSource from '../../../lib/native-bridge.ts?raw';
import nativeApiOriginSource from '../../../lib/native-api-origin.ts?raw';
import recipeShareSource from '../../../lib/recipe-share.ts?raw';
import shoppingListShareSource from '../../../lib/shopping-list-share.ts?raw';
import mediaCaptureSource from '../../../lib/media-capture.ts?raw';
import nativeRuntimeSource from '../../../lib/native-runtime.ts?raw';
import nativeAuthSource from '../../../lib/native-auth.ts?raw';
import todaysInspirationSource from '../../../components/TodaysInspiration.tsx?raw';
import launchRecoverySource from '../../../lib/launch-recovery.ts?raw';
import routerSource from '../../../router.tsx?raw';
import greetingAsset from '../../../assets/chef-welcome-relaxed.mp3.asset.json';
import greetingAssetSource from '../../../assets/chef-welcome-relaxed.mp3.asset.json?raw';
const greetingAudioUrl = greetingAsset.url;





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
          const revokeDev = url.searchParams.get('revoke') === '1';
          const inputs: Record<string, string> = {};
          if (buildNumber) inputs.build_number = buildNumber;
          if (revokeDev) inputs.revoke_dev_certs = 'true';
          const dRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/ios-testflight.yml/dispatches`, {
            method: 'POST',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref, inputs }),
          });

          const text = await dRes.text();
          return Response.json({ dispatched: dRes.ok, status: dRes.status, body: text, actionsUrl: `https://github.com/${repo}/actions` });
        }

        if (action === 'runs') {
          const rRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/ios-testflight.yml/runs?per_page=5`, { headers: h });
          const rJson: any = rRes.ok ? await rRes.json() : await rRes.text();
          return Response.json({
            runs: rRes.ok ? rJson.workflow_runs?.map((r: any) => ({ id: r.id, run_number: r.run_number, status: r.status, conclusion: r.conclusion, event: r.event, head_sha: r.head_sha?.slice(0, 7), created_at: r.created_at, html_url: r.html_url })) : { status: rRes.status, body: rJson },
          });
        }

        if (action === 'jobs') {
          const runId = url.searchParams.get('run');
          if (!runId) return Response.json({ error: 'missing run param' }, { status: 400 });
          const jRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`, { headers: h });
          const jJson: any = jRes.ok ? await jRes.json() : await jRes.text();
          return Response.json({
            jobs: jRes.ok ? jJson.jobs?.map((j: any) => ({
              id: j.id,
              name: j.name,
              status: j.status,
              conclusion: j.conclusion,
              steps: j.steps?.filter((s: any) => s.conclusion === 'failure').map((s: any) => ({ name: s.name, number: s.number, conclusion: s.conclusion })),
              html_url: j.html_url,
            })) : { status: jRes.status, body: jJson },
          });
        }

        if (action === 'log') {
          const jobId = url.searchParams.get('job');
          if (!jobId) return Response.json({ error: 'missing job param' }, { status: 400 });
          const lRes = await fetch(`https://api.github.com/repos/${repo}/actions/jobs/${jobId}/logs`, { headers: h, redirect: 'follow' });
          const text = await lRes.text();
          // Return tail of log
          const tail = text.slice(-8000);
          return new Response(tail, { status: lRes.status, headers: { 'Content-Type': 'text/plain' } });
        }

        if (action === 'push-workflow') {
          const branch = url.searchParams.get('ref') || 'main';
          const path = '.github/workflows/ios-testflight.yml';
          const existing = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, { headers: h });
          let sha: string | undefined;
          if (existing.status === 200) {
            const j: any = await existing.json();
            sha = j.sha;
          }
          const contentB64 = Buffer.from(iosWorkflowSource as string, 'utf8').toString('base64');
          const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'ci(ios): switch TestFlight workflow to ASC API key + automatic signing',
              content: contentB64,
              branch,
              ...(sha ? { sha } : {}),
            }),
          });
          const putText = await putRes.text();
          return Response.json({ status: putRes.status, existed: !!sha, bytes: (iosWorkflowSource as string).length, body: putText.slice(0, 400) });
        }

        if (action === 'push-ios-fix') {
          const branch = url.searchParams.get('ref') || 'main';
          const files = [
            ['.github/workflows/ios-testflight.yml', iosWorkflowSource],
            ['capacitor.config.ts', capacitorConfigSource],
            ['package.json', packageSource],
            ['bun.lock', bunLockSource],
            ['ios/App/Podfile', podfileSource],
            ['ios/App/App/AppDelegate.swift', appDelegateSource],
            ['ios/App/App/Info.plist', infoPlistSource],
            ['ios/App/App.xcodeproj/project.pbxproj', xcodeProjectSource],
            ['scripts/build-native-shell.mjs', nativeShellSource],
            ['scripts/ios-sanitize-bundle.sh', sanitizeBundleSource],
            ['scripts/ios-testflight.sh', iosTestFlightScriptSource],
            ['scripts/ios-prune-unused-plugins.mjs', iosPruneUnusedPluginsSource],
            ['src/components/NativeDeviceSetup.tsx', nativeDeviceSetupSource],
            ['src/components/PhotoPicker.tsx', photoPickerSource],
            ['src/lib/native-bridge.ts', nativeBridgeSource],
            ['src/lib/native-api-origin.ts', nativeApiOriginSource],
            ['src/lib/recipe-share.ts', recipeShareSource],
            ['src/lib/shopping-list-share.ts', shoppingListShareSource],
            ['src/lib/media-capture.ts', mediaCaptureSource],
            ['src/lib/native-runtime.ts', nativeRuntimeSource],
            ['src/lib/native-auth.ts', nativeAuthSource],
              ['src/components/TodaysInspiration.tsx', todaysInspirationSource],
              ['src/lib/launch-recovery.ts', launchRecoverySource],
              ['src/router.tsx', routerSource],
              ['src/assets/chef-welcome-relaxed.mp3.asset.json', greetingAssetSource],
          ] as const;

          // The greeting sound is imported by src/routes/__root.tsx, so it must
          // exist in the build repository too. It is binary, so it is pushed
          // base64-encoded from the served asset.
          let audioBase64 = '';
          try {
            const audioRes = await fetch(new URL(greetingAudioUrl as string, request.url).toString());
            if (audioRes.ok) {
              const bytes = new Uint8Array(await audioRes.arrayBuffer());
              let binary = '';
              bytes.forEach((b) => { binary += String.fromCharCode(b); });
              audioBase64 = btoa(binary);
            }
          } catch {
            audioBase64 = '';
          }

          const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, { headers: h });
          if (!refRes.ok) return new Response(await refRes.text(), { status: refRes.status });
          const refJson: any = await refRes.json();
          const parentSha = refJson.object.sha as string;

          const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${parentSha}`, { headers: h });
          if (!commitRes.ok) return new Response(await commitRes.text(), { status: commitRes.status });
          const commitJson: any = await commitRes.json();

          const allFiles: Array<[string, string, 'utf-8' | 'base64']> = [
            ...files.map(([path, content]) => [path, content as string, 'utf-8'] as [string, string, 'utf-8']),
            ...(audioBase64 ? ([['src/assets/chef-welcome.mp3', audioBase64, 'base64']] as Array<[string, string, 'base64']>) : []),
          ];

          const entries = await Promise.all(allFiles.map(async ([path, content, encoding]) => {
            const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
              method: 'POST',
              headers: { ...h, 'Content-Type': 'application/json' },
              body: JSON.stringify({ content, encoding }),
            });
            if (!blobRes.ok) throw new Error(`blob ${path}: ${blobRes.status} ${await blobRes.text()}`);
            const blob: any = await blobRes.json();
            return { path, mode: '100644', type: 'blob', sha: blob.sha };
          }));


          const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
            method: 'POST',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({ base_tree: commitJson.tree.sha, tree: entries }),
          });
          if (!treeRes.ok) return new Response(await treeRes.text(), { status: treeRes.status });
          const treeJson: any = await treeRes.json();

          const newCommitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
            method: 'POST',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'fix(ios): harden cold and update launches',
              tree: treeJson.sha,
              parents: [parentSha],
            }),
          });
          if (!newCommitRes.ok) return new Response(await newCommitRes.text(), { status: newCommitRes.status });
          const newCommit: any = await newCommitRes.json();

          const updateRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha: newCommit.sha, force: false }),
          });
          if (!updateRes.ok) return new Response(await updateRes.text(), { status: updateRes.status });

          return Response.json({ updated: true, commit: newCommit.sha, files: files.map(([path]) => path) });
        }

        if (action === 'restore-remote-home') {
          const branch = url.searchParams.get('ref') || 'main';
          const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, { headers: h });
          if (!refRes.ok) return new Response(await refRes.text(), { status: refRes.status });
          const head: any = await refRes.json();
          const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${head.object.sha}`, { headers: h });
          if (!commitRes.ok) return new Response(await commitRes.text(), { status: commitRes.status });
          const commit: any = await commitRes.json();
          const parent = commit.parents?.[0]?.sha;
          if (!parent) return Response.json({ error: 'current commit has no parent' }, { status: 409 });
          const oldFileRes = await fetch(`https://api.github.com/repos/${repo}/contents/src/routes/index.tsx?ref=${parent}`, { headers: h });
          if (!oldFileRes.ok) return new Response(await oldFileRes.text(), { status: oldFileRes.status });
          const oldFile: any = await oldFileRes.json();
          const currentFileRes = await fetch(`https://api.github.com/repos/${repo}/contents/src/routes/index.tsx?ref=${branch}`, { headers: h });
          if (!currentFileRes.ok) return new Response(await currentFileRes.text(), { status: currentFileRes.status });
          const currentFile: any = await currentFileRes.json();
          const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/src/routes/index.tsx`, {
            method: 'PUT',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'fix(ci): restore compatible home route',
              content: oldFile.content,
              branch,
              sha: currentFile.sha,
            }),
          });
          const body: any = putRes.ok ? await putRes.json() : await putRes.text();
          return Response.json({ restored: putRes.ok, status: putRes.status, commit: putRes.ok ? body.commit?.sha : undefined });
        }

        if (action === 'restore-remote-file') {
          const branch = url.searchParams.get('ref') || 'main';
          const path = url.searchParams.get('path') || '';
          const from = url.searchParams.get('from') || '';
          if (!path || !from) return Response.json({ error: 'missing path or from' }, { status: 400 });
          const oldFileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${from}`, { headers: h });
          if (!oldFileRes.ok) return new Response(await oldFileRes.text(), { status: oldFileRes.status });
          const oldFile: any = await oldFileRes.json();
          const currentFileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, { headers: h });
          const currentFile: any = currentFileRes.ok ? await currentFileRes.json() : null;
          const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `fix(ci): restore ${path} to a buildable version`,
              content: oldFile.content,
              branch,
              ...(currentFile ? { sha: currentFile.sha } : {}),
            }),
          });
          const body: any = putRes.ok ? await putRes.json() : await putRes.text();
          return Response.json({ restored: putRes.ok, status: putRes.status, commit: putRes.ok ? body.commit?.sha : body });
        }



        if (action === 'push-podfile') {
          const branch = url.searchParams.get('ref') || 'main';
          const path = 'ios/App/Podfile';
          const podfile = `require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'

platform :ios, '15.1'
use_frameworks! :linkage => :static

install! 'cocoapods', :disable_input_output_paths => true

def capacitor_pods
  # Automatic Capacitor Pod dependencies, do not delete
  pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorApp', :path => '../../node_modules/@capacitor/app'
  pod 'CapacitorBrowser', :path => '../../node_modules/@capacitor/browser'
  pod 'CapacitorCamera', :path => '../../node_modules/@capacitor/camera'
  pod 'CapacitorHaptics', :path => '../../node_modules/@capacitor/haptics'
  pod 'CapacitorLocalNotifications', :path => '../../node_modules/@capacitor/local-notifications'
  pod 'CapacitorNetwork', :path => '../../node_modules/@capacitor/network'
  pod 'CapacitorPreferences', :path => '../../node_modules/@capacitor/preferences'
  pod 'CapacitorShare', :path => '../../node_modules/@capacitor/share'
  pod 'CapacitorSplashScreen', :path => '../../node_modules/@capacitor/splash-screen'
  pod 'CapacitorStatusBar', :path => '../../node_modules/@capacitor/status-bar'
  # Do not delete
end

target 'App' do
  capacitor_pods
end

post_install do |installer|
  assertDeploymentTarget(installer)

  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['COPY_PHASE_STRIP'] = 'NO'
      config.build_settings['STRIP_INSTALLED_PRODUCT'] = 'NO'
      config.build_settings['STRIP_SWIFT_SYMBOLS'] = 'NO'
    end
  end
end
`;
          // See if file already exists to get its sha
          const existing = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, { headers: h });
          let sha: string | undefined;
          if (existing.status === 200) {
            const j: any = await existing.json();
            sha = j.sha;
          }
          const contentB64 = Buffer.from(podfile, 'utf8').toString('base64');
          const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'chore(ios): add missing Podfile so CI pod install works',
              content: contentB64,
              branch,
              ...(sha ? { sha } : {}),
            }),
          });
          const putText = await putRes.text();
          return Response.json({ status: putRes.status, existed: !!sha, body: putText.slice(0, 500) });
        }



        return Response.json({ error: 'unknown action' }, { status: 400 });
      },
    },
  },
});
