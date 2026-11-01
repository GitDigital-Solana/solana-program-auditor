import type { GhClient } from './client';

export interface ChangedFile {
  filename: string;
  status: string;
  patch?: string;
  contents?: string;
}

export async function getChangedFiles(
  client: GhClient,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ChangedFile[]> {
  const files = await client.paginate(client.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100
  });
  return files.map((f) => ({
    filename: f.filename,
    status: f.status,
    patch: f.patch
  }));
}

export async function getFileContents(
  client: GhClient,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  const { data } = await client.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error(`Not a file: ${path}`);
  }
  return Buffer.from(data.content, 'base64').toString('utf8');
}

export async function fetchFileContents(
  client: GhClient,
  owner: string,
  repo: string,
  files: ChangedFile[],
  ref: string
): Promise<ChangedFile[]> {
  const out: ChangedFile[] = [];
  for (const f of files) {
    if (f.status === 'removed') {
      out.push(f);
      continue;
    }
    try {
      const contents = await getFileContents(client, owner, repo, f.filename, ref);
      out.push({ ...f, contents });
    } catch {
      out.push(f);
    }
  }
  return out;
}