import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) flags.add(argument);
    else {
      values.set(argument, next);
      index += 1;
    }
  }
  return { values, flags };
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing environment file: ${filePath}`);
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

async function listAllAuthUsers(client) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data?.users ?? []));
    if ((data?.users ?? []).length < 200) return users;
  }
}

const { values, flags } = parseArgs(process.argv.slice(2));
const envFile = values.get('--env-file') ?? 'apps/web/.env.local';
const expectedProjectRef = values.get('--expected-project-ref');
if (!expectedProjectRef) throw new Error('--expected-project-ref is required');

const env = loadEnv(envFile);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? '';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const expectedHost = `${expectedProjectRef}.supabase.co`;
if (!supabaseUrl || new URL(supabaseUrl).hostname !== expectedHost) {
  throw new Error(`Refusing target: expected ${expectedHost}`);
}
if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const authUsers = await listAllAuthUsers(admin);
const authById = new Map(authUsers.map((user) => [user.id, user]));
const authByEmail = new Map(
  authUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user])
);
const { data: leaders, error: leadersError } = await admin
  .from('users')
  .select('id, role, status, account_kind, account_purpose, sponsor_user_id, deleted_at')
  .in('role', ['admin', 'super_admin'])
  .is('deleted_at', null)
  .order('role')
  .order('id');
if (leadersError) throw leadersError;

if (flags.has('--list')) {
  console.table(
    (leaders ?? []).map((leader) => {
      const authUser = authById.get(leader.id);
      return {
        id: leader.id,
        email: authUser?.email ?? null,
        name: authUser?.user_metadata?.full_name ?? null,
        role: leader.role,
        status: leader.status,
        account_kind: leader.account_kind,
      };
    })
  );
  process.exit(0);
}

const targetEmail = (values.get('--target-email') ?? '').toLowerCase();
const actorEmail = (values.get('--actor-email') ?? '').toLowerCase();
const purpose = (values.get('--purpose') ?? '').trim();
const confirmation = (values.get('--confirm-email') ?? '').toLowerCase();
if (!targetEmail || !actorEmail || !purpose) {
  throw new Error('--target-email, --actor-email, and --purpose are required');
}

const targetAuth = authByEmail.get(targetEmail);
const actorAuth = authByEmail.get(actorEmail);
const target = (leaders ?? []).find((leader) => leader.id === targetAuth?.id);
const actor = (leaders ?? []).find((leader) => leader.id === actorAuth?.id);
if (!targetAuth || !target || !['admin', 'super_admin'].includes(target.role)) {
  throw new Error('Target is not an active leadership identity');
}
if (!actorAuth || !actor || actor.role !== 'super_admin' || actor.status !== 'active') {
  throw new Error('Audit actor must be an active super_admin');
}

console.table([
  {
    target_email: targetEmail,
    target_name: targetAuth.user_metadata?.full_name ?? null,
    role: target.role,
    previous_account_kind: target.account_kind,
    requested_account_kind: 'privileged',
    actor_email: actorEmail,
    purpose,
  },
]);
if (!flags.has('--apply')) {
  if (flags.has('--verify')) {
    const [{ data: directoryRows, error: directoryError }, { data: auditRows, error: auditError }] =
      await Promise.all([
        admin.from('employee_directory').select('user_id').eq('user_id', target.id),
        admin
          .from('audit_logs')
          .select('id, performed_by, action, new_values')
          .eq('record_id', target.id)
          .eq('action', 'classify_account')
          .order('performed_at', { ascending: false })
          .limit(1),
      ]);
    if (directoryError) throw directoryError;
    if (auditError) throw auditError;
    const verified =
      target.account_kind === 'privileged' &&
      targetAuth.app_metadata?.account_kind === 'privileged' &&
      (directoryRows ?? []).length === 0 &&
      auditRows?.[0]?.performed_by === actor.id &&
      auditRows?.[0]?.new_values?.account_kind === 'privileged';
    console.table([
      {
        database_account_kind: target.account_kind,
        auth_account_kind: targetAuth.app_metadata?.account_kind ?? null,
        workforce_directory_rows: (directoryRows ?? []).length,
        audit_event_present: Boolean(auditRows?.[0]),
      },
    ]);
    if (!verified) throw new Error('Production classification verification failed');
    console.info(`Verified ${targetEmail} as privileged and absent from employee_directory.`);
  } else {
    console.info('Dry run only. Add --apply and --confirm-email with the exact target email.');
  }
  process.exit(0);
}
if (confirmation !== targetEmail) throw new Error('--confirm-email must exactly match --target-email');

const previousMetadata = targetAuth.app_metadata ?? {};
const { error: updateError } = await admin
  .from('users')
  .update({ account_kind: 'privileged', account_purpose: purpose, sponsor_user_id: actor.id })
  .eq('id', target.id)
  .eq('account_kind', target.account_kind);
if (updateError) throw updateError;

const { error: authError } = await admin.auth.admin.updateUserById(target.id, {
  app_metadata: { ...previousMetadata, account_kind: 'privileged' },
});
if (authError) {
  await admin
    .from('users')
    .update({
      account_kind: target.account_kind,
      account_purpose: target.account_purpose,
      sponsor_user_id: target.sponsor_user_id,
    })
    .eq('id', target.id);
  throw new Error(`Auth metadata update failed; database update rolled back: ${authError.message}`);
}

const { error: auditError } = await admin.from('audit_logs').insert({
  table_name: 'users',
  record_id: target.id,
  operation: 'UPDATE',
  performed_by: actor.id,
  action: 'classify_account',
  old_values: { account_kind: target.account_kind, account_purpose: target.account_purpose },
  new_values: { account_kind: 'privileged', account_purpose: purpose },
  metadata: { source: 'guarded_ops_script', target_email: targetEmail },
});
if (auditError) throw new Error(`Classification changed but audit insert failed: ${auditError.message}`);

console.info(`Reclassified ${targetEmail} as privileged and recorded the audit event.`);
