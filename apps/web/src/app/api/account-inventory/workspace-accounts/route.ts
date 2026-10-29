import { getActiveUserRole } from '@/lib/auth/active-role';
import { getLoginUrl } from '@/lib/auth/redirect-config';
import { logActivity } from '@/lib/audit';
import { sendUserInviteEmail } from '@/lib/email';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { WORKSPACE_VALUES } from '@/lib/workspace-access';
import type { User } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const grantSchema = z.object({
  workspace: z.enum(WORKSPACE_VALUES),
  accessLevel: z.enum(['read', 'write']),
});

const inviteSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(2).max(120),
  purpose: z.string().trim().min(10).max(500),
  grants: z.array(grantSchema).min(1).max(WORKSPACE_VALUES.length),
});

const updateSchema = z.object({
  userId: z.string().uuid(),
  purpose: z.string().trim().min(10).max(500),
  grants: z.array(grantSchema).min(1).max(WORKSPACE_VALUES.length),
});

async function requireSuperAdmin(): Promise<
  { userId: string } | { error: 'Unauthorized' | 'Forbidden'; status: number }
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: 'Unauthorized', status: 401 };
  const role = await getActiveUserRole(data.user.id);
  if (role !== 'super_admin') return { error: 'Forbidden', status: 403 };
  return { userId: data.user.id };
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string
): Promise<User | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = (data.users ?? []).find(
      (user) => user.email?.trim().toLowerCase() === email
    );
    if (match) return match;
    if ((data.users ?? []).length < 200) return null;
  }
}

function generateTemporaryPassword(): string {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghjkmnpqrstuvwxyz', '23456789', '!@#$%&*'];
  const all = groups.join('');
  const required = groups.map((group) => group[Math.floor(Math.random() * group.length)]);
  while (required.length < 12) required.push(all[Math.floor(Math.random() * all.length)]);
  return required.sort(() => Math.random() - 0.5).join('');
}

function normalizeGrants(grants: z.infer<typeof grantSchema>[]) {
  return [...new Map(grants.map((grant) => [grant.workspace, grant])).values()];
}

export async function GET() {
  const authorization = await requireSuperAdmin();
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const admin = createSupabaseAdminClient();
  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, status, account_purpose, sponsor_user_id, created_at')
    .eq('account_kind', 'workspace')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (usersError) {
    return NextResponse.json({ error: 'Failed to load workspace accounts' }, { status: 500 });
  }

  const userIds = (users ?? []).map((user) => user.id);
  const { data: grants, error: grantsError } = userIds.length
    ? await admin
        .from('workspace_access_grants')
        .select('user_id, workspace, access_level')
        .in('user_id', userIds)
        .is('deleted_at', null)
    : { data: [], error: null };
  if (grantsError) {
    return NextResponse.json({ error: 'Failed to load workspace grants' }, { status: 500 });
  }

  const authUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authById = new Map((authUsers.data.users ?? []).map((user) => [user.id, user]));
  return NextResponse.json({
    data: (users ?? []).map((user) => ({
      ...user,
      email: authById.get(user.id)?.email ?? null,
      displayName:
        typeof authById.get(user.id)?.user_metadata?.full_name === 'string'
          ? authById.get(user.id)?.user_metadata.full_name
          : null,
      grants: (grants ?? [])
        .filter((grant) => grant.user_id === user.id)
        .map((grant) => ({ workspace: grant.workspace, accessLevel: grant.access_level })),
    })),
  });
}

