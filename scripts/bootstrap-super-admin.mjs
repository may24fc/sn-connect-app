/**
 * Bootstrap Super Admin Account
 *
 * Creates the first super_admin user in a fresh production Supabase project.
 * This account is required before the leadership invite flow can be used.
 *
 * Usage:
 *   node scripts/bootstrap-super-admin.mjs
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

// ── Configuration ──────────────────────────────────────────────
const BOOTSTRAP_USER = {
  email: 'may@24fitclub.com.au',
  password: 'ChangeMe-2026!',
  firstName: 'May',
  lastName: 'Layugan',
  employeeNumber: 'EMP-0001',
  position: 'COO',
  department: 'Operations',
  departmentSlug: 'operations',
  employmentType: 'regular',
  workArrangement: 'full_time',
  dateHired: '2024-01-01',
};

// ── Env helpers ────────────────────────────────────────────────
function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const sep = trimmed.indexOf('=');
  if (sep === -1) return null;
  const key = trimmed.slice(0, sep).trim();
  let value = trimmed.slice(sep + 1).trim();
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
    if (parsed) env[parsed.key] = parsed.value;
  }
  return env;
}

function loadEnv() {
  const cwd = process.cwd();
  const envBase = loadEnvFile(path.join(cwd, '.env'));
  const envLocal = loadEnvFile(path.join(cwd, '.env.local'));
  return { ...process.env, ...envBase, ...envLocal };
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { email, password, firstName, lastName, employeeNumber, position, department, departmentSlug, employmentType, workArrangement, dateHired } = BOOTSTRAP_USER;

  console.log(`\nBootstrapping super_admin: ${email}\n`);

  // 1. Check if auth user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    console.log(`Auth user already exists: ${existing.id}`);
    console.log('Skipping auth creation. Checking public.users and employees...');
    await ensurePublicRows(supabase, existing.id);
    return;
  }

  // 2. Create auth user
  console.log('Creating auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { db_role: 'super_admin' },
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (authError) {
    console.error('Failed to create auth user:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`Auth user created: ${userId}`);

  // 3. Create public rows
  await ensurePublicRows(supabase, userId);

  console.log('\n✅ Bootstrap complete!');
  console.log(`\nFirst login credentials:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\n⚠️  Change the password immediately after first login.`);
}

async function ensurePublicRows(supabase, userId) {
  const { email, firstName, lastName, employeeNumber, position, department, departmentSlug, employmentType, workArrangement, dateHired } = BOOTSTRAP_USER;

  // Look up department UUID
  const { data: dept } = await supabase
    .from('departments')
    .select('id')
    .ilike('name', `%${departmentSlug}%`)
    .single();

  const departmentId = dept?.id ?? null;

  // 3a. Upsert public.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (existingUser) {
    // A trigger may auto-create the row with default role='employee'.
    // Always update to ensure role and department are correct.
    console.log('public.users row exists — updating role to super_admin...');
    const { error: updateErr } = await supabase
      .from('users')
      .update({ role: 'super_admin', status: 'active', department_id: departmentId })
      .eq('id', userId);
    if (updateErr) {
      console.error('Failed to update users row:', updateErr.message);
      process.exit(1);
    }
    console.log('public.users row updated');
  } else {
    console.log('Inserting public.users row...');
    const { error: usersError } = await supabase.from('users').insert({
      id: userId,
      role: 'super_admin',
      status: 'active',
      department_id: departmentId,
    });
    if (usersError) {
      console.error('Failed to insert users row:', usersError.message);
      process.exit(1);
    }
    console.log('public.users row created');
  }

  // 3b. Upsert public.employees
  const { data: existingEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingEmployee) {
    console.log('public.employees row already exists');
  } else {
    console.log('Inserting public.employees row...');
    const { error: empError } = await supabase.from('employees').insert({
      user_id: userId,
      employee_number: employeeNumber,
      first_name: firstName,
      last_name: lastName,
      company_email: email,
      position,
      department,
      employment_type: employmentType,
      work_arrangement: workArrangement,
      date_hired: dateHired,
    });
    if (empError) {
      console.error('Failed to insert employees row:', empError.message);
      process.exit(1);
    }
    console.log('public.employees row created');
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
