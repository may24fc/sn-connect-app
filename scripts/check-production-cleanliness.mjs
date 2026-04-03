import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_NON_EMPTY_BUCKETS = new Set(['resources-library', 'resource-thumbnails', 'ai-knowledge']);

const DISALLOWED_DATA_TABLES = [
  'documents',
  'onboarding_profiles',
  'onboarding_documents',
  'onboarding_checklists',
  'onboarding_tasks',
  'tasks',
  'task_comments',
  'reports',
  'report_metrics',
  'notifications',
  'announcements',
  'announcement_reads',
  'announcement_comments',
  'announcement_attachments',
  'invoices',
  'invoice_line_items',
  'performance_reviews',
  'okrs',
  'kpis',
  'internships',
  'internship_daily_logs',
  'standup_recordings',
  'standup_topics',
  'tickets',
  'job_applications',
  'applications',
];

const BASELINE_REPORT_TABLES = [
  'departments',
  'resource_categories',
  'resources',
  'resource_collections',
  'collection_resources',
  'knowledge_sources',
  'knowledge_embeddings',
  'bank_registry',
  'fx_rates',
  'business_units',
  'job_postings',
  'audit_logs',
];

const KNOWN_TEST_DOMAINS = ['example.com', 'test.com', 'company.com'];

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed) {
      env[parsed.key] = parsed.value;
    }
  }

  return env;
}

function loadEnv() {
  const cwd = process.cwd();
  const envBase = loadEnvFile(path.join(cwd, '.env'));
  const envLocal = loadEnvFile(path.join(cwd, '.env.local'));
  // File values take priority over process.env so stale terminal
  // environment variables cannot override .env.local settings.
  return { ...process.env, ...envBase, ...envLocal };
}

function parseArgs(argv) {
  const allowedEmails = [];
  let expectZeroUsers = false;

  for (const rawArg of argv) {
    const arg = rawArg.trim();
    if (!arg) continue;

    if (arg === '--expect-zero-users') {
      expectZeroUsers = true;
      continue;
    }

    allowedEmails.push(arg.toLowerCase());
  }

  return { allowedEmails, expectZeroUsers };
}

function isKnownTestEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return false;

  const domain = normalized.split('@').at(-1) ?? '';
  return KNOWN_TEST_DOMAINS.includes(domain);
}

function formatCheck(passed, label, detail) {
  return `${passed ? 'PASS' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`;
}

