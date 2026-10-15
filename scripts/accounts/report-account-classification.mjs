import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envFile = process.argv[process.argv.indexOf('--env-file') + 1] || 'apps/web/.env.local';
if (!fs.existsSync(envFile)) throw new Error(`Missing environment file: ${envFile}`);
for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
const [{ data: users, error: usersError }, { data: employees, error: employeesError }] =
  await Promise.all([
    admin
      .from('users')
      .select('id, role, account_kind, account_purpose, deleted_at')
      .order('created_at'),
    admin.from('employees').select('user_id').is('deleted_at', null),
  ]);
if (usersError) throw usersError;
if (employeesError) throw employeesError;

const employeeIds = new Set((employees ?? []).map((employee) => employee.user_id).filter(Boolean));
const anomalies = (users ?? []).filter(
  (user) =>
    (user.account_kind === 'workforce' && !employeeIds.has(user.id)) ||
    (user.account_kind !== 'workforce' && employeeIds.has(user.id))
);
console.table(
  anomalies.map((user) => ({
    user_id: user.id,
    role: user.role,
    account_kind: user.account_kind,
    has_employee_profile: employeeIds.has(user.id),
    purpose_recorded: Boolean(user.account_purpose),
    deleted: Boolean(user.deleted_at),
  }))
);
console.info(
  `[account-classification] ${anomalies.length} account(s) require explicit review; no classifications were changed.`
);
