import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedSupabase, isJobAdmin, listAtsAccessGrants } from '@/app/api/jobs/_lib';

const createGrantSchema = z.object({
  userId: z.string().uuid('User id must be a valid UUID'),
});

export async function GET() {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: await listAtsAccessGrants() });
  } catch (error) {
    console.error('Unexpected error in GET /api/ats/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = createGrantSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: targetUser, error: targetUserError } = await admin
      .from('users')
      .select('id, role, deleted_at')
      .eq('id', parsed.data.userId)
      .maybeSingle();

    if (targetUserError) {
      console.error('Failed to load ATS grant target user:', targetUserError);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 500 });
    }

    if (!targetUser || targetUser.deleted_at) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['employee', 'intern'].includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only employee or intern users can receive ATS access grants' },
        { status: 400 },
      );
    }

    const { data: existingGrant } = await admin
      .from('ats_access_grants')
      .select('id')
      .eq('user_id', parsed.data.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingGrant?.id) {
      return NextResponse.json({ error: 'ATS access is already granted for this user' }, { status: 409 });
    }

    const { data: insertedGrant, error: insertError } = await admin
      .from('ats_access_grants')
      .insert({
        user_id: parsed.data.userId,
        granted_by: user.id,
        access_level: 'full',
      })
      .select('id')
      .single();

    if (insertError || !insertedGrant) {
      console.error('Failed to create ATS access grant:', insertError);
      return NextResponse.json({ error: 'Failed to create ATS access grant' }, { status: 500 });
    }

    logActivity(admin, {
      userId: user.id,
      action: 'grant_ats_access',
      tableName: 'ats_access_grants',
      recordId: insertedGrant.id,
      metadata: { grantedUserId: parsed.data.userId },
    });

    return NextResponse.json({ data: await listAtsAccessGrants() }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/ats/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = createGrantSchema.safeParse(await request.json().catch(() => ({})));
    const userId = parsed.success ? parsed.data.userId : request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const deletedAt = new Date().toISOString();

    const { data: grant, error: revokeError } = await admin
      .from('ats_access_grants')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (revokeError || !grant) {
      console.error('Failed to revoke ATS access grant:', revokeError);
      return NextResponse.json({ error: 'Failed to revoke ATS access grant' }, { status: 500 });
    }

    logActivity(admin, {
      userId: user.id,
      action: 'revoke_ats_access',
      tableName: 'ats_access_grants',
      recordId: grant.id,
      metadata: { revokedUserId: userId },
    });

    return NextResponse.json({ data: await listAtsAccessGrants() });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/ats/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}