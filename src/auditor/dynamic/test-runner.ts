import { spawn } from 'node:child_process';

export interface DynamicTestRun {
  passed: boolean;
  log: string;
  exitCode: number | null;
  timedOut: boolean;
}

export function runDynamicTests(
  opts: { command: string; timeoutMs: number },
  cwd?: string
): Promise<DynamicTestRun> {
  return new Promise((resolve) => {
    const parts = opts.command.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    let log = '';
    let timedOut = false;
    let settled = false;

    const child = spawn(cmd, args, {
      cwd,
      shell: false,
      env: { ...process.env, CI: 'true', RUST_BACKTRACE: '1' }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }, opts.timeoutMs);

    child.stdout?.on('data', (d: Buffer) => {
      log += d.toString();
    });
    child.stderr?.on('data', (d: Buffer) => {
      log += d.toString();
    });

    const finish = (exitCode: number | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        passed: exitCode === 0 && !timedOut,
        log,
        exitCode,
        timedOut
      });
    };

    child.on('close', (code) => finish(code));
    child.on('error', (err) => {
      log += `\n[spawn error] ${err.message}`;
      finish(null);
    });
  });
}