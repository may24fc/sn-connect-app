import fs from 'node:fs';
import path from 'node:path';

const ACCOUNTS = [
  {
    email: 'employee@example.com',
    password: 'SamplePass!234',
    fullName: 'Sample Employee',
    role: 'employee',
    employmentType: 'regular',
    workArrangement: 'full_time',
    position: 'Software Engineer',
    department: 'Engineering',
  },
  {
    email: 'intern@example.com',
    password: 'SamplePass!234',
    fullName: 'Sample Intern',
    role: 'intern',
    employmentType: 'intern',
    workArrangement: 'part_time',
    position: 'Marketing Intern',
    department: 'Marketing',
  },
];

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
  console.log('🔍 Ensuring test accounts exist for task management...\n');

  const env = getEnv();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const adminHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  for (const account of ACCOUNTS) {
    console.log(`\n📋 Processing: ${account.email} (role: ${account.role})`);
    console.log('─'.repeat(60));

    // 1. Check/create auth user
    let authUserId;
    const listUrl = new URL('/auth/v1/admin/users', supabaseUrl);
    const authUsers = await fetchJson(listUrl.toString(), { headers: adminHeaders });
    const existingAuth = authUsers.users?.find((u) => u.email === account.email);

    if (existingAuth) {
      authUserId = existingAuth.id;
      console.log(`✅ auth.users: EXISTS (id: ${authUserId})`);
    } else {
      console.log('⚠️  auth.users: NOT FOUND - Creating...');
      const createUrl = new URL('/auth/v1/admin/users', supabaseUrl);
      const created = await fetchJson(createUrl.toString(), {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: { full_name: account.fullName },
          app_metadata: { provider: 'email', providers: ['email'] },
        }),
      });
      authUserId = created.id;
      console.log(`✅ auth.users: CREATED (id: ${authUserId})`);
    }

    // 2. Check/create public.users
    const usersUrl = new URL('/rest/v1/users', supabaseUrl);
    usersUrl.searchParams.set('id', `eq.${authUserId}`);
    usersUrl.searchParams.set('select', '*');

    const existingUsers = await fetchJson(usersUrl.toString(), { headers: adminHeaders });
    const existingUser = existingUsers?.[0];

    if (existingUser) {
      console.log(`✅ public.users: EXISTS (role: ${existingUser.role})`);
      if (existingUser.role !== account.role) {
        console.log(`   ⚠️  Role mismatch - updating to '${account.role}'`);
        const updateUrl = new URL(`/rest/v1/users`, supabaseUrl);
        updateUrl.searchParams.set('id', `eq.${authUserId}`);
        await fetchJson(updateUrl.toString(), {
          method: 'PATCH',
          headers: {
            ...adminHeaders,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ role: account.role, status: 'active' }),
        });
        console.log(`   ✅ Updated role to '${account.role}'`);
      }
    } else {
      console.log('⚠️  public.users: NOT FOUND - Creating...');
      const createUsersUrl = new URL('/rest/v1/users', supabaseUrl);
      await fetchJson(createUsersUrl.toString(), {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          id: authUserId,
          role: account.role,
          status: 'active',
        }),
      });
      console.log(`✅ public.users: CREATED (role: ${account.role})`);
    }

    // 3. Check/create public.employees
    const employeesUrl = new URL('/rest/v1/employees', supabaseUrl);
    employeesUrl.searchParams.set('user_id', `eq.${authUserId}`);
    employeesUrl.searchParams.set('select', '*');

    const existingEmployees = await fetchJson(employeesUrl.toString(), { headers: adminHeaders });
    const existingEmployee = existingEmployees?.[0];

    if (existingEmployee) {
      console.log(`✅ public.employees: EXISTS (emp#: ${existingEmployee.employee_number})`);
    } else {
      console.log('⚠️  public.employees: NOT FOUND - Creating...');
      const empNum = `EMP-${account.role.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const createEmpUrl = new URL('/rest/v1/employees', supabaseUrl);
      await fetchJson(createEmpUrl.toString(), {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          user_id: authUserId,
          employee_number: empNum,
          first_name: account.fullName.split(' ')[0],
          last_name: account.fullName.split(' ').slice(1).join(' ') || account.role,
          date_hired: new Date().toISOString().slice(0, 10),
          employment_type: account.employmentType,
          work_arrangement: account.workArrangement,
          position: account.position,
          department: account.department,
          company_email: account.email,
        }),
      });
      console.log(`✅ public.employees: CREATED (emp#: ${empNum})`);
    }

    // 4. Verify login works
    if (anonKey) {
      const tokenUrl = new URL('/auth/v1/token', supabaseUrl);
      tokenUrl.searchParams.set('grant_type', 'password');
      try {
        await fetchJson(tokenUrl.toString(), {
          method: 'POST',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            'X-Supabase-Api-Version': '2024-01-01',
          },
          body: JSON.stringify({
            email: account.email,
            password: account.password,
            gotrue_meta_security: {},
          }),
        });
        console.log('✅ Login verification: SUCCESS');
      } catch (e) {
        console.log(`⚠️  Login verification: FAILED - ${e.message}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ All test accounts verified and ready for task management!');
  console.log('═'.repeat(60));
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  if (error?.payload) {
    console.error('Details:', JSON.stringify(error.payload, null, 2));
  }
  process.exit(1);
});
