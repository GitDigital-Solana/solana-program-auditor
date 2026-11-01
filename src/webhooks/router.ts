import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuditorConfig, Rule } from '../config';
import { createClient } from '../github/client';
import { handlePullRequest, type PullRequestPayload } from './handlers/pull_request';
import { handlePush, type PushPayload } from './handlers/push';

export interface RouterOptions {
  port: number;
  secret: string;
  token: string;
  config: AuditorConfig;
  rules: Rule[];
}

function verifySignature(signature: string | undefined, body: string, secret: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  opts: RouterOptions
): Promise<void> {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method !== 'POST' || req.url !== '/webhooks') {
    res.writeHead(404);
    res.end();
    return;
  }

  const body = await readBody(req);
  const sig = req.headers['x-hub-signature-256'] as string | undefined;

  if (!verifySignature(sig, body, opts.secret)) {
    res.writeHead(401, { 'content-type': 'text/plain' });
    res.end('invalid signature');
    return;
  }

  const event = String(req.headers['x-github-event'] ?? '');
  const delivery = String(req.headers['x-github-delivery'] ?? '');

  // Acknowledge immediately — GitHub expects a quick response.
  res.writeHead(202, { 'content-type': 'text/plain' });
  res.end('accepted');

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    console.warn(`[webhook] invalid JSON delivery=${delivery} event=${event}`);
    return;
  }

  const client = createClient(opts.token);
  try {
    if (event === 'pull_request') {
      await handlePullRequest(payload as PullRequestPayload, client, opts.config, opts.rules);
    } else if (event === 'push') {
      await handlePush(payload as PushPayload, client, opts.config, opts.rules);
    } else {
      console.log(`[webhook] ignored event=${event} delivery=${delivery}`);
    }
  } catch (err) {
    console.error(`[webhook] handler error event=${event} delivery=${delivery}`, err);
  }
}

export function startServer(opts: RouterOptions): Server {
  const server = createServer((req, res) => {
    route(req, res, opts).catch((err) => {
      console.error('[router] unhandled', err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  server.listen(opts.port);
  return server;
}