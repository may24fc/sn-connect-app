/**
 * Ensures a dedicated latency-benchmark account exists in the Supabase project
 * targeted by an env file, and stores its credentials in that (gitignored) file as
 * LATENCY_BENCH_EMAIL / LATENCY_BENCH_PASSWORD for `pnpm performance:latency`.
 *
 * Dry-run by default. With --apply it creates or updates the account, rotates its
 * password to a new random value, sets the role, verifies a password sign-in, and
 * writes the credentials. The password is never printed.
 *
 * Usage:
 *   node scripts/accounts/ensure-latency-bench-account.mjs --env-file apps/web/.env.local.prodops
 *   node scripts/accounts/ensure-latency-bench-account.mjs --env-file apps/web/.env.local.prodops --apply
 *
 * Options: --email (default latency-bench@example.com), --role (default admin).
 * The account has no employees row, so it does not appear in directory or headcount data.
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ROLES = new Set(['admin', 'super_admin', 'hr', 'employee']);

const { values } = parseArgs({
  options: {
    'env-file': { type: 'string' },
    email: { type: 'string', default: 'latency-bench@example.com' },
    role: { type: 'string', default: 'admin' },
    apply: { type: 'boolean', default: false },
  },
});

function exit(message) {
  console.error(`[latency-bench-account] ${message}`);
  process.exit(1);
}

function readEnvFile(filePath) {
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    const separator = trimmed.indexOf('=');
    if (!trimmed || trimmed.startsWith('#') || separator === -1) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    env[trimmed.slice(0, separator).trim()] = value;
  }
  return env;
}

function upsertEnvValues(filePath, updates) {
  const original = fs.readFileSync(filePath, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const lines = original.split(/\r?\n/);
  const pending = new Map(Object.entries(updates));
  const next = lines.map((line) => {
    const key = line.split('=')[0]?.trim();
    if (key && pending.has(key)) {
      const value = pending.get(key);
      pending.delete(key);
      return `${key}=${value}`;
    }
    return line;
  });
  while (next.length > 0 && next[next.length - 1] === '') next.pop();
  if (pending.size > 0) {
    next.push(
      '',
      '# Latency measurement account (scripts/accounts/ensure-latency-bench-account.mjs)'
    );
    for (const [key, value] of pending) next.push(`${key}=${value}`);
  }
  fs.writeFileSync(filePath, `${next.join(newline)}${newline}`);
}

async function findUserByEmail(admin, email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) exit(`Could not list users: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match || data.users.length < 1000) return match ?? null;
  }
}

async function main() {
  if (!values['env-file']) exit('Pass --env-file <path>, e.g. apps/web/.env.local.prodops.');
  if (!ALLOWED_ROLES.has(values.role))
    exit(`--role must be one of ${[...ALLOWED_ROLES].join(', ')}.`);

  const envFile = path.resolve(values['env-file']);
  if (!fs.existsSync(envFile)) exit(`${envFile} does not exist.`);
  const env = readEnvFile(envFile);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(supabaseUrl && anonKey && serviceRoleKey)) {
    exit(
      'The env file needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const existing = await findUserByEmail(admin, values.email);

  console.info(`[latency-bench-account] Target: ${new URL(supabaseUrl).host}`);
  console.info(
    `[latency-bench-account] Account: ${values.email} (${existing ? 'exists' : 'missing'}), role: ${values.role}`
  );
  console.info(`[latency-bench-account] Credentials file: ${envFile}`);
  if (!values.apply) {
    console.info(
      '[latency-bench-account] Dry run only. Re-run with --apply to create/update the account and rotate its password.'
    );
    return;
  }

  const password = randomBytes(24).toString('base64url');
  const attributes = {
    password,
    email_confirm: true,
    app_metadata: { db_role: values.role },
    user_metadata: {
      first_name: 'Latency',
      last_name: 'Bench',
      purpose: 'automated latency measurement',
    },
  };
  const result = existing
    ? await admin.auth.admin.updateUserById(existing.id, attributes)
    : await admin.auth.admin.createUser({ email: values.email, ...attributes });
  if (result.error)
    exit(`Auth ${existing ? 'update' : 'creation'} failed: ${result.error.message}`);
  const userId = result.data.user.id;

  // The signup trigger inserts an `employee` row; upsert covers both new and existing accounts.
  const { error: usersError } = await admin
    .from('users')
    .upsert(
      { id: userId, role: values.role, status: 'active', deleted_at: null },
      { onConflict: 'id' }
    );
  if (usersError) exit(`public.users upsert failed: ${usersError.message}`);

  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({
    email: values.email,
    password,
  });
  if (signInError) exit(`Verification sign-in failed: ${signInError.message}`);
  await client.auth.signOut({ scope: 'local' });

  upsertEnvValues(envFile, { LATENCY_BENCH_EMAIL: values.email, LATENCY_BENCH_PASSWORD: password });
  console.info(
    `[latency-bench-account] ${existing ? 'Updated' : 'Created'} ${values.email} (${userId}); sign-in verified; credentials written.`
  );
}

await main();
