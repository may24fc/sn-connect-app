const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = process.cwd();
const webCacheDir = path.join(rootDir, 'apps', 'web', '.next');
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? '3002';

if (fs.existsSync(webCacheDir)) {
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
