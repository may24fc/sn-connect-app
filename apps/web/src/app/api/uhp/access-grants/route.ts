import { logActivity } from '@/lib/audit';
import { uhpAccessGrantSchema } from '@/lib/schemas/uhp.schema';
import { UHP_MODULE_VALUES, type UhpModule } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { getUhpAuthedContext, isUhpAdmin } from '../_lib';

async function listGrants(module?: UhpModule) {
  const auth = await getUhpAuthedContext();
  if (!auth.ok) return auth;
  let query = auth.context.admin
    .from('uhp_access_grants')
    .select('id, user_id, module, granted_by, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (module) query = query.eq('module', module);
  const { data: grants, error } = await query;
  if (error) throw error;

  const userIds = [...new Set((grants ?? []).map((grant) => grant.user_id))];
  const { data: employees } = userIds.length
    ? await auth.context.admin
        .from('employees')
        .select('user_id, first_name, middle_name, last_name, department, position')
        .in('user_id', userIds)
        .is('deleted_at', null)
    : { data: [] };
  const { data: users } = userIds.length
    ? await auth.context.admin
        .from('users')
        .select('id, role')
        .in('id', userIds)
        .is('deleted_at', null)
    : { data: [] };
  const employeeByUserId = new Map(
    (employees ?? []).map((employee) => [employee.user_id, employee])
  );
  const roleById = new Map((users ?? []).map((user) => [user.id, user.role]));

  return {
    ok: true as const,
    data: (grants ?? []).map((grant) => {
      const employee = employeeByUserId.get(grant.user_id);
      return {
        id: grant.id,
        userId: grant.user_id,
        module: grant.module,
        grantedBy: grant.granted_by,
        grantedAt: grant.created_at,
        fullName: employee
          ? [employee.first_name, employee.middle_name, employee.last_name]
              .filter(Boolean)
              .join(' ')
          : 'UHP member',
        role: roleById.get(grant.user_id) ?? null,
        department: employee?.department ?? null,
        position: employee?.position ?? null,
      };
    }),
  };
}

function parseModule(value: string | null): UhpModule | undefined {
  return UHP_MODULE_VALUES.includes(value as UhpModule) ? (value as UhpModule) : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await getUhpAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isUhpAdmin(auth.context.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const result = await listGrants(parseModule(request.nextUrl.searchParams.get('module')));
    return NextResponse.json({ data: result.ok ? result.data : [] });
  } catch (error) {
    console.error('Failed to list UHP grants:', error);
    return NextResponse.json({ error: 'Failed to list UHP access grants' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getUhpAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isUhpAdmin(auth.context.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = uhpAccessGrantSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const { data: user } = await auth.context.admin
    .from('users')
    .select('id, role, status, deleted_at')
    .eq('id', parsed.data.userId)
    .maybeSingle();
  if (!user || user.deleted_at)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (
    !['employee', 'associate'].includes(user.role) ||
    ['terminated', 'inactive'].includes(user.status)
  ) {
    return NextResponse.json(
      { error: 'Only active employee or associate accounts are eligible' },
      { status: 400 }
    );
  }

  const { data: oldGrant } = await auth.context.admin
    .from('uhp_access_grants')
    .select('id')
    .eq('user_id', parsed.data.userId)
    .eq('module', parsed.data.module)
    .not('deleted_at', 'is', null)
    .maybeSingle();
  const now = new Date().toISOString();
  const result = oldGrant
    ? await auth.context.admin
        .from('uhp_access_grants')
        .update({ deleted_at: null, granted_by: auth.context.userId, updated_at: now })
        .eq('id', oldGrant.id)
        .select('id')
        .single()
    : await auth.context.admin
        .from('uhp_access_grants')
        .insert({
          user_id: parsed.data.userId,
          module: parsed.data.module,
          granted_by: auth.context.userId,
        })
        .select('id')
        .single();
  if (result.error) return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });

  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'grant_uhp_access',
    tableName: 'uhp_access_grants',
    recordId: result.data.id,
    metadata: parsed.data,
  });
  const grants = await listGrants(parsed.data.module);
  return NextResponse.json({ data: grants.ok ? grants.data : [] }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await getUhpAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isUhpAdmin(auth.context.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = uhpAccessGrantSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  const now = new Date().toISOString();
  const { data, error } = await auth.context.admin
    .from('uhp_access_grants')
    .update({ deleted_at: now, updated_at: now })
    .eq('user_id', parsed.data.userId)
    .eq('module', parsed.data.module)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data)
    return NextResponse.json({ error: 'Active grant not found' }, { status: 404 });
  void logActivity(auth.context.admin, {
    userId: auth.context.userId,
    action: 'revoke_uhp_access',
    tableName: 'uhp_access_grants',
    recordId: data.id,
    metadata: parsed.data,
  });
  const grants = await listGrants(parsed.data.module);
  return NextResponse.json({ data: grants.ok ? grants.data : [] });
}
