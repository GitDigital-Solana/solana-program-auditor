import { Octokit } from '@octokit/rest';

export function createClient(token: string): Octokit {
  return new Octokit({ auth: token, userAgent: 'solana-program-auditor/0.1.0' });
}

export type GhClient = Octokit;