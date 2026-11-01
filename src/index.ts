import { loadConfig, loadRules } from './config';
import { startServer } from './webhooks/router';

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const port = Number(process.env.PORT ?? 3000);

  if (!token) throw new Error('GITHUB_TOKEN env var is required');
  if (!secret) throw new Error('GITHUB_WEBHOOK_SECRET env var is required');

  const config = loadConfig(process.env.AUDITOR_CONFIG_PATH ?? '.solana-auditor.yml');
  const rules = loadRules(process.env.AUDITOR_RULES_DIR ?? 'rules');

  console.log(`[boot] loaded ${rules.length} rules, severity threshold=${config.severityThreshold}`);
  startServer({ port, secret, token, config, rules });
  console.log(`[boot] listening on :${port}`);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});