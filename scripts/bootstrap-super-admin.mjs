/**
 * Bootstrap Super Admin Account
 *
 * Creates the first super_admin user in a fresh production Supabase project.
 * This account is required before the leadership invite flow can be used.
 *
 * Usage:
 *   node scripts/bootstrap-super-admin.mjs \
 *     --email may@24fitclub.com.au \
 *     --password '<temporary-password>' \
 *     --first-name May \
 *     --last-name Layugan \
 *     --employee-number EMP-0001 \
 *     --position COO \
 *     --department Operations \
 *     --date-hired 2024-01-01
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_EMPLOYMENT_TYPE = 'regular';
const DEFAULT_WORK_ARRANGEMENT = 'full_time';

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

function slugifyDepartment(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function parseArgs(argv) {
  const options = {
    employmentType: DEFAULT_EMPLOYMENT_TYPE,
    workArrangement: DEFAULT_WORK_ARRANGEMENT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    index += 1;

    switch (key) {
      case 'email':
        options.email = value;
        break;
      case 'password':
        options.password = value;
        break;
      case 'first-name':
        options.firstName = value;
        break;
      case 'last-name':
        options.lastName = value;
        break;
      case 'employee-number':
        options.employeeNumber = value;
        break;
      case 'position':
        options.position = value;
        break;
      case 'department':
        options.department = value;
        break;
      case 'date-hired':
        options.dateHired = value;
        break;
      case 'employment-type':
        options.employmentType = value;
        break;
      case 'work-arrangement':
        options.workArrangement = value;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const requiredFields = [
    'email',
    'password',
    'firstName',
    'lastName',
    'employeeNumber',
    'position',
    'department',
    'dateHired',
  ];

  for (const field of requiredFields) {
    if (!options[field]) {
      throw new Error(`Missing required argument: --${field.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`);
    }
  }

  return {
    ...options,
    departmentSlug: slugifyDepartment(options.department),
  };
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const bootstrapUser = parseArgs(process.argv.slice(2));
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

  const { email, password, firstName, lastName } = bootstrapUser;

  console.log(`\nBootstrapping super_admin: ${email}\n`);

  // 1. Check if auth user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    console.log(`Auth user already exists: ${existing.id}`);
    console.log('Skipping auth creation. Checking public.users and employees...');
    await ensurePublicRows(supabase, existing.id, bootstrapUser);
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
  await ensurePublicRows(supabase, userId, bootstrapUser);

  console.log('\n✅ Bootstrap complete!');
  console.log(`\nFirst login credentials:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\n⚠️  Change the password immediately after first login.`);
}

async function ensurePublicRows(supabase, userId, bootstrapUser) {
  const {
    email,
    firstName,
    lastName,
    employeeNumber,
    position,
    department,
    departmentSlug,
    employmentType,
    workArrangement,
    dateHired,
  } = bootstrapUser;

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
