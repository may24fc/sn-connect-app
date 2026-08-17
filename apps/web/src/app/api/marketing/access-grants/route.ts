import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMarketingAuthedContext, hasMarketingAccess, isMarketingAdmin } from '@/app/api/marketing/_lib';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const grantSchema = z.object({
  userId: z.string().uuid('User id must be a valid UUID'),
  platformId: z.string().uuid('Platform id must be a valid UUID'),
  canSubmit: z.boolean().optional().default(true),
  canViewOverview: z.boolean().optional().default(true),
});

const revokeGrantSchema = z.object({
  userId: z.string().uuid('User id must be a valid UUID'),
  platformId: z.string().uuid('Platform id must be a valid UUID'),
});

async function listMarketingAccessGrants(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  platformId?: string
) {
  let grantQuery = admin
    .from('marketing_access_grants')
    .select('id, user_id, platform_id, can_submit, can_view_overview, created_at, marketing_platforms(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (platformId) {
    grantQuery = grantQuery.eq('platform_id', platformId);
  }

  const { data: grantRows, error: grantError } = await grantQuery;

  if (grantError) {
    throw grantError;
  }

  const grants = grantRows ?? [];
  const userIds = [...new Set(grants.map((grant) => grant.user_id).filter(Boolean))];

  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, role')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
    .is('deleted_at', null);

  if (usersError) {
    throw usersError;
  }

  const { data: directoryRows, error: directoryError } = await admin
    .from('employee_directory')
    .select('user_id, full_name, email, position, department_name')
    .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

  if (directoryError) {
    throw directoryError;
  }

  const roleByUserId = new Map((users ?? []).map((user) => [user.id, user.role]));
  const directoryByUserId = new Map(
    (directoryRows ?? []).map((row) => [row.user_id, row] as const)
  );

  return grants.map((grant) => {
    const profile = directoryByUserId.get(grant.user_id);
    return {
      id: grant.id,
      userId: grant.user_id,
      platformId: grant.platform_id,
      platformName: (grant.marketing_platforms as { name?: string } | null)?.name ?? 'Unknown platform',
      canSubmit: Boolean(grant.can_submit),
      canViewOverview: Boolean(grant.can_view_overview),
      role: roleByUserId.get(grant.user_id) ?? null,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      position: profile?.position ?? null,
      departmentName: profile?.department_name ?? null,
      createdAt: grant.created_at,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getMarketingAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasMarketingAccess(auth.role, auth.hasAccessGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = auth.supabaseAdmin;
    const platformIdParam = request.nextUrl.searchParams.get('platformId');
    const platformId = platformIdParam && z.string().uuid().safeParse(platformIdParam).success
      ? platformIdParam
      : undefined;
    const data = await listMarketingAccessGrants(admin, platformId);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/marketing/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getMarketingAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isMarketingAdmin(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = grantSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const admin = auth.supabaseAdmin;

    const { data: targetUser, error: targetUserError } = await admin
      .from('users')
      .select('id, role, deleted_at')
      .eq('id', payload.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (targetUserError) {
      console.error('Failed to validate marketing access user:', targetUserError);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 500 });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: platform, error: platformError } = await admin
      .from('marketing_platforms')
      .select('id, name')
      .eq('id', payload.platformId)
      .is('deleted_at', null)
      .maybeSingle();

    if (platformError) {
      console.error('Failed to load marketing platform:', platformError);
      return NextResponse.json({ error: 'Failed to validate platform' }, { status: 500 });
    }

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 });
    }

    const { data: existingGrant, error: existingGrantError } = await admin
      .from('marketing_access_grants')
      .select('id')
      .eq('user_id', payload.userId)
      .eq('platform_id', payload.platformId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingGrantError) {
      console.error('Failed to check marketing grant existence:', existingGrantError);
      return NextResponse.json({ error: 'Failed to validate grant state' }, { status: 500 });
    }

    if (existingGrant) {
      return NextResponse.json({ error: 'Grant already exists for this user and platform' }, { status: 409 });
    }

    const { data: insertedGrant, error: insertError } = await admin
      .from('marketing_access_grants')
      .insert({
        user_id: payload.userId,
        platform_id: payload.platformId,
        can_submit: payload.canSubmit,
        can_view_overview: payload.canViewOverview,
        created_by: auth.user.id,
      })
      .select('id, user_id, platform_id, can_submit, can_view_overview, created_at')
      .single();

    if (insertError || !insertedGrant) {
      console.error('Failed to create marketing access grant:', insertError);
      return NextResponse.json({ error: 'Failed to create grant' }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: await listMarketingAccessGrants(admin, payload.platformId),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/marketing/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getMarketingAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isMarketingAdmin(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = revokeGrantSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const admin = auth.supabaseAdmin;
    const deletedAt = new Date().toISOString();

    const { data: grant, error: revokeError } = await admin
      .from('marketing_access_grants')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('user_id', payload.userId)
      .eq('platform_id', payload.platformId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (revokeError || !grant) {
      console.error('Failed to revoke marketing access grant:', revokeError);
      return NextResponse.json({ error: 'Failed to revoke grant' }, { status: 500 });
    }

    return NextResponse.json({ data: await listMarketingAccessGrants(admin, payload.platformId) });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/marketing/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