export async function POST(request: NextRequest) {
  const authorization = await requireSuperAdmin();
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid workspace invitation', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const email = parsed.data.email.toLowerCase();
  if (await findAuthUserByEmail(admin, email)) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      db_role: 'workspace_user',
      account_kind: 'workspace',
    },
    user_metadata: { full_name: parsed.data.displayName, role: 'workspace_user' },
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: 'Failed to create authentication account' }, { status: 500 });
  }

  const userId = created.user.id;
  const { error: userError } = await admin.from('users').insert({
    id: userId,
    role: 'workspace_user',
    status: 'active',
    account_kind: 'workspace',
    account_purpose: parsed.data.purpose,
    sponsor_user_id: authorization.userId,
    created_by: authorization.userId,
    department_id: null,
    division_id: null,
  });
  if (userError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Failed to create workspace identity' }, { status: 500 });
  }

  const grants = normalizeGrants(parsed.data.grants);
  const { error: grantError } = await admin.from('workspace_access_grants').insert(
    grants.map((grant) => ({
      user_id: userId,
      workspace: grant.workspace,
      access_level: grant.accessLevel,
      granted_by: authorization.userId,
    }))
  );
  if (grantError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Failed to grant workspace access' }, { status: 500 });
  }

  void logActivity(admin, {
    userId: authorization.userId,
    action: 'invite_workspace_user',
    tableName: 'users',
    recordId: userId,
    metadata: { email, purpose: parsed.data.purpose, grants },
  });

  const emailResult = await sendUserInviteEmail({
    to: email,
    firstName: parsed.data.displayName,
    role: 'workspace_user',
    temporaryPassword,
    loginUrl: getLoginUrl(),
    requiresOnboarding: false,
  });

  return NextResponse.json(
    {
      data: {
        userId,
        email,
        temporaryPassword,
        grants,
        emailSent: emailResult.sent,
      },
    },
    { status: 201 }
  );
}

export async function PUT(request: NextRequest) {
  const authorization = await requireSuperAdmin();
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid workspace access update' }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { data: target } = await admin
    .from('users')
    .select('id')
    .eq('id', parsed.data.userId)
    .eq('account_kind', 'workspace')
    .is('deleted_at', null)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Workspace account not found' }, { status: 404 });

  const changedAt = new Date().toISOString();
  const { error: revokeError } = await admin
    .from('workspace_access_grants')
    .update({ deleted_at: changedAt, updated_at: changedAt })
    .eq('user_id', target.id)
    .is('deleted_at', null);
  if (revokeError) return NextResponse.json({ error: 'Failed to replace grants' }, { status: 500 });

  const grants = normalizeGrants(parsed.data.grants);
  const { error: insertError } = await admin.from('workspace_access_grants').insert(
    grants.map((grant) => ({
      user_id: target.id,
      workspace: grant.workspace,
      access_level: grant.accessLevel,
      granted_by: authorization.userId,
    }))
  );
  if (insertError) return NextResponse.json({ error: 'Failed to replace grants' }, { status: 500 });
  await admin
    .from('users')
    .update({ account_purpose: parsed.data.purpose, sponsor_user_id: authorization.userId })
    .eq('id', target.id);
  void logActivity(admin, {
    userId: authorization.userId,
    action: 'update_workspace_access',
    tableName: 'users',
    recordId: target.id,
    metadata: { purpose: parsed.data.purpose, grants },
  });
  return NextResponse.json({ data: { userId: target.id, grants } });
}

export async function DELETE(request: NextRequest) {
  const authorization = await requireSuperAdmin();
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  const parsed = z.object({ userId: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const revokedAt = new Date().toISOString();
  const { data: target, error } = await admin
    .from('users')
    .update({ status: 'inactive', updated_at: revokedAt })
    .eq('id', parsed.data.userId)
    .eq('account_kind', 'workspace')
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error || !target) return NextResponse.json({ error: 'Workspace account not found' }, { status: 404 });
  await admin
    .from('workspace_access_grants')
    .update({ deleted_at: revokedAt, updated_at: revokedAt })
    .eq('user_id', target.id)
    .is('deleted_at', null);
  void logActivity(admin, {
    userId: authorization.userId,
    action: 'revoke_workspace_access',
    tableName: 'users',
    recordId: target.id,
  });
  return NextResponse.json({ data: { userId: target.id, status: 'inactive' } });
}
