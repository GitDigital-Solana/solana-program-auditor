import type { Rule } from '../../config';
import type { Finding } from '../engine';
import type { ChangedFile } from '../../github/diff-service';

export function detectPatterns(file: ChangedFile, rules: Rule[]): Finding[] {
  if (!file.contents) return [];
  const findings: Finding[] = [];
  const lines = file.contents.split('\n');

  for (const rule of rules) {
    if (rule.language !== 'security') continue;
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
          source: 'pattern'
        });
      }
    }
  }
  return findings;
}