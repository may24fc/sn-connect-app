import { logActivity } from '@/lib/audit';
import {
  FINANCE_CATEGORIES,
  type FinanceCategoryCode,
  categoryToLegacyType,
} from '@/lib/finance/categories';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const ownerEditSchema = z.object({
  categoryCode: z.enum(FINANCE_CATEGORIES.map((category) => category.code) as [string, ...string[]]),
  paymentSource: z.enum(['unknown', 'personal_card', 'company_card', 'bank_transfer']),
  businessJustification: z.string().trim().min(1, 'Business purpose is required').max(2000),
});

type ExpenseEditCandidate = {
  id: string;
  submitted_by: string;
  processing_status: string;
  match_status: string;
  approval_state: string | null;
  category_code: string | null;
  payment_source: string | null;
  business_justification: string | null;
};

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
 * PATCH /api/expenses/[id]
 * Lets the submitter correct category, payment source, and business purpose after OCR,
 * while the entry is still unreviewed, unmatched, and undecided.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    }
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const parsed = ownerEditSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid expense details', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();
    const { data: entry, error: loadError } = await adminClient
      .from('expense_entries')
      .select(
        'id, submitted_by, processing_status, match_status, approval_state, category_code, payment_source, business_justification'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle<ExpenseEditCandidate>();
    if (loadError || !entry) {
      return NextResponse.json({ error: 'Expense entry not found' }, { status: 404 });
    }
    if (entry.submitted_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (
      !NON_ADMIN_DELETABLE_STATUSES.includes(entry.processing_status) ||
      entry.match_status !== 'unmatched' ||
      entry.approval_state === 'approved' ||
      entry.approval_state === 'rejected'
    ) {
      return NextResponse.json(
        { error: 'This expense has already been reviewed or matched. Ask Finance to update it.' },
        { status: 409 }
      );
    }

    const categoryCode = parsed.data.categoryCode as FinanceCategoryCode;
    const { data: updated, error: updateError } = await adminClient
      .from('expense_entries')
      .update({
        category_code: categoryCode,
        expense_type: categoryToLegacyType(categoryCode),
        payment_source: parsed.data.paymentSource,
        business_justification: parsed.data.businessJustification,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('submitted_by', user.id)
      .eq('match_status', 'unmatched')
      .in('processing_status', NON_ADMIN_DELETABLE_STATUSES)
      .is('deleted_at', null)
      .select('id, category_code, payment_source, business_justification')
      .maybeSingle();
    if (updateError || !updated) {
      return NextResponse.json({ error: 'Could not update expense details' }, { status: 409 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'update_own_expense_details',
      tableName: 'expense_entries',
      recordId: id,
      metadata: {
        before: { categoryCode: entry.category_code, paymentSource: entry.payment_source },
        after: { categoryCode, paymentSource: parsed.data.paymentSource },
        businessPurposeChanged:
          (entry.business_justification ?? '') !== parsed.data.businessJustification,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/expenses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
