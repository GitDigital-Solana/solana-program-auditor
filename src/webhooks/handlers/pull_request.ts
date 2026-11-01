import type { GhClient } from '../../github/client';
import type { AuditorConfig, Rule } from '../../config';
import { getChangedFiles, fetchFileContents } from '../../github/diff-service';
import { runAudit } from '../../auditor/engine';
import { postOrUpdateComment, renderComment } from '../../github/pr-commenter';

const HANDLED_ACTIONS = new Set(['opened', 'synchronize', 'reopened', 'ready_for_review']);

export interface PullRequestPayload {
  action: string;
  repository: { full_name: string; owner: { login: string }; name: string };
  pull_request: { number: number; head: { sha: string }; draft?: boolean };
}

export async function handlePullRequest(
  payload: PullRequestPayload,
  client: GhClient,
  config: AuditorConfig,
  rules: Rule[]
): Promise<void> {
  if (!HANDLED_ACTIONS.has(payload.action)) return;
  if (payload.pull_request.draft) return;

  const [owner, repo] = payload.repository.full_name.split('/');
  const prNumber = payload.pull_request.number;
  const headSha = payload.pull_request.head.sha;

  console.log(`[pr] ${owner}/${repo}#${prNumber} action=${payload.action} sha=${headSha.slice(0, 7)}`);

  const changed = await getChangedFiles(client, owner, repo, prNumber);
  const files = await fetchFileContents(client, owner, repo, changed, headSha);

  const result = await runAudit({ files, rules, config });

  console.log(
    `[pr] audit done: ${result.summary.total} findings in ${result.durationMs}ms ` +
      `(critical=${result.summary.critical} high=${result.summary.high})`
  );

  if (config.comment.enabled) {
    await postOrUpdateComment(
      client,
      owner,
      repo,
      prNumber,
      renderComment(result),
      config.comment.updateExisting
    );
  }
}