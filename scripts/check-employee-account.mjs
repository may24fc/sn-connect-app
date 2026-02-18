import fs from 'node:fs';
import path from 'node:path';

const EMPLOYEE_ID = 'd93eb769-b28f-40e4-b5b0-c2bdecbac77a';

function loadEnv() {
  const cwd = process.cwd();
  const env = {};
  for (const f of ['.env', '.env.local']) {
    const p = path.join(cwd, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let val = t.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      env[t.slice(0, i).trim()] = val;
    }
  }
  return { ...env, ...process.env };
}

async function main() {
  const env = loadEnv();
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  // Check auth user app_metadata
  const authRes = await fetch(`${url}/auth/v1/admin/users/${EMPLOYEE_ID}`, { headers });
  const authUser = await authRes.json();

  console.log('\n=== Auth User (employee@example.com) ===');
  console.log('app_metadata:', JSON.stringify(authUser.app_metadata, null, 2));
  console.log('user_metadata:', JSON.stringify(authUser.user_metadata, null, 2));

  // Check public.users
  const usersRes = await fetch(`${url}/rest/v1/users?id=eq.${EMPLOYEE_ID}&select=*`, { headers });
  const users = await usersRes.json();
  console.log('\n=== public.users ===');
  console.log(JSON.stringify(users[0], null, 2));

  // Check public.employees
  const empRes = await fetch(`${url}/rest/v1/employees?user_id=eq.${EMPLOYEE_ID}&select=id,user_id,employee_number,first_name,last_name,deleted_at`, { headers });
  const emps = await empRes.json();
  console.log('\n=== public.employees ===');
  console.log(JSON.stringify(emps[0], null, 2));

  // Check invoices for this employee
  const empId = emps[0]?.id;
  if (empId) {
    const invRes = await fetch(`${url}/rest/v1/invoices?employee_id=eq.${empId}&select=id,invoice_number,status,employee_id,created_at`, { headers });
    const invs = await invRes.json();
    console.log(`\n=== Invoices for employee_id=${empId} ===`);
    console.log(`Count: ${invs.length}`);
    console.log(JSON.stringify(invs.slice(0, 3), null, 2));

    // Check OKRs
    const okrRes = await fetch(`${url}/rest/v1/okrs?employee_id=eq.${empId}&select=id,objective,status,employee_id,created_at`, { headers });
    const okrs = await okrRes.json();
    console.log(`\n=== OKRs for employee_id=${empId} ===`);
    console.log(`Count: ${okrs.length}`);
    console.log(JSON.stringify(okrs.slice(0, 3), null, 2));

    // Check KPIs
    const kpiRes = await fetch(`${url}/rest/v1/kpis?employee_id=eq.${empId}&select=id,name,employee_id,created_at`, { headers });
    const kpis = await kpiRes.json();
    console.log(`\n=== KPIs for employee_id=${empId} ===`);
    console.log(`Count: ${kpis.length}`);
    console.log(JSON.stringify(kpis.slice(0, 3), null, 2));
  }
}

main().catch(console.error);
