import { describe, it, expect } from 'vitest';
import { runAudit } from '../src/auditor/engine';
import { DEFAULT_CONFIG, type Rule } from '../src/config';

const rules: Rule[] = [
  {
    id: 'rust-unwrap',
    severity: 'medium',
    pattern: '\\.unwrap\\(\\)',
    message: 'unwrap',
    language: 'rust'
  },
  {
    id: 'sec-unsafe',
    severity: 'high',
    pattern: '\\bunsafe\\s*\\{',
    message: 'unsafe block',
    language: 'security'
  }
];

function cfg(overrides: Partial<typeof DEFAULT_CONFIG> = {}) {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('runAudit', () => {
  it('returns zero findings for a clean file', async () => {
    const result = await runAudit({
      files: [
        {
          filename: 'programs/demo/src/lib.rs',
          status: 'modified',
          contents: 'pub fn ok() -> Result<()> { Ok(()) }\n'
        }
      ],
      rules,
      config: cfg()
    });
    expect(result.summary.total).toBe(0);
    expect(result.dynamic.ran).toBe(false);
  });

  it('aggregates findings from multiple rule families', async () => {
    const result = await runAudit({
      files: [
        {
          filename: 'programs/demo/src/lib.rs',
          status: 'modified',
          contents: 'unsafe { foo().unwrap() }\n'
        }
      ],
      rules,
      config: cfg()
    });
    expect(result.findings.map((f) => f.ruleId).sort()).toEqual([
      'rust-unwrap',
      'sec-unsafe'
    ]);
    expect(result.summary.total).toBe(2);
  });

  it('respects the severity threshold', async () => {
    const result = await runAudit({
      files: [
        {
          filename: 'programs/demo/src/lib.rs',
          status: 'modified',
          contents: 'unsafe { foo().unwrap() }\n'
        }
      ],
      rules,
      config: cfg({ severityThreshold: 'high' })
    });
    expect(result.findings.map((f) => f.ruleId)).toEqual(['sec-unsafe']);
  });

  it('ignores non-rust files', async () => {
    const result = await runAudit({
      files: [
        {
          filename: 'README.md',
          status: 'modified',
          contents: 'foo().unwrap()'
        }
      ],
      rules,
      config: cfg()
    });
    expect(result.findings).toHaveLength(0);
  });
});