/**
 * Replaces placeholder department text on employees with the real department name.
 *
 * Onboarding approval used to write `employees.department = 'Assigned Department'` (when the
 * onboarding profile had a department) or `'Unassigned'`. This resolves each affected row through
 * `users.department_id -> departments.name`:
 *   - a resolvable department  -> its name
 *   - no department, 'Assigned Department' -> 'Unassigned' (the column is NOT NULL)
 *   - no department, 'Unassigned'          -> left as is
 *
 * Dry-run by default. Usage (from the repo root):
 *   node scripts/backfill/backfill-employee-department-names.mjs                 # dry run
 *   node scripts/backfill/backfill-employee-department-names.mjs --apply         # local only
 *   node scripts/backfill/backfill-employee-department-names.mjs --apply --confirm-prod
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment, then .env and .env.local in the current directory. Output contains only ids and
 * department names, never personal data.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const CONFIRM_PROD = process.argv.includes('--confirm-prod');
const PAGE_SIZE = 500;
const PLACEHOLDER_DEPARTMENTS = ['Assigned Department', 'Unassigned'];
const UNASSIGNED_DEPARTMENT = 'Unassigned';

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

  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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
  return { ...process.env, ...envBase, ...envLocal };
}

function isLikelyProdUrl(baseUrl) {
  return !/localhost|127\.0\.0\.1/i.test(baseUrl);
}

async function fetchPlaceholderEmployees(supabase) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('employees')
      .select('id, user_id, department')
      .in('department', PLACEHOLDER_DEPARTMENTS)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load employees: ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchDepartmentNamesByUserId(supabase, userIds) {
  const departmentIdByUserId = new Map();

  for (let index = 0; index < userIds.length; index += PAGE_SIZE) {
    const chunk = userIds.slice(index, index + PAGE_SIZE);
    const { data, error } = await supabase
      .from('users')
      .select('id, department_id')
      .in('id', chunk);

    if (error) {
      throw new Error(`Failed to load users: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (row.department_id) {
        departmentIdByUserId.set(row.id, row.department_id);
      }
    }
  }

  const departmentIds = Array.from(new Set(departmentIdByUserId.values()));
  const nameByDepartmentId = new Map();

  for (let index = 0; index < departmentIds.length; index += PAGE_SIZE) {
    const chunk = departmentIds.slice(index, index + PAGE_SIZE);
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, deleted_at')
      .in('id', chunk);

    if (error) {
      throw new Error(`Failed to load departments: ${error.message}`);
    }

    for (const row of data ?? []) {
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      if (!row.deleted_at && name) {
        nameByDepartmentId.set(row.id, name);
      }
    }
  }

  const nameByUserId = new Map();
  for (const [userId, departmentId] of departmentIdByUserId.entries()) {
    const name = nameByDepartmentId.get(departmentId);
    if (name) {
      nameByUserId.set(userId, name);
    }
  }

  return nameByUserId;
}

function resolveReplacement(employee, nameByUserId) {
  const departmentName = nameByUserId.get(employee.user_id) ?? null;

  if (departmentName) {
    return departmentName === employee.department ? null : departmentName;
  }

  return employee.department === UNASSIGNED_DEPARTMENT ? null : UNASSIGNED_DEPARTMENT;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  if (APPLY && isLikelyProdUrl(supabaseUrl) && !CONFIRM_PROD) {
    throw new Error(
      'Refusing to apply the employee department backfill without --confirm-prod on a non-local Supabase target'
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const employees = await fetchPlaceholderEmployees(supabase);
  const userIds = Array.from(new Set(employees.map((row) => row.user_id).filter(Boolean)));
  const nameByUserId = await fetchDepartmentNamesByUserId(supabase, userIds);

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    target: supabaseUrl,
    scanned: employees.length,
    updated: 0,
    unchanged: 0,
    failed: 0,
    changes: [],
  };

  for (const employee of employees) {
    const replacement = resolveReplacement(employee, nameByUserId);

    if (!replacement) {
      summary.unchanged += 1;
      continue;
    }

    summary.changes.push({ employeeId: employee.id, from: employee.department, to: replacement });

    if (APPLY) {
      const { error } = await supabase
        .from('employees')
        .update({ department: replacement })
        .eq('id', employee.id)
        .eq('department', employee.department);

      if (error) {
        summary.failed += 1;
        console.error(`[backfill-employee-department-names] Failed to update ${employee.id}:`, error.message);
        continue;
      }
    }

    summary.updated += 1;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(
    '[backfill-employee-department-names] Failed:',
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