async function listAllAuthUsers(supabase) {
  const users = [];
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

async function getTableCount(supabase, table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    // Table may not exist yet on a blank project (pre-migration)
    if (error.message.includes('schema cache') || error.code === 'PGRST204') {
      return 0;
    }
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function getBucketObjectPresence(supabase, bucketName) {
  const { data, error } = await supabase.storage.from(bucketName).list('', { limit: 1 });
  if (error) {
    throw new Error(`Failed to inspect bucket ${bucketName}: ${error.message}`);
  }
  return (data ?? []).length > 0;
}

async function main() {
  const { allowedEmails, expectZeroUsers } = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authUsers = await listAllAuthUsers(supabase);
  const authEmails = authUsers
    .map((user) => user.email?.trim().toLowerCase())
    .filter(Boolean);

  const testAuthEmails = authEmails.filter((email) => isKnownTestEmail(email));
  const unexpectedAuthEmails =
    allowedEmails.length > 0 ? authEmails.filter((email) => !allowedEmails.includes(email)) : [];

  const usersCount = await getTableCount(supabase, 'users');
  const employeesCount = await getTableCount(supabase, 'employees');

  const publicUsersChecks = [];
  const { data: publicUsersData, error: publicUsersError } = await supabase
    .from('users')
    .select('id, role, status')
    .is('deleted_at', null)
    .limit(50);

  // Table may not exist on a blank project (pre-migration) — treat as empty
  const publicUsersRows = publicUsersError ? [] : (publicUsersData ?? []);

  publicUsersChecks.push({
    passed: !expectZeroUsers || usersCount === 0,
    label: 'public.users count',
    detail: `count=${usersCount}`,
  });

  publicUsersChecks.push({
    passed: !expectZeroUsers || employeesCount === 0,
    label: 'employees count',
    detail: `count=${employeesCount}`,
  });

  publicUsersChecks.push({
    passed: !expectZeroUsers || authUsers.length === 0,
    label: 'auth.users count',
    detail: `count=${authUsers.length}`,
  });

  publicUsersChecks.push({
    passed: testAuthEmails.length === 0,
    label: 'no test-domain auth users',
    detail: testAuthEmails.length > 0 ? testAuthEmails.join(', ') : 'none',
  });

  if (allowedEmails.length > 0) {
    publicUsersChecks.push({
      passed: unexpectedAuthEmails.length === 0,
      label: 'auth users match allowlist',
      detail: unexpectedAuthEmails.length > 0 ? unexpectedAuthEmails.join(', ') : allowedEmails.join(', '),
    });
  }

  const disallowedCounts = [];
  for (const table of DISALLOWED_DATA_TABLES) {
    try {
      const count = await getTableCount(supabase, table);
      disallowedCounts.push({ table, count, error: null });
    } catch (error) {
      disallowedCounts.push({ table, count: null, error: error.message || String(error) });
    }
  }

  const baselineCounts = [];
  for (const table of BASELINE_REPORT_TABLES) {
    try {
      const count = await getTableCount(supabase, table);
      baselineCounts.push({ table, count, error: null });
    } catch (error) {
      baselineCounts.push({ table, count: null, error: error.message || String(error) });
    }
  }

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    throw new Error(`Failed to list storage buckets: ${bucketsError.message}`);
  }

  const bucketChecks = [];
  for (const bucket of buckets ?? []) {
    try {
      const hasObjects = await getBucketObjectPresence(supabase, bucket.name);
      const shouldBeEmpty = !ALLOWED_NON_EMPTY_BUCKETS.has(bucket.name);
      bucketChecks.push({
        bucket: bucket.name,
        hasObjects,
        shouldBeEmpty,
        error: null,
      });
    } catch (error) {
      bucketChecks.push({
        bucket: bucket.name,
        hasObjects: null,
        shouldBeEmpty: !ALLOWED_NON_EMPTY_BUCKETS.has(bucket.name),
        error: error.message || String(error),
      });
    }
  }

  console.log('='.repeat(88));
  console.log('PRODUCTION CLEANLINESS CHECK');
  console.log('='.repeat(88));
  console.log(`Mode: ${expectZeroUsers ? 'fresh project before bootstrap' : 'post-bootstrap / baseline import review'}`);
  if (allowedEmails.length > 0) {
    console.log(`Allowed auth emails: ${allowedEmails.join(', ')}`);
  }
  console.log();

  let failureCount = 0;

  console.log('Identity checks');
  for (const check of publicUsersChecks) {
    console.log(`- ${formatCheck(check.passed, check.label, check.detail)}`);
    if (!check.passed) failureCount += 1;
  }
  console.log();

  console.log('Disallowed operational data');
  for (const entry of disallowedCounts) {
    const passed = !entry.error && entry.count === 0;
    const detail = entry.error ? entry.error : `count=${entry.count}`;
    console.log(`- ${formatCheck(passed, entry.table, detail)}`);
    if (!passed) failureCount += 1;
  }
  console.log();

  console.log('Baseline data report');
  for (const entry of baselineCounts) {
    const detail = entry.error ? entry.error : `count=${entry.count}`;
    console.log(`- INFO ${entry.table}: ${detail}`);
  }
  console.log();

  console.log('Storage buckets');
  for (const entry of bucketChecks) {
    const passed = !entry.error && (!entry.shouldBeEmpty || entry.hasObjects === false);
    const detail = entry.error
      ? entry.error
      : entry.hasObjects
        ? entry.shouldBeEmpty
          ? 'bucket contains objects'
          : 'bucket contains allowed baseline objects'
        : 'empty';
    console.log(`- ${formatCheck(passed, entry.bucket, detail)}`);
    if (!passed) failureCount += 1;
  }
  console.log();

  console.log('Current public.users sample');
  for (const user of publicUsersRows) {
    console.log(`- ${user.id} role=${user.role} status=${user.status}`);
  }
  if (publicUsersRows.length === 0) {
    console.log('- none');
  }
  console.log();

  console.log('='.repeat(88));
  if (failureCount > 0) {
    console.error(`FAIL summary: ${failureCount} cleanup issue(s) must be resolved`);
    process.exit(1);
  }

  console.log('PASS summary: project cleanliness checks passed');
}

main().catch((error) => {
  console.error(`FAIL unexpected error: ${error.message || error}`);
  process.exit(1);
});