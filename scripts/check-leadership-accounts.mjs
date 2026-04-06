import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const LEADERSHIP_ROLES = ['admin', 'super_admin'];
const STRICT_MODE_FLAG = '--allow-manual-fallback';

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

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
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

async function listAllAuthUsers(supabase) {
  const users = [];
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function parseArgs(argv) {
  const requestedEmails = [];
  let strictInviteFlow = true;

  for (const rawArg of argv) {
    const arg = rawArg.trim();
    if (!arg) continue;

    if (arg === STRICT_MODE_FLAG) {
      strictInviteFlow = false;
      continue;
    }

    requestedEmails.push(arg.toLowerCase());
  }

  return { requestedEmails, strictInviteFlow };
}

function formatCheckResult(passed, label, detail) {
  return `${passed ? 'PASS' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`;
}

function getUserRoleFromMetadata(authUser) {
  return typeof authUser?.app_metadata?.db_role === 'string' ? authUser.app_metadata.db_role : null;
}

function getDisplayName(authUser) {
  const fullName = authUser?.user_metadata?.full_name;
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }

  return authUser?.email ?? 'unknown';
}

async function main() {
  const { requestedEmails, strictInviteFlow } = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authUsers = await listAllAuthUsers(supabase);
  const authById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const authByEmail = new Map(
    authUsers
      .filter((authUser) => typeof authUser.email === 'string' && authUser.email)
      .map((authUser) => [authUser.email.toLowerCase(), authUser])
  );

  let requestedUserIds = null;
  if (requestedEmails.length > 0) {
    requestedUserIds = requestedEmails
      .map((email) => authByEmail.get(email)?.id ?? null)
      .filter(Boolean);

    const unresolvedEmails = requestedEmails.filter((email) => !authByEmail.has(email));
    if (unresolvedEmails.length > 0) {
      console.error(`FAIL auth lookup: no auth.users match for ${unresolvedEmails.join(', ')}`);
      process.exit(1);
    }
  }

  let usersQuery = supabase
    .from('users')
    .select('id, role, status, created_by, deleted_at')
    .in('role', LEADERSHIP_ROLES)
    .is('deleted_at', null)
    .order('role', { ascending: true })
    .order('id', { ascending: true });

  if (requestedUserIds && requestedUserIds.length > 0) {
    usersQuery = usersQuery.in('id', requestedUserIds);
  }

  const { data: leadershipUsers, error: leadershipUsersError } = await usersQuery;

  if (leadershipUsersError) {
    throw new Error(`Failed to fetch leadership users: ${leadershipUsersError.message}`);
  }

  if (!leadershipUsers || leadershipUsers.length === 0) {
    console.error('FAIL leadership lookup: no matching admin or super_admin accounts found');
    process.exit(1);
  }

  const leadershipIds = leadershipUsers.map((user) => user.id);

  const [{ data: employees, error: employeesError }, { data: onboardingProfiles, error: onboardingError }, { data: inviteLogs, error: inviteLogsError }] =
    await Promise.all([
      supabase
        .from('employees')
        .select('id, user_id, employee_number')
        .in('user_id', leadershipIds)
        .is('deleted_at', null),
      supabase
        .from('onboarding_profiles')
        .select('id, user_id, current_step, is_completed')
        .in('user_id', leadershipIds)
        .is('deleted_at', null),
      supabase
        .from('audit_logs')
        .select('record_id, performed_by, performed_at, action, metadata')
        .eq('table_name', 'users')
        .eq('action', 'invite_user')
        .in('record_id', leadershipIds)
        .order('performed_at', { ascending: false }),
    ]);

  if (employeesError) {
    throw new Error(`Failed to fetch employee records: ${employeesError.message}`);
  }

  if (onboardingError) {
    throw new Error(`Failed to fetch onboarding profiles: ${onboardingError.message}`);
  }

  if (inviteLogsError) {
    throw new Error(`Failed to fetch invite audit logs: ${inviteLogsError.message}`);
  }

  const employeeByUserId = new Map((employees ?? []).map((employee) => [employee.user_id, employee]));
  const onboardingByUserId = new Map(
    (onboardingProfiles ?? []).map((profile) => [profile.user_id, profile])
  );
  const latestInviteLogByUserId = new Map();

  for (const inviteLog of inviteLogs ?? []) {
    if (!latestInviteLogByUserId.has(inviteLog.record_id)) {
      latestInviteLogByUserId.set(inviteLog.record_id, inviteLog);
    }
  }

  const inviterIds = new Set();
  for (const leadershipUser of leadershipUsers) {
    if (leadershipUser.created_by) {
      inviterIds.add(leadershipUser.created_by);
    }

    const inviteLog = latestInviteLogByUserId.get(leadershipUser.id);
    if (inviteLog?.performed_by) {
      inviterIds.add(inviteLog.performed_by);
    }
  }

  const inviterRoleById = new Map();
  if (inviterIds.size > 0) {
    const { data: inviterUsers, error: inviterUsersError } = await supabase
      .from('users')
      .select('id, role')
      .in('id', Array.from(inviterIds))
      .is('deleted_at', null);

    if (inviterUsersError) {
      throw new Error(`Failed to fetch inviter roles: ${inviterUsersError.message}`);
    }

    for (const inviterUser of inviterUsers ?? []) {
      inviterRoleById.set(inviterUser.id, inviterUser.role);
    }
  }

  console.log('='.repeat(88));
  console.log('LEADERSHIP ACCOUNT PRODUCTION CHECK');
  console.log('='.repeat(88));
  console.log(`Mode: ${strictInviteFlow ? 'strict privileged invite flow' : 'manual fallback allowed'}`);
  console.log(`Accounts checked: ${leadershipUsers.length}`);
  console.log();

  let failureCount = 0;

  for (const leadershipUser of leadershipUsers) {
    const authUser = authById.get(leadershipUser.id) ?? null;
    const employee = employeeByUserId.get(leadershipUser.id) ?? null;
    const onboardingProfile = onboardingByUserId.get(leadershipUser.id) ?? null;
    const inviteLog = latestInviteLogByUserId.get(leadershipUser.id) ?? null;
    const auditRole = inviteLog?.metadata?.role;
    const inviterRoleFromCreatedBy = leadershipUser.created_by
      ? inviterRoleById.get(leadershipUser.created_by) ?? null
      : null;
    const inviterRoleFromAudit = inviteLog?.performed_by
      ? inviterRoleById.get(inviteLog.performed_by) ?? null
      : null;
    const metadataRole = getUserRoleFromMetadata(authUser);
    const privilegeFlowEvidence = Boolean(
      inviteLog &&
        LEADERSHIP_ROLES.includes(auditRole) &&
        inviterRoleFromAudit === 'super_admin' &&
        inviterRoleFromCreatedBy === 'super_admin'
    );

    const checks = [
      {
        passed: Boolean(authUser),
        label: 'auth user exists',
        detail: authUser ? authUser.email : 'missing from auth.users',
      },
      {
        passed: metadataRole === leadershipUser.role,
        label: 'app_metadata.db_role matches',
        detail: `auth=${metadataRole ?? 'null'}, public=${leadershipUser.role}`,
      },
      {
        passed: leadershipUser.status === 'active',
        label: 'public.users.status is active',
        detail: `status=${leadershipUser.status}`,
      },
      {
        passed: Boolean(employee),
        label: 'employee record exists',
        detail: employee ? employee.employee_number : 'missing employee row',
      },
      {
        passed: !onboardingProfile,
        label: 'no active onboarding profile remains',
        detail: onboardingProfile
          ? `profile=${onboardingProfile.id}, step=${onboardingProfile.current_step}`
          : 'none',
      },
    ];

    if (strictInviteFlow) {
      checks.push({
        passed: privilegeFlowEvidence,
        label: 'privileged invite flow evidence exists',
        detail: inviteLog
          ? `auditRole=${String(auditRole)}, auditActorRole=${inviterRoleFromAudit ?? 'null'}, createdByRole=${inviterRoleFromCreatedBy ?? 'null'}`
          : 'missing invite_user audit log',
      });
    } else {
      checks.push({
        passed: privilegeFlowEvidence || !inviteLog,
        label: 'invite provenance reviewed',
        detail: privilegeFlowEvidence
          ? 'privileged invite flow confirmed'
          : inviteLog
            ? `auditRole=${String(auditRole)}, auditActorRole=${inviterRoleFromAudit ?? 'null'}, createdByRole=${inviterRoleFromCreatedBy ?? 'null'}`
            : 'manual fallback requires separate ops approval',
      });
    }

    const accountFailed = checks.some((check) => !check.passed);
    if (accountFailed) {
      failureCount += 1;
    }

    console.log(`${accountFailed ? 'FAIL' : 'PASS'} ${getDisplayName(authUser)} <${authUser?.email ?? 'unknown'}>`);
    console.log(`  Role: ${leadershipUser.role}`);
    console.log(`  User ID: ${leadershipUser.id}`);
    for (const check of checks) {
      console.log(`  - ${formatCheckResult(check.passed, check.label, check.detail)}`);
    }
    console.log();
  }

  console.log('='.repeat(88));
  if (failureCount > 0) {
    console.error(`FAIL summary: ${failureCount} leadership account(s) need correction before launch`);
    process.exit(1);
  }

  console.log('PASS summary: all leadership accounts satisfy blocker #3 checks');
}

main().catch((error) => {
  console.error(`FAIL unexpected error: ${error.message || error}`);
  process.exit(1);
});