import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type EffectivePolicy = {
  body: string;
  source: string;
};

const migrationsDirectory = resolve(process.cwd(), 'supabase', 'migrations');

function getEffectivePolicies() {
  const policies = new Map<string, EffectivePolicy>();
  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const sql = readFileSync(resolve(migrationsDirectory, migrationFile), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/--.*$/gm, '');

    for (const match of sql.matchAll(
      /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?\s+ON\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?\s*;/gis
    )) {
      policies.delete(`public.${match[2]}.${match[1]}`);
    }

    for (const match of sql.matchAll(
      /CREATE\s+POLICY\s+"?([a-zA-Z0-9_]+)"?\s+ON\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?\s+(.*?);/gis
    )) {
      policies.set(`public.${match[2]}.${match[1]}`, {
        body: match[3],
        source: migrationFile,
      });
    }
  }

  return policies;
}

describe('privileged RLS policy parity', () => {
  it('does not leave effective admin policies that exclude super_admin', () => {
    const stalePolicies = [...getEffectivePolicies()]
      .filter(([, policy]) => policy.body.includes("'admin'") && !policy.body.includes("'super_admin'"))
      .map(([name, policy]) => `${name} (${policy.source})`)
      .sort();

    expect(stalePolicies).toEqual([]);
  });
});
