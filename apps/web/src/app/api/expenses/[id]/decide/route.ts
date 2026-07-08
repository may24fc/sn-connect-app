import { logActivity } from '@/lib/audit';
import { resolveExpenseCapabilities } from '@/lib/expenses/capabilities';
import { createNotification, getUserDisplayName } from '@/lib/notifications/create-notification';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const expenseDecisionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional().nullable(),
});

/**
 * POST /api/expenses/[id]/decide
 * Exception review endpoint for Executive Leadership / Accounting.
 * Resolves a variance flagged by the Matching Queue (mismatched amounts
 * between a logged request and its counterpart payment).
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

    // Capability enforcement: only Accounting/Admin/Super Admin may resolve variances.
    const capabilities = await resolveExpenseCapabilities(adminClient, user.id);
    if (!capabilities.canMatch) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    if (expenseEntry.match_status !== 'variance_flagged') {
      return NextResponse.json(
        { error: `Cannot review entry in match state: ${expenseEntry.match_status}` },
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
        match_status: 'resolved',
        matched_notes: notes || expenseEntry.matched_notes,
        matched_by: user.id,
        matched_at: now,
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
