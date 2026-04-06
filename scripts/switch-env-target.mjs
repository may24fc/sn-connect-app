import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = process.argv[2];
const validTargets = new Set(['localdev', 'prodops']);

if (!validTargets.has(target)) {
  console.error('Usage: node scripts/switch-env-target.mjs <localdev|prodops>');
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
}

for (const profile of profiles) {
  fs.copyFileSync(profile.source, profile.target);
  console.log(`Switched ${profile.label} -> ${path.basename(profile.source)}`);
}

console.log(`Active env target: ${target}`);
