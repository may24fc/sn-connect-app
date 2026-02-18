#!/usr/bin/env node
/**
 * Create Admin Test Accounts
 * 
 * Creates test accounts with admin-level roles for testing
 * the reports management and other admin features.
 * 
 * After role consolidation, the available roles are:
 * - employee, intern, admin, super_admin
 * 
 * Usage:
 *   node scripts/create-admin-test-accounts.mjs
 * 
 * Creates the following accounts:
 * - admin@test.com (role: admin)
 * - superadmin@test.com (role: super_admin)
 * 
 * All accounts use password: password
 */

import fs from 'node:fs';
import path from 'node:path';

const ADMIN_ACCOUNTS = [
  {
    email: 'admin@test.com',
    password: 'password',
    fullName: 'Admin User',
    role: 'admin',
    position: 'System Administrator',
    department: 'IT',
  },
  {
    email: 'superadmin@test.com',
    password: 'password',
    fullName: 'Super Admin',
    role: 'super_admin',
    position: 'Super Administrator',
    department: 'Executive',
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
  console.log('🔐 Creating Admin Test Accounts...\n');
  console.log('This script creates admin-level test accounts for development.');
  console.log('All accounts will use password: "password"\n');

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

  for (const account of ADMIN_ACCOUNTS) {
    console.log(`\n📋 Processing: ${account.email} (DB role: ${account.role})`);
    console.log('─'.repeat(70));

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
          app_metadata: { 
            provider: 'email', 
            providers: ['email'],
            db_role: account.role, // Embed role in JWT
          },
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
      console.log(`✅ public.users: EXISTS (current role: ${existingUser.role})`);
      if (existingUser.role !== account.role) {
        console.log(`   ⚠️  Role mismatch - updating to '${account.role}'`);
        const updateUrl = new URL(`/rest/v1/users`, supabaseUrl);
        updateUrl.searchParams.set('id', `eq.${authUserId}`);
        await fetchJson(updateUrl.toString(), {
          method: 'PATCH',
          headers: { ...adminHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
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

    // 3. Check/create public.employees (admin roles also need employee records)
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
          employment_type: 'regular',
          work_arrangement: 'full_time',
          position: account.position,
          department: account.department,
          company_email: account.email,
        }),
      });
      console.log(`✅ public.employees: CREATED (emp#: ${empNum})`);
    }

    console.log(`✅ ${account.email} is ready for testing!`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ All admin test accounts are ready!');
  console.log('═'.repeat(70));
  console.log('\n📝 Test Account Summary:\n');
  
  for (const account of ADMIN_ACCOUNTS) {
    const uiRole = account.role === 'cos' ? 'super_admin (via option-b)' : 
                   ['admin', 'hr', 'ceo'].includes(account.role) ? 'admin' : 
                   account.role;
    console.log(`  • ${account.email.padEnd(25)} | DB role: ${account.role.padEnd(6)} | UI role: ${uiRole}`);
  }
  
  console.log('\n🔑 Password for all accounts: password');
  console.log('\n💡 These accounts can now:');
  console.log('  - View all reports from all employees (RLS allows admin/hr/cos/ceo)');
  console.log('  - Approve/reject reports');
  console.log('  - Access admin dashboards');
  console.log('  - Manage employees and resources');
  console.log('\n🔐 Security note: These are test accounts only. Never use in production!');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  if (error.payload) {
    console.error('Details:', JSON.stringify(error.payload, null, 2));
  }
  process.exit(1);
});
