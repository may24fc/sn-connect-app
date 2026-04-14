import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext, isOnboardingAdmin, maskPaymentAccount } from '../../_lib';

function deriveReviewState(row: {
  is_completed: boolean;
  review_state: string | null;
  users?: { status?: string | null } | Array<{ status?: string | null }> | null;
}) {
  const userInfo = Array.isArray(row.users) ? row.users[0] : row.users;

  if (!row.is_completed) {
    return 'in_progress';
  }

  if (userInfo?.status === 'active') {
    return 'approved';
  }

  if (row.review_state === 'rejected') {
    return 'rejected';
  }

  return 'awaiting_review';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOnboardingContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOnboardingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: queryError } = await supabase
      .from('onboarding_profiles')
      .select('*, users!inner(id, role, status), departments(id, name)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch onboarding profile' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const fullName = [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ');

    let resolvedPaymentBankName =
      typeof data.payment_bank_name === 'string' ? data.payment_bank_name.trim() : '';

    if (!resolvedPaymentBankName && typeof data.payment_bank_id === 'string') {
      const { data: bankRow } = await supabase
        .from('bank_registry')
        .select('bank_name')
        .eq('id', data.payment_bank_id)
        .maybeSingle();

      resolvedPaymentBankName =
        typeof bankRow?.bank_name === 'string' ? bankRow.bank_name.trim() : '';
    }

    return NextResponse.json({
      data: {
        ...data,
        payment_bank_name: resolvedPaymentBankName || data.payment_bank_name,
        full_name: fullName,
        status: data.is_completed ? 'completed' : 'in_progress',
        review_state: deriveReviewState(data),
        payment_account_masked: maskPaymentAccount(data.payment_account_number),
      },
    });
  } catch (error) {
    console.error('GET /api/onboarding/profiles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOnboardingContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOnboardingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('onboarding_profiles')
      .select('id, user_id, is_completed, review_state, users!inner(status)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to fetch rejected onboarding submission for deletion:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch onboarding submission' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json({ error: 'Onboarding submission not found' }, { status: 404 });
    }

    if (deriveReviewState(profile) !== 'rejected') {
      return NextResponse.json(
        { error: 'Only rejected onboarding submissions can be deleted' },
        { status: 400 }
      );
    }

    const { error: resetStatusError } = await supabaseAdmin
      .from('users')
      .update({ status: 'pending_onboarding' })
      .eq('id', profile.user_id)
      .is('deleted_at', null);

    if (resetStatusError) {
      console.error('Failed to reset user status before deleting onboarding submission:', resetStatusError);
      return NextResponse.json(
        { error: 'Failed to reset user onboarding state' },
        { status: 500 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('onboarding_profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete rejected onboarding submission:', deleteError);

      const { error: rollbackError } = await supabaseAdmin
        .from('users')
        .update({ status: 'awaiting_approval' })
        .eq('id', profile.user_id)
        .is('deleted_at', null);

      if (rollbackError) {
        console.error('Failed to rollback user status after onboarding delete failure:', rollbackError);
      }

      return NextResponse.json(
        { error: 'Failed to delete onboarding submission' },
        { status: 500 }
      );
    }

    await logActivity(supabase, {
      userId: user.id,
      action: 'delete_rejected_onboarding_submission',
      tableName: 'onboarding_profiles',
      recordId: id,
      metadata: {
        userId: profile.user_id,
        previousReviewState: profile.review_state,
      },
    });

    return NextResponse.json({
      message: 'Rejected onboarding submission deleted successfully',
      data: {
        profileId: id,
        userId: profile.user_id,
        status: 'pending_onboarding',
      },
    });
  } catch (error) {
    console.error('DELETE /api/onboarding/profiles/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
