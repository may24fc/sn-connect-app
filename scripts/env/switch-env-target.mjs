import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = process.argv[2];
const validTargets = new Set(['localdev', 'stagingdev', 'prodops']);

if (!validTargets.has(target)) {
  console.error('Usage: node scripts/env/switch-env-target.mjs <localdev|stagingdev|prodops>');
  process.exit(1);
}

const cwd = process.cwd();
const profiles = [
  {
    label: 'root env',
    source: path.join(cwd, `.env.local.${target}`),
    target: path.join(cwd, '.env.local'),
  },
  {
    label: 'web env',
    source: path.join(cwd, 'apps', 'web', `.env.local.${target}`),
    target: path.join(cwd, 'apps', 'web', '.env.local'),
  },
];

for (const profile of profiles) {
  if (!fs.existsSync(profile.source)) {
    console.error(`Missing ${profile.label} profile: ${profile.source}`);
    process.exit(1);
  }

  if (target === 'stagingdev') {
    const content = fs.readFileSync(profile.source, 'utf8');
    if (content.includes('__FILL_STAGING_')) {
      console.error(
        `Staging profile is not configured yet: ${profile.source}\n` +
          'Fill in the __FILL_STAGING_*__ placeholders first, then rerun pnpm env:use-staging.'
      );
      process.exit(1);
    }
  }
}

for (const profile of profiles) {
  fs.copyFileSync(profile.source, profile.target);
  console.log(`Switched ${profile.label} -> ${path.basename(profile.source)}`);
}

console.log(`Active env target: ${target}`);
