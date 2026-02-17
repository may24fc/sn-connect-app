#!/usr/bin/env node
/**
 * Setup Sample Accounts for SN HR Portal
 * 
 * Creates the 4 standard test accounts matching the simplified role system:
 * - employee@example.com → employee role
 * - intern@example.com → intern role
 * - admin@example.com → admin role (covers admin + hr functions)
 * - super-admin@example.com → super_admin role (covers cos + ceo + super_admin functions)
 * 
 * All accounts use password: password
 * 
 * Usage:
 *   node scripts/setup-sample-accounts.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_ACCOUNTS = [
  {
    email: 'employee@example.com',
    password: 'password',
    fullName: 'Sample Employee',
    role: 'employee',
    position: 'Software Engineer',
    department: 'Engineering',
    employmentType: 'regular',
    workArrangement: 'full_time',
  },
  {
    email: 'intern@example.com',
    password: 'password',
    fullName: 'Sample Intern',
    role: 'intern',
    position: 'Marketing Intern',
    department: 'Marketing',
    employmentType: 'intern',
    workArrangement: 'part_time',
  },
  {
    email: 'admin@example.com',
    password: 'password',
    fullName: 'Admin User',
    role: 'admin',
    position: 'HR Manager',
    department: 'Human Resources',
    employmentType: 'regular',
    workArrangement: 'full_time',
  },
  {
    email: 'super-admin@example.com',
    password: 'password',
    fullName: 'Super Admin',
    role: 'super_admin',
    position: 'Chief Executive Officer',
    department: 'Executive',
    employmentType: 'regular',
    workArrangement: 'full_time',
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
  console.log('🚀 Setting up SN HR Portal Sample Accounts');
  console.log('==========================================\n');
  console.log('Creating 4 test accounts with simplified role system:');
  console.log('  • employee → standard employee access');
  console.log('  • intern → intern-level access');
  console.log('  • admin → admin + HR management access');
  console.log('  • super_admin → executive/COS/CEO access\n');

  const env = getEnv();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const adminHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  for (const account of SAMPLE_ACCOUNTS) {
    console.log(`\n📧 ${account.email}`);
    console.log('─'.repeat(70));

    // 1. Check/create auth user
    let authUserId;
    const listUrl = new URL('/auth/v1/admin/users', supabaseUrl);
    const authUsers = await fetchJson(listUrl.toString(), { headers: adminHeaders });
    const existingAuth = authUsers.users?.find((u) => u.email === account.email);

    if (existingAuth) {
      authUserId = existingAuth.id;
      console.log(`  ✅ auth.users: EXISTS (id: ${authUserId})`);
      
      // Check if app_metadata.db_role matches
      if (existingAuth.app_metadata?.db_role !== account.role) {
        console.log(`  ⚠️  Updating app_metadata.db_role to '${account.role}'...`);
        const updateAuthUrl = new URL(`/auth/v1/admin/users/${authUserId}`, supabaseUrl);
        await fetchJson(updateAuthUrl.toString(), {
          method: 'PUT',
          headers: { ...adminHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_metadata: {
              ...existingAuth.app_metadata,
              db_role: account.role,
            },
          }),
        });
        console.log(`  ✅ Updated JWT metadata`);
      }
    } else {
      console.log('  ⚠️  auth.users: NOT FOUND - Creating...');
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
            db_role: account.role, // Embed role in JWT for faster lookups
          },
        }),
      });
      authUserId = created.id;
      console.log(`  ✅ auth.users: CREATED (id: ${authUserId})`);
    }

    // 2. Check/create public.users
    const usersUrl = new URL('/rest/v1/users', supabaseUrl);
    usersUrl.searchParams.set('id', `eq.${authUserId}`);
    usersUrl.searchParams.set('select', '*');

    const existingUsers = await fetchJson(usersUrl.toString(), { headers: adminHeaders });
    const existingUser = existingUsers?.[0];

    if (existingUser) {
      console.log(`  ✅ public.users: EXISTS (current role: ${existingUser.role})`);
      if (existingUser.role !== account.role) {
        console.log(`  ⚠️  Role mismatch - updating to '${account.role}'...`);
        const updateUrl = new URL(`/rest/v1/users`, supabaseUrl);
        updateUrl.searchParams.set('id', `eq.${authUserId}`);
        await fetchJson(updateUrl.toString(), {
          method: 'PATCH',
          headers: { ...adminHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ role: account.role, status: 'active' }),
        });
        console.log(`  ✅ Updated role to '${account.role}'`);
      }
    } else {
      console.log('  ⚠️  public.users: NOT FOUND - Creating...');
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
      console.log(`  ✅ public.users: CREATED (role: ${account.role})`);
    }

    // 3. Check/create public.employees
    const employeesUrl = new URL('/rest/v1/employees', supabaseUrl);
    employeesUrl.searchParams.set('user_id', `eq.${authUserId}`);
    employeesUrl.searchParams.set('select', '*');

    const existingEmployees = await fetchJson(employeesUrl.toString(), { headers: adminHeaders });
    const existingEmployee = existingEmployees?.[0];

    if (existingEmployee) {
      console.log(`  ✅ public.employees: EXISTS (${existingEmployee.employee_number})`);
    } else {
      console.log('  ⚠️  public.employees: NOT FOUND - Creating...');
      const empNum = `EMP-${account.role.toUpperCase().replace('_', '')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
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
      console.log(`  ✅ public.employees: CREATED (${empNum})`);
    }

    console.log(`  ✅ ${account.email} is ready!`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ All sample accounts configured successfully!');
  console.log('═'.repeat(70));
  console.log('\n📝 Account Summary:\n');

  const roleDescriptions = {
    employee: 'Standard employee - can create reports, view own data',
    intern: 'Intern access - limited permissions, onboarding workflow',
    admin: 'Admin + HR - manage employees, approve reports, handle admin tasks',
    super_admin: 'Executive access - full system control, CEO/COS functions',
  };

  for (const account of SAMPLE_ACCOUNTS) {
    console.log(`  ${account.email.padEnd(30)} | ${account.role.padEnd(12)} | ${roleDescriptions[account.role]}`);
  }

  console.log('\n🔑 Password for all accounts: password');
  console.log('\n💡 Role System (Simplified):');
  console.log('  • employee     → Regular employee access');
  console.log('  • intern       → Intern-level access with onboarding');
  console.log('  • admin        → Combines admin + HR management (was: admin + hr)');
  console.log('  • super_admin  → Executive level (was: cos + ceo + super_admin)');
  console.log('\n🎯 Next Steps:');
  console.log('  1. Login at http://localhost:3000/login');
  console.log('  2. Test each role\'s permissions');
  console.log('  3. Create reports as employee, approve as admin');
  console.log('\n⚠️  These are development accounts only - DO NOT use in production!');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  if (error.payload) {
    console.error('Details:', JSON.stringify(error.payload, null, 2));
  }
  process.exit(1);
});
