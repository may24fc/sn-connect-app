import { getActiveUserRole } from '@/lib/auth/active-role';
import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const classificationSchema = z
  .object({
    userId: z.string().uuid(),
    accountKind: z.enum(['workforce', 'privileged']),
    purpose: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.accountKind === 'privileged' && (value.purpose?.length ?? 0) < 10) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['purpose'],
        message: 'A purpose of at least 10 characters is required',
      });
    }
  });

async function requireSuperAdmin(): Promise<
  { userId: string } | { error: 'Unauthorized' | 'Forbidden'; status: number }
> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: 'Unauthorized' as const, status: 401 };
  const role = await getActiveUserRole(authData.user.id);
  if (role !== 'super_admin') return { error: 'Forbidden' as const, status: 403 };
  return { userId: authData.user.id };
}

export async function GET() {
  const authorization = await requireSuperAdmin();
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const admin = createSupabaseAdminClient();
  const [inventoryResult, leadershipResult] = await Promise.all([
    admin
      .from('users')
      .select(
        'id, role, status, account_kind, account_purpose, sponsor_user_id, access_expires_at, created_at, deleted_at'
      )
      .neq('account_kind', 'workforce')
      .order('created_at', { ascending: false }),
    admin
      .from('users')
      .select('id, role, status, account_kind, account_purpose')
      .in('role', ['admin', 'super_admin'])
      .in('account_kind', ['workforce', 'privileged'])
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
  ]);
  if (inventoryResult.error || leadershipResult.error) {
    return NextResponse.json({ error: 'Failed to load account inventory' }, { status: 500 });
  }

  const authUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (authUsers.data.users ?? []).map((user) => [user.id, user.email ?? null])
  );
  return NextResponse.json({
    data: (inventoryResult.data ?? []).map((account) => ({
      ...account,
      email: emailById.get(account.id) ?? null,
    })),
    leadershipAccounts: (leadershipResult.data ?? []).map((account) => ({
      ...account,
      email: emailById.get(account.id) ?? null,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireSuperAdmin();
  if ('error' in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const parsed = classificationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid account classification', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: target, error: targetError } = await admin
    .from('users')
    .select('id, role, account_kind')
    .eq('id', parsed.data.userId)
    .is('deleted_at', null)
    .single();

  if (
    targetError ||
    !target ||
    !['admin', 'super_admin'].includes(target.role) ||
    !['workforce', 'privileged'].includes(target.account_kind)
  ) {
    return NextResponse.json({ error: 'Eligible leadership account not found' }, { status: 404 });
  }

  if (parsed.data.accountKind === 'workforce') {
    const { data: employee } = await admin
      .from('employees')
      .select('id')
      .eq('user_id', target.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!employee) {
      return NextResponse.json(
        { error: 'Create an employee profile before classifying this account as workforce' },
        { status: 409 }
      );
    }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({
      account_kind: parsed.data.accountKind,
      account_purpose: parsed.data.accountKind === 'privileged' ? parsed.data.purpose : null,
      sponsor_user_id:
        parsed.data.accountKind === 'privileged' ? authorization.userId : null,
    })
    .eq('id', target.id);
  if (updateError) {
    return NextResponse.json({ error: 'Failed to update account classification' }, { status: 500 });
  }

  logActivity(admin, {
    userId: authorization.userId,
    action: 'classify_account',
    tableName: 'users',
    recordId: target.id,
    metadata: {
      previousAccountKind: target.account_kind,
      accountKind: parsed.data.accountKind,
      purpose: parsed.data.accountKind === 'privileged' ? parsed.data.purpose : null,
    },
  });

  return NextResponse.json({
    data: {
      userId: target.id,
      accountKind: parsed.data.accountKind,
    },
  });
}
