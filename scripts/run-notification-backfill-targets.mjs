import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VALID_TARGETS = ['localdev', 'prodops'];
const argv = process.argv.slice(2);
const shouldApply = argv.includes('--apply');
const confirmProd = argv.includes('--confirm-prod');
const requestedTargets = argv
  .filter((arg) => arg.startsWith('--targets='))
  .flatMap((arg) => arg.replace('--targets=', '').split(','))
  .map((value) => value.trim())
  .filter(Boolean);

const targets = requestedTargets.length > 0 ? requestedTargets : VALID_TARGETS;

for (const target of targets) {
  if (!VALID_TARGETS.includes(target)) {
    console.error(`Invalid target: ${target}. Use localdev and/or prodops.`);
    process.exit(1);
  }
}

if (shouldApply && targets.includes('prodops') && !confirmProd) {
  console.error(
    'Refusing to apply notification backfill to prodops without --confirm-prod. Dry runs can target both environments without confirmation.'
  );
  process.exit(1);
}

const cwd = process.cwd();
const rootEnvLocalPath = path.join(cwd, '.env.local');
const webEnvLocalPath = path.join(cwd, 'apps', 'web', '.env.local');

function readFileIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function writeOrDelete(filePath, content) {
  if (content === null) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function parseEnvFile(content) {
  const env = {};

  if (!content) {
    return env;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getEnvHost(content) {
  const env = parseEnvFile(content);
  return env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || 'unknown';
}

function switchEnvTarget(target) {
  const result = spawnSync(process.execPath, [path.join(cwd, 'scripts', 'switch-env-target.mjs'), target], {
    cwd,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Failed to switch env target to ${target}`);
  }
}

function runBackfill(target) {
  const scriptArgs = [path.join(cwd, 'scripts', 'backfill-notification-names.mjs')];
  if (shouldApply) {
    scriptArgs.push('--apply');
  }

  console.log(`\n[notifications] Running ${shouldApply ? 'apply' : 'dry-run'} for ${target}...`);
  const result = spawnSync(process.execPath, scriptArgs, {
    cwd,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Notification backfill failed for ${target}`);
  }
}

async function main() {
  const originalRootEnv = readFileIfExists(rootEnvLocalPath);
  const originalWebEnv = readFileIfExists(webEnvLocalPath);

  try {
    for (const target of targets) {
      const profilePath = path.join(cwd, `.env.local.${target}`);
      const profileContent = readFileIfExists(profilePath);
      console.log(`\n[notifications] Target ${target} -> ${getEnvHost(profileContent)}`);
      switchEnvTarget(target);
      runBackfill(target);
    }
  } finally {
    writeOrDelete(rootEnvLocalPath, originalRootEnv);
    writeOrDelete(webEnvLocalPath, originalWebEnv);
    console.log('\n[notifications] Restored previous .env.local files.');
  }
}

main().catch((error) => {
  console.error('[notifications] Multi-target backfill failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});