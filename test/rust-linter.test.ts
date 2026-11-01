import { describe, it, expect } from 'vitest';
import { lintRustFile } from '../src/auditor/static/rust-linter';
import type { Rule } from '../src/config';
import type { ChangedFile } from '../src/github/diff-service';

const rules: Rule[] = [
  {
    id: 'rust-unwrap',
    severity: 'medium',
    pattern: '\\.unwrap\\(\\)',
    message: 'unwrap is discouraged',
    language: 'rust'
  },
  {
    id: 'rust-panic',
    severity: 'medium',
    pattern: '\\bpanic!',
    message: 'explicit panic',
    language: 'rust'
  }
];

function file(contents: string, filename = 'programs/demo/src/lib.rs'): ChangedFile {
  return { filename, status: 'modified', contents };
}

describe('lintRustFile', () => {
  it('flags unwrap and reports the correct line', () => {
    const findings = lintRustFile(file('fn a() {\n  let x = foo().unwrap();\n}\n'), rules);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('rust-unwrap');
    expect(findings[0].line).toBe(2);
  });

  it('returns no findings on clean code', () => {
    const findings = lintRustFile(file('fn a() -> Result<()> { foo()?; Ok(()) }\n'), rules);
    expect(findings).toHaveLength(0);
  });

  it('flags multiple occurrences across rules', () => {
    const findings = lintRustFile(file('let a = b().unwrap();\npanic!("x");\n'), rules);
    expect(findings.map((f) => f.ruleId).sort()).toEqual(['rust-panic', 'rust-unwrap']);
  });

  it('skips files without contents', () => {
    const findings = lintRustFile({ filename: 'x.rs', status: 'removed' }, rules);
    expect(findings).toHaveLength(0);
  });
});