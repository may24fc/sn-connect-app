import { logActivity } from '@/lib/audit';
import { createNotification, getUserDisplayName } from '@/lib/notifications/create-notification';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const expenseDecisionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional().nullable(),
});

async function verifyLeadershipRole(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('role, department_id')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (userError || !userData) {
    throw new Error('User not found');
  }

  const leadershipRoles = ['admin', 'super_admin'];
  if (leadershipRoles.includes(userData.role)) {
    return userData.role;
  }

  if (userData.role !== 'employee' && userData.role !== 'intern') {
    throw new Error('Forbidden');
  }

  const { data: isAccountingMember, error: accountingCheckError } = await adminClient.rpc(
    'user_is_accounting_member',
    {
      target_user_id: userId,
    }
  );

  if (!accountingCheckError && isAccountingMember) {
    return userData.role;
  }

  const departmentId = userData.department_id ?? null;
  if (!departmentId) {
    throw new Error('Forbidden');
  }

  const { data: departmentData, error: departmentError } = await adminClient
    .from('departments')
    .select('name')
    .eq('id', departmentId)
    .is('deleted_at', null)
    .maybeSingle();

  if (departmentError || !departmentData?.name) {
    throw new Error('Forbidden');
  }

  const normalizedDepartment = departmentData.name.trim().toLowerCase();
  if (normalizedDepartment.includes('accounting') || normalizedDepartment === 'finance') {
    return userData.role;
  }

  throw new Error('Forbidden');
}

/**
 * POST /api/expenses/[id]/decide
 * Exception review endpoint for Executive Leadership (Miss May and Steven).
 * Enforces admin authority, transitions state, and dispatches employee notifications.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role enforcement
    try {
      await verifyLeadershipRole(adminClient, user.id);
    } catch (roleErr) {
      const msg = roleErr instanceof Error ? roleErr.message : 'Forbidden';
      return NextResponse.json({ error: msg }, { status: msg === 'User not found' ? 404 : 403 });
    }

    // Retrieve original entry and check status
    const { data: expenseEntry, error: loadError } = await adminClient
      .from('expense_entries')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (loadError || !expenseEntry) {
      return NextResponse.json({ error: 'Expense entry not found' }, { status: 404 });
    }

    if (expenseEntry.processing_status !== 'leadership_review_required') {
      return NextResponse.json(
        { error: `Cannot review entry in processing state: ${expenseEntry.processing_status}` },
        { status: 400 }
      );
    }

    // Input validation
    const body = await request.json();
    const parsed = expenseDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, notes } = parsed.data;
    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    // Commit decision
    const { data: updatedEntry, error: updateError } = await adminClient
      .from('expense_entries')
      .update({
        processing_status: nextStatus,
        reviewer_notes: notes || expenseEntry.reviewer_notes,
        reviewed_by: user.id,
        reviewed_at: now,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updatedEntry) {
      console.error('Failed to save leadership decision:', updateError);
      return NextResponse.json({ error: 'Failed to commit decision' }, { status: 500 });
    }

    // Log Activity trace
    logActivity(supabase, {
      userId: user.id,
      action: `${action}_expense_entry` as any,
      tableName: 'expense_entries',
      recordId: id,
      metadata: {
        vendorName: expenseEntry.vendor_name,
        totalAmount: expenseEntry.total_amount,
        currency: expenseEntry.currency,
        notes: notes ?? null,
      },
    });

    const deciderName = await getUserDisplayName(user.id);

    // Send push notification to submitter
    createNotification({
      userId: expenseEntry.submitted_by,
      type: 'system',
      title: action === 'approve' ? 'Expense Approved' : 'Expense Rejected',
      message: `Your exception expense at ${expenseEntry.vendor_name} for ${expenseEntry.currency} ${expenseEntry.total_amount} was ${action}d by ${deciderName}.${notes ? ` Notes: "${notes}"` : ''}`,
      link: '/employee/expenses',
      metadata: { expenseId: id, status: nextStatus },
    });

    return NextResponse.json({ data: updatedEntry });
  } catch (error) {
    console.error('Unexpected error in POST /api/expenses/[id]/decide:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
