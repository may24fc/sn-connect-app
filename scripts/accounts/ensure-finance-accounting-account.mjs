#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const EMAIL = 'accounting@example.com';
const PASSWORD = 'password';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[trimmed.slice(0, index).trim()] = value;
  }
  return env;
}

async function request(url, key, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const env = { ...loadEnvFile(path.resolve('.env')), ...loadEnvFile(path.resolve('.env.local')) };
  const base = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const target = new URL(base);
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !key) {
    throw new Error('Refusing to run: this script requires the local Supabase URL and service-role key');
  }

  const departmentQuery = new URL('/rest/v1/departments', base);
  departmentQuery.searchParams.set('name', 'eq.Accounting');
  departmentQuery.searchParams.set('select', 'id,deleted_at');
  let [department] = await request(departmentQuery, key);
  if (!department) {
    [department] = await request(new URL('/rest/v1/departments', base), key, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        name: 'Accounting',
        description: 'Finance operations, reconciliation, and reporting',
      }),
    });
  } else if (department.deleted_at) {
    const restoreDepartment = new URL('/rest/v1/departments', base);
    restoreDepartment.searchParams.set('id', `eq.${department.id}`);
    await request(restoreDepartment, key, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ deleted_at: null }),
    });
  }

  const authUsers = await request(new URL('/auth/v1/admin/users?per_page=1000', base), key);
  let authUser = authUsers.users?.find((user) => user.email === EMAIL);
  if (!authUser) {
    authUser = await request(new URL('/auth/v1/admin/users', base), key, {
      method: 'POST',
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Accounting User' },
        app_metadata: { provider: 'email', providers: ['email'], db_role: 'employee' },
      }),
    });
  }

  const userQuery = new URL('/rest/v1/users', base);
  userQuery.searchParams.set('id', `eq.${authUser.id}`);
  const users = await request(userQuery, key);
  if (users.length) {
    await request(userQuery, key, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ role: 'employee', status: 'active', department_id: department.id, deleted_at: null }),
    });
  } else {
    await request(new URL('/rest/v1/users', base), key, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: authUser.id, role: 'employee', status: 'active', department_id: department.id }),
    });
  }

  const employeeQuery = new URL('/rest/v1/employees', base);
  employeeQuery.searchParams.set('user_id', `eq.${authUser.id}`);
  const employees = await request(employeeQuery, key);
  if (employees.length) {
    await request(employeeQuery, key, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ position: 'Accounting Associate', department: 'Accounting', company_email: EMAIL, deleted_at: null }),
    });
  } else {
    await request(new URL('/rest/v1/employees', base), key, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: authUser.id,
        employee_number: 'EMP-ACCOUNTING-LOCAL',
        first_name: 'Accounting',
        last_name: 'User',
        date_hired: new Date().toISOString().slice(0, 10),
        employment_type: 'regular',
        work_arrangement: 'full_time',
        position: 'Accounting Associate',
        department: 'Accounting',
        company_email: EMAIL,
      }),
    });
  }

  console.log(`Local Finance Accounting account ready: ${EMAIL}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
