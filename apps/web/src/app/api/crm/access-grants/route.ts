import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  CRM_TRACKER_VALUES,
  type CrmTrackerKey,
  getCrmAuthedContext,
  isCrmAdmin,
  listCrmAccessGrants,
} from '../_lib';

const grantSchema = z.object({
  userId: z.string().uuid('User id must be a valid UUID'),
  tracker: z.enum(CRM_TRACKER_VALUES),
});

function getTrackerQueryParam(value: string | null): CrmTrackerKey | null {
  if (!value) {
    return null;
  }

  return CRM_TRACKER_VALUES.includes(value as CrmTrackerKey) ? (value as CrmTrackerKey) : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCrmAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isCrmAdmin(auth.context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tracker = getTrackerQueryParam(request.nextUrl.searchParams.get('tracker'));

    return NextResponse.json({ data: await listCrmAccessGrants(tracker ?? undefined) });
  } catch (error) {
    console.error('Unexpected error in GET /api/crm/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCrmAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isCrmAdmin(auth.context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = grantSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, tracker } = parsed.data;
    const admin = createSupabaseAdminClient();

    const { data: targetUser, error: targetUserError } = await admin
      .from('users')
      .select('id, role, deleted_at')
      .eq('id', userId)
      .maybeSingle();

    if (targetUserError) {
      console.error('Failed to load CRM grant target user:', targetUserError);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 500 });
    }

    if (!targetUser || targetUser.deleted_at) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['employee', 'associate'].includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only employee or associate users can receive CRM access grants' },
        { status: 400 },
      );
    }

    const { data: existingGrant } = await admin
      .from('crm_access_grants')
      .select('id')
      .eq('user_id', userId)
      .eq('tracker', tracker)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingGrant?.id) {
      return NextResponse.json({ error: 'CRM access is already granted for this user and tracker' }, { status: 409 });
    }

    const { data: insertedGrant, error: insertError } = await admin
      .from('crm_access_grants')
      .insert({
        user_id: userId,
        tracker,
        granted_by: auth.context.user.id,
      })
      .select('id')
      .single();

    if (insertError || !insertedGrant) {
      console.error('Failed to create CRM access grant:', insertError);
      return NextResponse.json({ error: 'Failed to create CRM access grant' }, { status: 500 });
    }

    void logActivity(admin, {
      userId: auth.context.user.id,
      action: 'grant_crm_access',
      tableName: 'crm_access_grants',
      recordId: insertedGrant.id,
      metadata: { grantedUserId: userId, tracker },
    });

    return NextResponse.json({ data: await listCrmAccessGrants(tracker) }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/crm/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getCrmAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isCrmAdmin(auth.context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = grantSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, tracker } = parsed.data;
    const admin = createSupabaseAdminClient();
    const deletedAt = new Date().toISOString();

    const { data: grant, error: revokeError } = await admin
      .from('crm_access_grants')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('user_id', userId)
      .eq('tracker', tracker)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (revokeError || !grant) {
      console.error('Failed to revoke CRM access grant:', revokeError);
      return NextResponse.json({ error: 'Failed to revoke CRM access grant' }, { status: 500 });
    }

    void logActivity(admin, {
      userId: auth.context.user.id,
      action: 'revoke_crm_access',
      tableName: 'crm_access_grants',
      recordId: grant.id,
      metadata: { revokedUserId: userId, tracker },
    });

    return NextResponse.json({ data: await listCrmAccessGrants(tracker) });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/crm/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
