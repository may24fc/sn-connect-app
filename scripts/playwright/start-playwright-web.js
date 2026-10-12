const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = process.cwd();
const webDistDir = process.env.NEXT_DIST_DIR || '.next';
if (path.isAbsolute(webDistDir) || webDistDir.includes('..') || webDistDir.includes('\\')) {
  throw new Error('NEXT_DIST_DIR must be a relative directory inside apps/web');
}
const webCacheDir = path.join(rootDir, 'apps', 'web', webDistDir);
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? '3002';

if (webDistDir === '.next' && fs.existsSync(webCacheDir)) {
  fs.rmSync(webCacheDir, { recursive: true, force: true });
}

const child = spawn(
  'pnpm',
  ['--filter', '@hr-portal/web', 'exec', 'next', 'dev', '--port', webPort],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      NEXT_PUBLIC_ENABLE_MOCK_AUTH: 'true',
    },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
