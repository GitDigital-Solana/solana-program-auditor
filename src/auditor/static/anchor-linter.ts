import type { Rule } from '../../config';
import type { Finding } from '../engine';
import type { ChangedFile } from '../../github/diff-service';

export function isAnchorFile(file: ChangedFile): boolean {
  if (file.filename.includes('/programs/')) return true;
  const c = file.contents ?? '';
  return c.includes('use anchor_lang') || c.includes('declare_id!') || c.includes('#[program]');
}

export function lintAnchorFile(file: ChangedFile, rules: Rule[]): Finding[] {
  if (!file.contents) return [];
  const findings: Finding[] = [];
  const lines = file.contents.split('\n');

  for (const rule of rules) {
    if (rule.language !== 'anchor') continue;
    let re: RegExp;
    try {
      re = new RegExp(rule.pattern);
    } catch {
      continue;
    }
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.message,
          file: file.filename,
          line: i + 1,
          snippet: lines[i].trim(),
          source: 'anchor'
        });
      }
    }
  }
  return findings;
}