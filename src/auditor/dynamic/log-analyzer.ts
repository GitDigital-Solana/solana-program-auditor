import type { Finding } from '../engine';

const PANIC_RE = /thread '([^']+)' panicked at '([^']+)',\s*([^:\n]+):(\d+):(\d+)/g;
const FAIL_LINE_RE = /(\d+)\s+(?:failing|failed)/i;

export function analyzeLog(log: string, passed: boolean): Finding[] {
  const findings: Finding[] = [];

  for (const m of log.matchAll(PANIC_RE)) {
    const [, _thread, message, file, line] = m;
    findings.push({
      ruleId: 'dynamic-panic',
      severity: 'high',
      message: `Panic: ${message.trim()}`,
      file: file.trim(),
      line: Number.parseInt(line, 10),
      source: 'dynamic'
    });
  }

  if (!passed && findings.length === 0) {
    const failMatch = FAIL_LINE_RE.exec(log);
    findings.push({
      ruleId: 'dynamic-test-failure',
      severity: 'high',
      message: failMatch
        ? `${failMatch[1]} test(s) failed`
        : 'Test run failed; see workflow logs for details',
      file: 'anchor test',
      line: 0,
      source: 'dynamic'
    });
  }

  return findings;
}