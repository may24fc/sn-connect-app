/**
 * Builds and serves the Control Hub as a production bundle for latency measurement,
 * without disturbing a running `pnpm dev:web` (separate `.next-perf` output and port).
 *
 * Usage: pnpm performance:serve [--port 3101] [--skip-build]
 * Then:  pnpm performance:latency --base-url http://localhost:3101 ...
 *
 * Uses apps/web/.env.local, so it measures whichever Supabase project that file targets
 * (local by default).
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const WEB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'web');

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '3101' },
    'skip-build': { type: 'boolean', default: false },
  },
});

if (!/^\d+$/.test(values.port)) {
  console.error('[performance:serve] --port must be numeric.');
  process.exit(1);
}

const env = { ...process.env, NEXT_DIST_DIR: '.next-perf', NODE_ENV: 'production' };

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    // Single command string: args are fixed literals plus a validated numeric port.
    const child = spawn(`pnpm exec next ${args.join(' ')}`, {
      cwd: WEB_DIR,
      env,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', rejectRun);
    child.on('exit', (code) =>
      code === 0 ? resolveRun() : rejectRun(new Error(`next ${args[0]} exited with ${code}`))
    );
  });
}

try {
  if (!values['skip-build']) {
    console.info('[performance:serve] Building production bundle into apps/web/.next-perf ...');
    // `next build` rewrites next-env.d.ts to reference the custom distDir; keep the committed file intact.
    const nextEnvPath = resolve(WEB_DIR, 'next-env.d.ts');
    const nextEnv = readFileSync(nextEnvPath, 'utf8');
    try {
      await run(['build']);
    } finally {
      writeFileSync(nextEnvPath, nextEnv);
    }
  }
  console.info(`[performance:serve] Serving production build on http://localhost:${values.port}`);
  await run(['start', '--port', values.port]);
} catch (error) {
  console.error(`[performance:serve] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
