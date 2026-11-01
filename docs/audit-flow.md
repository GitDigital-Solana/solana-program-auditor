# Audit flow

## 1. Event received

GitHub sends a `pull_request` webhook with action `opened`, `synchronize`, or
`reopened`. The router verifies `X-Hub-Signature-256` with the shared secret and
acknowledges immediately (HTTP 202) so GitHub does not time out.

## 2. Diff acquisition

`github/diff-service.ts`:

1. `pulls.listFiles` → list of changed files.
2. For each non-deleted file, `repos.getContent` at the PR head SHA fetches full
   contents. We need full contents (not just the diff) so line numbers in the comment
   point to the current file, not to diff hunks.

## 3. Static analysis

`auditor/engine.ts` iterates over each Rust file and runs three linters:

| Linter | Rule family | Fires when |
| --- | --- | --- |
| `lintRustFile` | `rust` | Any line matches a rust rule |
| `lintAnchorFile` | `anchor` | Anchor-flavored file, line matches an anchor rule |
| `detectPatterns` | `security` | Any line matches a security rule |

Each match becomes a `Finding` with file, line, snippet, and severity.

## 4. Dynamic tests (optional)

If `dynamic.enabled` is true, `runDynamicTests` spawns the configured command
(default `anchor test`) with a configurable timeout. `log-analyzer` parses the
output for panics and test failures and emits additional findings.

> ⚠️ Dynamic tests execute code from the PR. Enable only on isolated runners.

## 5. Severity filtering

Findings below `severityThreshold` are dropped. The threshold can be set in
`.solana-auditor.yml`.

## 6. Comment

`github/pr-commenter.ts` builds a Markdown summary and:

- **Updates** the previous auditor comment (identified by a hidden marker) if one
  exists.
- **Creates** a new comment otherwise.

The comment is truncated to 200 findings to stay under GitHub's 65,536-char limit.

## Failure modes

| Failure | Behavior |
| --- | --- |
| Invalid signature | 401, event dropped |
| Octokit 401/403 | Logged, event dropped |
| Test runner timeout | Reported as `dynamic-failure` finding |
| Config file malformed | Falls back to defaults |
| Rule regex invalid | Rule skipped silently |