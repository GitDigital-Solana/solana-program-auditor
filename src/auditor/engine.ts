import type { AuditorConfig, Rule, Severity } from '../config';
import { isRuleEnabled } from '../config';
import type { ChangedFile } from '../github/diff-service';
import { lintRustFile } from './static/rust-linter';
import { isAnchorFile, lintAnchorFile } from './static/anchor-linter';
import { detectPatterns } from './static/pattern-detector';
import { runDynamicTests } from './dynamic/test-runner';
import { analyzeLog } from './dynamic/log-analyzer';

export type { Severity } from '../config';

export type FindingSource = 'static' | 'anchor' | 'pattern' | 'dynamic';

export interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  file: string;
  line: number;
  snippet?: string;
  source: FindingSource;
}

export interface AuditResult {
  findings: Finding[];
  summary: { critical: number; high: number; medium: number; low: number; total: number };
  durationMs: number;
  dynamic: { ran: boolean; passed?: boolean; log?: string };
}

export interface AuditInput {
  files: ChangedFile[];
  rules: Rule[];
  config: AuditorConfig;
  cwd?: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

function summarize(findings: Finding[]): AuditResult['summary'] {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, total: findings.length };
  for (const f of findings) summary[f.severity]++;
  return summary;
}

export async function runAudit(input: AuditInput): Promise<AuditResult> {
  const startedAt = Date.now();
  const { files, rules, config } = input;

  const activeRules = rules.filter((r) => isRuleEnabled(r, config));
  const findings: Finding[] = [];

  const rustFiles = files.filter((f) => f.filename.endsWith('.rs') && f.contents);

  for (const f of rustFiles) {
    findings.push(...lintRustFile(f, activeRules));
    if (isAnchorFile(f)) {
      findings.push(...lintAnchorFile(f, activeRules));
    }
    findings.push(...detectPatterns(f, activeRules));
  }

  const dynamic: AuditResult['dynamic'] = { ran: false };
  if (config.dynamic.enabled) {
    const run = await runDynamicTests(
      { command: config.dynamic.command, timeoutMs: config.dynamic.timeoutMs },
      input.cwd
    );
    dynamic.ran = true;
    dynamic.passed = run.passed;
    dynamic.log = run.log;
    findings.push(...analyzeLog(run.log, run.passed));
  }

  const threshold = SEVERITY_RANK[config.severityThreshold];
  const filtered = findings.filter((f) => SEVERITY_RANK[f.severity] >= threshold);

  return {
    findings: filtered,
    summary: summarize(filtered),
    durationMs: Date.now() - startedAt,
    dynamic
  };
}