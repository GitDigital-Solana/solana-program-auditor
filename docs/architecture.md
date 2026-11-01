# Architecture

`solana-program-auditor` is a GitHub App written in TypeScript. It receives GitHub
webhooks, audits the changed Solana program files, and posts a summary comment back
on the pull request.

## Components
## Layers

| Layer | Path | Responsibility |
| --- | --- | --- |
| Transport | `src/webhooks` | Verify HMAC signature, dispatch events |
| Integration | `src/github` | Octokit client, PR diff, comments |
| Domain | `src/auditor` | Linters, pattern matching, dynamic tests |
| Rules | `rules/*.yml` | Declarative regex rules per language |
| Config | `src/config.ts` | Rule loading, config merge |

## Why a rule file system?

Rules are data, not code. Adding a new check should not require a release:

- `rules/rust-rules.yml` — Rust language anti-patterns
- `rules/anchor-rules.yml` — Anchor framework anti-patterns
- `rules/security-rules.yml` — Cross-cutting security checks

Rules are evaluated **per line** against each changed `.rs` file. Multi-line patterns
should be decomposed into line-anchored regexes.

## Extensibility

New check types are added by:

1. Creating a `Rule` with the right `language` in one of the YAML files.
2. (Optional) Adding a specialized detector in `src/auditor/static/` when a regex
   is insufficient.

## Trust model

Webhooks are authenticated with HMAC-SHA256 using `GITHUB_WEBHOOK_SECRET`. Dynamic
tests are opt-in (`dynamic.enabled: true`) because they execute `anchor test` from the
PR checkout — this should only be enabled when the runner is appropriately isolated.