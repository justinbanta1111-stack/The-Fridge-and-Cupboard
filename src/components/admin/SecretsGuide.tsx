import { useMemo, useState } from 'react';
import { REQUIRED_SECRETS, SECRET_SOURCES, type WorkflowId } from '@/lib/build-secrets';

interface Props {
  /** Names of secrets already configured in GitHub (optional). Used to mark steps done. */
  configured?: Set<string>;
  /** Settings URL to "New repository secret" page. */
  settingsUrl?: string;
}

/**
 * On-page step-by-step guide for adding each iOS and Android GitHub Actions
 * secret. Designed to be followed top-to-bottom without switching documents.
 */
export function SecretsGuide({ configured, settingsUrl }: Props) {
  const workflows = useMemo(
    () => Object.keys(REQUIRED_SECRETS) as WorkflowId[],
    []
  );
  const [openWorkflow, setOpenWorkflow] = useState<WorkflowId | null>(workflows[0] ?? null);

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Step-by-step: add each GitHub Actions secret</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Follow these steps in order — each secret has its own card with where to get the value,
          how to format it, and a one-click link to the GitHub "New secret" page.
          {configured ? ' Items you have already added are marked ✓.' : ''}
        </p>
      </div>

      <HowToAddOne settingsUrl={settingsUrl} />

      <div className="space-y-2">
        {workflows.map((wf) => {
          const spec = REQUIRED_SECRETS[wf];
          const open = openWorkflow === wf;
          const all = [...spec.required, ...spec.optional];
          const doneCount = configured ? all.filter((n) => configured.has(n)).length : 0;
          return (
            <div key={wf} className="rounded-md border">
              <button
                type="button"
                onClick={() => setOpenWorkflow(open ? null : wf)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold hover:bg-accent transition-colors"
              >
                <span>
                  {spec.label}{' '}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {configured ? `${doneCount}/${all.length} done` : `${all.length} secrets`}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{open ? '▾' : '▸'}</span>
              </button>
              {open && (
                <ol className="list-decimal space-y-3 border-t px-6 py-3">
                  {spec.required.map((name, i) => (
                    <SecretStep
                      key={name}
                      index={i + 1}
                      name={name}
                      required
                      configured={configured?.has(name)}
                      settingsUrl={settingsUrl}
                    />
                  ))}
                  {spec.optional.map((name, i) => (
                    <SecretStep
                      key={name}
                      index={spec.required.length + i + 1}
                      name={name}
                      required={false}
                      configured={configured?.has(name)}
                      settingsUrl={settingsUrl}
                    />
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowToAddOne({ settingsUrl }: { settingsUrl?: string }) {
  return (
    <details className="rounded-md border bg-background/50 p-3 text-xs">
      <summary className="cursor-pointer font-semibold">
        How to add a single secret in GitHub (do this once, then repeat per secret below)
      </summary>
      <ol className="ml-4 mt-2 list-decimal space-y-1 text-muted-foreground">
        <li>
          Open{' '}
          {settingsUrl ? (
            <a className="underline" href={settingsUrl} target="_blank" rel="noreferrer">
              Repo → Settings → Secrets and variables → Actions
            </a>
          ) : (
            <span>Repo → Settings → Secrets and variables → Actions</span>
          )}
          .
        </li>
        <li>Click <strong>New repository secret</strong>.</li>
        <li>Paste the <strong>exact Name</strong> shown in the step (case-sensitive, no quotes, no spaces).</li>
        <li>Paste the <strong>Value</strong> using the source/CLI in the step. For base64 secrets, paste the full base64 string (no line wrapping, no <code>-----BEGIN</code> headers).</li>
        <li>Click <strong>Add secret</strong>. GitHub will mask it — you can't read it back, only overwrite.</li>
        <li>Return here and continue with the next step.</li>
      </ol>
    </details>
  );
}

function SecretStep({
  index,
  name,
  required,
  configured,
  settingsUrl,
}: {
  index: number;
  name: string;
  required: boolean;
  configured?: boolean;
  settingsUrl?: string;
}) {
  const src = SECRET_SOURCES[name];
  const newSecretUrl = settingsUrl ? `${settingsUrl.replace(/\/$/, '')}/new` : undefined;
  return (
    <li className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{name}</code>
        {required ? (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
            required
          </span>
        ) : (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            optional
          </span>
        )}
        {configured && (
          <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-700 dark:text-green-300">
            ✓ added
          </span>
        )}
      </div>
      {src ? (
        <div className="mt-1 space-y-1 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">What it is:</span> {src.description}
          </div>
          <div>
            <span className="font-medium text-foreground">Where to get it:</span>{' '}
            {src.url ? (
              <a className="underline" href={src.url} target="_blank" rel="noreferrer">
                {src.where}
              </a>
            ) : (
              src.where
            )}
          </div>
          {src.hint && (
            <div>
              <span className="font-medium text-foreground">Generate / format:</span>{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{src.hint}</code>
            </div>
          )}
          {newSecretUrl && (
            <div>
              <a
                className="inline-block rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent transition-colors"
                href={newSecretUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open GitHub → New secret with this Name →
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-1 text-xs text-muted-foreground">No source hint defined.</div>
      )}
      <span className="sr-only">Step {index}</span>
    </li>
  );
}
