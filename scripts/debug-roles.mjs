import fs from 'node:fs';
import path from 'node:path';

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return null;
  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();
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

function getEnv() {
  const cwd = process.cwd();
  const envLocal = loadEnvFile(path.join(cwd, '.env.local'));
  const envBase = loadEnvFile(path.join(cwd, '.env'));
  return { ...envBase, ...envLocal, ...process.env };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

async function main() {
  console.log('🔍 Checking all sample account roles...\n');

  const env = getEnv();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const adminHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  // Fetch all users from public.users
  const usersUrl = new URL('/rest/v1/users', supabaseUrl);
  usersUrl.searchParams.set('select', 'id,role,status,deleted_at');
  usersUrl.searchParams.set('deleted_at', 'is.null');

  const usersData = await fetchJson(usersUrl.toString(), { headers: adminHeaders });
  const users = usersData || [];

  // Fetch corresponding auth.users
  const authUrl = new URL('/auth/v1/admin/users', supabaseUrl);
  const authData = await fetchJson(authUrl.toString(), { headers: adminHeaders });
  const authUsers = authData.users || [];

  // Fetch employees
  const employeesUrl = new URL('/rest/v1/employees', supabaseUrl);
  employeesUrl.searchParams.set('select', 'user_id,employee_number,first_name,last_name');
  employeesUrl.searchParams.set('deleted_at', 'is.null');

  const employeesData = await fetchJson(employeesUrl.toString(), { headers: adminHeaders });
  const employees = employeesData || [];

  const employeeByUserId = new Map();
  employees.forEach((emp) => {
    employeeByUserId.set(emp.user_id, emp);
  });

  console.log('═'.repeat(80));
  console.log('SAMPLE ACCOUNTS ROLE CHECK');
  console.log('═'.repeat(80));
  console.log();

  const sampleEmails = [
    'employee@example.com',
    'intern@example.com',
    'admin@example.com',
    'super-admin@example.com',
  ];

  for (const email of sampleEmails) {
    const authUser = authUsers.find((u) => u.email === email);
    if (!authUser) {
      console.log(`❌ ${email} - NOT FOUND in auth.users`);
      console.log();
      continue;
    }

    const publicUser = users.find((u) => u.id === authUser.id);
    const employee = employeeByUserId.get(authUser.id);

    console.log(`📧 ${email}`);
    console.log(`   Auth ID: ${authUser.id}`);
    console.log(`   Public Role: ${publicUser?.role || '❌ NOT FOUND'}`);
    console.log(`   Status: ${publicUser?.status || 'N/A'}`);
    console.log(
      `   Employee Record: ${employee ? `✅ ${employee.employee_number} (${employee.first_name} ${employee.last_name})` : '❌ NOT FOUND'}`
    );
    console.log();
  }

  console.log('═'.repeat(80));
  console.log('TASK ASSIGNMENT ANALYSIS');
  console.log('═'.repeat(80));
  console.log();

  const superAdminUser = users.find((u) => {
    const authUser = authUsers.find((au) => au.email === 'super-admin@example.com');
    return authUser && u.id === authUser.id;
  });

  if (superAdminUser) {
    console.log(`✅ Super-admin role: ${superAdminUser.role}`);
    console.log(`   Expected: 'super_admin'`);
    console.log(
      `   Match: ${superAdminUser.role === 'super_admin' ? '✅ YES' : '❌ NO - THIS IS THE PROBLEM!'}`
    );
    console.log();
  } else {
    console.log('❌ super-admin@example.com not found in public.users');
    console.log();
  }

  const assignableUsers = users.filter((u) => u.role === 'employee' || u.role === 'intern');
  console.log(`Assignable users (employee/intern): ${assignableUsers.length}`);
  assignableUsers.forEach((u) => {
    const authUser = authUsers.find((au) => au.id === u.id);
    const emp = employeeByUserId.get(u.id);
    console.log(
      `   - ${authUser?.email || 'unknown'} (role: ${u.role}, employee: ${emp ? '✅' : '❌'})`
    );
  });

  console.log();
  console.log('═'.repeat(80));
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  if (error?.payload) {
    console.error('Details:', JSON.stringify(error.payload, null, 2));
  }
  process.exit(1);
});
