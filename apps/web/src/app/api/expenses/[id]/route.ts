import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ExpenseDeleteCandidate = {
  id: string;
  submitted_by: string;
  processing_status: string;
  vendor_name: string;
  total_amount: number | string | null;
  currency: string | null;
};

const NON_ADMIN_DELETABLE_STATUSES = ['draft_extracted', 'awaiting_associate_review'];

async function resolveUserRole(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<string> {
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (userError || !userData?.role) {
    throw new Error('User not found');
  }

  return userData.role;
}

/**
 * DELETE /api/expenses/[id]
 * Soft-deletes an expense entry by setting deleted_at.
 * - Admin/super_admin can delete any active entry.
 * - Non-admin users can only delete their own unreviewed entries.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let role: string;
    try {
      role = await resolveUserRole(adminClient, user.id);
    } catch {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = role === 'admin' || role === 'super_admin';

    const { data: expenseEntry, error: loadError } = await adminClient
      .from('expense_entries')
      .select('id, submitted_by, processing_status, vendor_name, total_amount, currency')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle<ExpenseDeleteCandidate>();

    if (loadError || !expenseEntry) {
      return NextResponse.json({ error: 'Expense entry not found' }, { status: 404 });
    }

    if (!isAdmin && expenseEntry.submitted_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isAdmin && !NON_ADMIN_DELETABLE_STATUSES.includes(expenseEntry.processing_status)) {
      return NextResponse.json(
        {
          error:
            'Only unreviewed expense entries can be deleted. This entry has already progressed in workflow.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: deletedEntry, error: deleteError } = await adminClient
      .from('expense_entries')
      .update({ deleted_at: now })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (deleteError || !deletedEntry) {
      console.error('Failed to soft delete expense entry:', deleteError);
      return NextResponse.json({ error: 'Failed to delete expense entry' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'delete_expense_entry',
      tableName: 'expense_entries',
      recordId: id,
      metadata: {
        vendorName: expenseEntry.vendor_name,
        totalAmount: expenseEntry.total_amount,
        currency: expenseEntry.currency,
        processingStatus: expenseEntry.processing_status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/expenses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
