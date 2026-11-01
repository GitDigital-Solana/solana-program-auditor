import type { GhClient } from '../../github/client';
import type { AuditorConfig, Rule } from '../../config';
import { getFileContents, type ChangedFile } from '../../github/diff-service';
import { runAudit } from '../../auditor/engine';

export interface PushPayload {
  ref: string;
  after: string;
  deleted: boolean;
  repository: { full_name: string };
  commits?: Array<{ added?: string[]; modified?: string[]; removed?: string[] }>;
}

export async function handlePush(
  payload: PushPayload,
  client: GhClient,
  config: AuditorConfig,
  rules: Rule[]
): Promise<void> {
  if (payload.deleted) return;
  const [owner, repo] = payload.repository.full_name.split('/');
  const sha = payload.after;

  const paths = new Set<string>();
  for (const c of payload.commits ?? []) {
    for (const p of c.added ?? []) paths.add(p);
    for (const p of c.modified ?? []) paths.add(p);
  }

  const rustPaths = [...paths].filter((p) => p.endsWith('.rs'));
  if (rustPaths.length === 0) return;

  const files: ChangedFile[] = [];
  for (const p of rustPaths) {
    try {
      const contents = await getFileContents(client, owner, repo, p, sha);
      files.push({ filename: p, status: 'modified', contents });
    } catch {
      /* skip */
    }
  }

  // Push audits do not run dynamic tests — those are expensive and belong in CI.
  const result = await runAudit({
    files,
    rules,
    config: { ...config, dynamic: { ...config.dynamic, enabled: false } }
  });

  console.log(
    `[push] ${owner}/${repo}@${sha.slice(0, 7)} ref=${payload.ref}: ` +
      `${result.summary.total} findings (critical=${result.summary.critical})`
  );
}