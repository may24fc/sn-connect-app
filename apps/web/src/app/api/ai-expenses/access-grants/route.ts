import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AI_SPENDING_GRANTABLE_ROLES,
  getAiSpendingAuth,
  isAiSpendingAdmin,
  listAiSpendingAccessGrants,
} from '@/app/api/ai-expenses/_lib';

const createGrantSchema = z.object({
  userId: z.string().uuid('User id must be a valid UUID'),
});

export async function GET() {
  try {
    const { user, role, error } = await getAiSpendingAuth();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiSpendingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: await listAiSpendingAccessGrants() });
  } catch (error) {
    console.error('Unexpected error in GET /api/ai-expenses/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, error } = await getAiSpendingAuth();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiSpendingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = createGrantSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: targetUser, error: targetUserError } = await admin
      .from('users')
      .select('id, role, status, deleted_at')
      .eq('id', parsed.data.userId)
      .maybeSingle();

    if (targetUserError) {
      console.error('Failed to load AI spending grant target user:', targetUserError);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 500 });
    }

    if (!targetUser || targetUser.deleted_at) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!AI_SPENDING_GRANTABLE_ROLES.includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only employee or associate users can receive AI Spending access grants' },
        { status: 400 }
      );
    }

    if (targetUser.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active employee or associate users can receive AI Spending access grants' },
        { status: 400 }
      );
    }

    const { data: existingGrant } = await admin
      .from('ai_spending_access_grants')
      .select('id')
      .eq('user_id', parsed.data.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingGrant?.id) {
      return NextResponse.json({ error: 'AI Spending access is already granted for this user' }, { status: 409 });
    }

    const { data: insertedGrant, error: insertError } = await admin
      .from('ai_spending_access_grants')
      .insert({
        user_id: parsed.data.userId,
        granted_by: user.id,
        access_level: 'full',
      })
      .select('id')
      .single();

    if (insertError || !insertedGrant) {
      console.error('Failed to create AI spending access grant:', insertError);
      return NextResponse.json({ error: 'Failed to create AI Spending access grant' }, { status: 500 });
    }

    logActivity(admin, {
      userId: user.id,
      action: 'grant_ai_spending_access',
      tableName: 'ai_spending_access_grants',
      recordId: insertedGrant.id,
      metadata: { grantedUserId: parsed.data.userId },
    });

    return NextResponse.json({ data: await listAiSpendingAccessGrants() }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/ai-expenses/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, role, error } = await getAiSpendingAuth();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiSpendingAdmin(role)) {
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
      .from('ai_spending_access_grants')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (revokeError || !grant) {
      console.error('Failed to revoke AI spending access grant:', revokeError);
      return NextResponse.json({ error: 'Failed to revoke AI Spending access grant' }, { status: 500 });
    }

    logActivity(admin, {
      userId: user.id,
      action: 'revoke_ai_spending_access',
      tableName: 'ai_spending_access_grants',
      recordId: grant.id,
      metadata: { revokedUserId: userId },
    });

    return NextResponse.json({ data: await listAiSpendingAccessGrants() });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/ai-expenses/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
