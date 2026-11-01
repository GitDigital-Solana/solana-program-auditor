import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type RuleLanguage = 'rust' | 'anchor' | 'security';

export interface Rule {
  id: string;
  name?: string;
  severity: Severity;
  pattern: string;
  message: string;
  tags?: string[];
  language?: RuleLanguage;
}

export interface AuditorConfig {
  severityThreshold: Severity;
  rules: { anchor: string[]; rust: string[]; security: string[] };
  dynamic: { enabled: boolean; command: string; timeoutMs: number };
  ignore: string[];
  comment: { enabled: boolean; updateExisting: boolean };
  paths: { programs: string[] };
}

export const DEFAULT_CONFIG: AuditorConfig = {
  severityThreshold: 'low',
  rules: { anchor: [], rust: [], security: [] },
  dynamic: { enabled: false, command: 'anchor test', timeoutMs: 300_000 },
  ignore: ['**/node_modules/**', '**/target/**', '**/tests/**'],
  comment: { enabled: true, updateExisting: true },
  paths: { programs: ['programs/'] }
};

function deepMerge<T>(base: T, override: unknown): T {
  if (override === null || override === undefined) return base;
  if (typeof base !== 'object' || typeof override !== 'object') return override as T;
  if (Array.isArray(base) || Array.isArray(override)) return override as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    out[k] = deepMerge((base as Record<string, unknown>)[k], v);
  }
  return out as T;
}

export function loadConfig(path = '.solana-auditor.yml'): AuditorConfig {
  if (!existsSync(path)) return DEFAULT_CONFIG;
  const raw = parseYaml(readFileSync(path, 'utf8')) ?? {};
  return deepMerge(DEFAULT_CONFIG, raw);
}

const RULE_FILES: Array<{ file: string; language: RuleLanguage }> = [
  { file: 'rust-rules.yml', language: 'rust' },
  { file: 'anchor-rules.yml', language: 'anchor' },
  { file: 'security-rules.yml', language: 'security' }
];

export function loadRules(dir = 'rules'): Rule[] {
  const rules: Rule[] = [];
  for (const { file, language } of RULE_FILES) {
    const p = join(dir, file);
    if (!existsSync(p)) continue;
    const data = parseYaml(readFileSync(p, 'utf8')) as { rules?: Rule[] } | null;
    for (const r of data?.rules ?? []) {
      rules.push({ ...r, language: r.language ?? language });
    }
  }
  return rules;
}

export function isRuleEnabled(rule: Rule, cfg: AuditorConfig): boolean {
  const enabled = [...cfg.rules.anchor, ...cfg.rules.rust, ...cfg.rules.security];
  return enabled.length === 0 || enabled.includes(rule.id);
}