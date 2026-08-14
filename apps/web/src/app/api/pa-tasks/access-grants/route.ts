import { logActivity } from '@/lib/audit';
import { paTaskAccessGrantCreateSchema } from '@/lib/schemas/pa-task.schema';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  canAssignPaTaskRole,
  getPaTaskAuthedContext,
  getPaTaskWriteErrorMessage,
  listPaTaskAccessGrants,
} from '../_lib';

const deleteAccessGrantSchema = z.object({
  userId: z.string().uuid('A valid user is required'),
});

export async function GET() {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.context.canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: await listPaTaskAccessGrants() });
  } catch (error) {
    console.error('Unexpected error in GET /api/pa-tasks/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canManage } = auth.context;
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = paTaskAccessGrantCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, accessLevel } = parsed.data;
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (targetError) {
      console.error('Failed to load PA task grant target user:', targetError);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 500 });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!canAssignPaTaskRole(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only employee or associate users can receive PA task grants' },
        { status: 400 }
      );
    }

    const { data: existingGrant } = await supabaseAdmin
      .from('pa_task_access_grants')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingGrant?.id) {
      return NextResponse.json({ error: 'PA task access is already granted for this user' }, { status: 409 });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('pa_task_access_grants')
      .insert({
        user_id: userId,
        access_level: accessLevel,
        granted_by: user.id,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('Failed to create PA task access grant:', insertError);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(insertError) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'grant_pa_task_access',
      tableName: 'pa_task_access_grants',
      recordId: inserted.id,
      metadata: { grantedUserId: userId, accessLevel },
    });

    return NextResponse.json({ data: await listPaTaskAccessGrants() }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pa-tasks/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canManage } = auth.context;
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = deleteAccessGrantSchema.safeParse(body);
    const userId =
      parsed.success ? parsed.data.userId : request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const deletedAt = new Date().toISOString();
    const { data: grant, error } = await supabaseAdmin
      .from('pa_task_access_grants')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (error || !grant) {
      console.error('Failed to revoke PA task access grant:', error);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'revoke_pa_task_access',
      tableName: 'pa_task_access_grants',
      recordId: grant.id,
      metadata: { revokedUserId: userId },
    });

    return NextResponse.json({ data: await listPaTaskAccessGrants() });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/pa-tasks/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
