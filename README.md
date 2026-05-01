👉 https://github.com/GitDigital-Solana/solana-program-auditor


---

🧩 Repository  — solana-program-auditor

1. Repository Overview

Name: solana-program-auditor  
Purpose:  
A GitHub App that performs security audits on Solana programs whenever a PR or push occurs.

It detects:

- Anchor constraint violations  
- Unsafe Rust patterns  
- PDA misuse  
- Missing checks (ownership, signer, seeds)  
- Integer overflow risks  
- Unchecked account data  
- Dangerous syscalls  
- Reentrancy‑like patterns  
- Unbounded loops  
- Serialization/deserialization risks  

It comments directly on PRs with findings.

This is your Solana security auditor bot.

---

2. Folder Structure

`text
solana-program-auditor/
  .github/
    workflows/
      ci.yml
      audit-test.yml
  src/
    index.ts
    config.ts
    github/
      client.ts
      pr-commenter.ts
      diff-service.ts
    auditor/
      engine.ts
      static/
        rust-linter.ts
        anchor-linter.ts
        pattern-detector.ts
      dynamic/
        test-runner.ts
        log-analyzer.ts
    webhooks/
      router.ts
      handlers/
        pull_request.ts
        push.ts
  rules/
    anchor-rules.yml
    rust-rules.yml
    security-rules.yml
  docs/
    architecture.md
    audit-flow.md
    rule-format.md
  test/
    engine.test.ts
    rust-linter.test.ts
  app.yml
  package.json
  tsconfig.json
  README.md
  .eslintrc.cjs
  .gitignore
`

---

3. README.md

`markdown

Solana Program Auditor

Solana Program Auditor is a GitHub App that performs static and dynamic security analysis on Solana programs. It automatically reviews pull requests and pushes to detect vulnerabilities, unsafe patterns, and Anchor constraint issues.

Features

- Static analysis of Rust and Anchor programs
- Pattern-based vulnerability detection
- Anchor constraint validation
- PDA and seed safety checks
- Unsafe syscall detection
- Dynamic test execution (optional)
- PR comments with detailed findings
- Custom rule definitions

Example PR comment

`
🔒 Solana Program Audit Findings

File: src/instructions/withdraw.rs

1. ❗ Missing signer check for authority
2. ⚠️ PDA seeds not validated before use
3. ⚠️ Unbounded loop detected (potential DoS)
4. ❗ Account data deserialized multiple times

Severity: HIGH
Recommended Fix: Validate seeds, add signer check, and cache account data.
`

Configuration

Add .solana-auditor.yml:

`yaml
rules:
  rust: true
  anchor: true
  security: true

dynamic_tests:
  enabled: false

comments:
  enabled: true
  severity_threshold: "medium"
`

Events

- pull_request
- push

Development

`bash
pnpm install
pnpm dev
`

License

MIT
`

---

4. app.yml

`yaml
name: Solana Program Auditor
url: https://github.com/apps/solana-program-auditor
hook_attributes:
  url: https://your-domain.com/webhooks/github
redirect_url: https://your-domain.com/app/callback
callback_urls:
  - https://your-domain.com/app/callback
public: false
default_permissions:
  contents: read
  metadata: read
  pull_requests: write
default_events:
  - pull_request
  - push
`

---

5. GitHub Actions: ci.yml

`yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
`

---

6. GitHub Actions: audit-test.yml

`yaml
name: Audit Test

on:
  workflow_dispatch:

jobs:
  simulate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Simulating Solana program audit..."
`

---

7. src/index.ts

`ts
import { createNodeMiddleware, Webhooks } from "@octokit/webhooks";
import { App } from "@octokit/app";
import { createServer } from "http";
import { router } from "./webhooks/router";

const appId = process.env.APP_ID!;
const privateKey = process.env.PRIVATE_KEY!;
const webhookSecret = process.env.WEBHOOK_SECRET!;

const app = new App({ appId, privateKey });
const webhooks = new Webhooks({ secret: webhookSecret });

router(webhooks, app);

const middleware = createNodeMiddleware(webhooks);

const port = process.env.PORT || 3006;
createServer(middleware).listen(port, () => {
  console.log(Solana Program Auditor running on :${port});
});
`

---

8. Webhook Router

`ts
import type { Webhooks } from "@octokit/webhooks";
import type { App } from "@octokit/app";
import { handlePullRequest } from "./handlers/pull_request";
import { handlePush } from "./handlers/push";

export function router(webhooks: Webhooks, app: App) {
  webhooks.on("pull_request", (event) => handlePullRequest(event, app));
  webhooks.on("push", (event) => handlePush(event, app));
}
`

---

9. Audit Engine

src/auditor/engine.ts

`ts
import { RustLinter } from "./static/rust-linter";
import { AnchorLinter } from "./static/anchor-linter";
import { PatternDetector } from "./static/pattern-detector";

export class AuditEngine {
  constructor(private diff: string, private config: any) {}

  run() {
    const findings = [];

    if (this.config.rules.rust) {
      findings.push(...RustLinter.analyze(this.diff));
    }

    if (this.config.rules.anchor) {
      findings.push(...AnchorLinter.analyze(this.diff));
    }

    if (this.config.rules.security) {
      findings.push(...PatternDetector.detect(this.diff));
    }

    return findings;
  }
}
`

---

10. Example Static Rule

src/auditor/static/anchor-linter.ts

`ts
export const AnchorLinter = {
  analyze(diff: string) {
    const findings = [];

    if (diff.includes("unchecked_account")) {
      findings.push({
        severity: "high",
        message: "Unchecked account detected. Validate account ownership and seeds."
      });
    }

    if (diff.includes("load_mut(")) {
      findings.push({
        severity: "medium",
        message: "Multiple mutable loads detected. Cache account data."
      });
    }

    return findings;
  }
};
`

---

11. Example Security Pattern Rule

src/auditor/static/pattern-detector.ts

`ts
export const PatternDetector = {
  detect(diff: string) {
    const findings = [];

    if (diff.includes("while (true") || diff.includes("loop {")) {
      findings.push({
        severity: "high",
        message: "Unbounded loop detected. Potential DoS vector."
      });
    }

    if (diff.includes("unwrap()")) {
      findings.push({
        severity: "medium",
        message: "Use of unwrap() detected. Replace with safe error handling."
      });
    }

    return findings;
  }
};
`

---

