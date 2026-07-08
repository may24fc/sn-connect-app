import { logActivity } from '@/lib/audit';
import { resolveExpenseCapabilities } from '@/lib/expenses/capabilities';
import { createNotification, getUserDisplayName } from '@/lib/notifications/create-notification';
import { type ExpenseMatchInput, expenseMatchSchema } from '@/lib/schemas/expense.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type MinimalExpenseEntry = {
  id: string;
  vendor_name: string;
  currency: string;
  total_amount: number;
  submitted_by: string;
  source_type: 'staff_request' | 'direct_payment';
  match_status: 'unmatched' | 'matched' | 'variance_flagged' | 'resolved';
  matched_entry_id: string | null;
  deleted_at: string | null;
};

async function fetchExpenseEntry(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  id: string
): Promise<MinimalExpenseEntry> {
  const { data, error } = await adminClient
    .from('expense_entries')
    .select(
      'id, vendor_name, currency, total_amount, submitted_by, source_type, match_status, matched_entry_id, deleted_at'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Expense entry not found');
  }

  return data as MinimalExpenseEntry;
}

function notifyMatchResult(
  entry: MinimalExpenseEntry,
  counterpart: MinimalExpenseEntry,
  matchStatus: ExpenseMatchInput['matchStatus'],
  reviewerDisplayName: string
): void {
  const recipients = new Set([entry.submitted_by, counterpart.submitted_by]);

  for (const recipientId of recipients) {
    createNotification({
      userId: recipientId,
      type: 'system',
      title:
        matchStatus === 'matched'
          ? 'Expense Matched'
          : matchStatus === 'variance_flagged'
            ? 'Expense Variance Flagged'
            : 'Expense Match Resolved',
      message: `Your ${entry.vendor_name} entry (${entry.currency} ${entry.total_amount}) was reconciled by ${reviewerDisplayName} with status [${matchStatus.replace('_', ' ')}].`,
      link: '/expenses',
      metadata: { expenseId: entry.id, counterpartId: counterpart.id, matchStatus },
    });
  }
}

/**
 * POST /api/expenses/[id]/verify
 * Matching Queue reconciliation endpoint. Links a staff spend REQUEST with the
 * direct PAYMENT that settled it (or flags a variance), per the Control Hub
 * Expense Tracking & Matching System proposal. Restricted to Accounting
 * staff/interns and Admin/Super Admin.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const capabilities = await resolveExpenseCapabilities(adminClient, user.id);
    if (!capabilities.canMatch) {
      return NextResponse.json(
        { error: 'Forbidden: Only Accounting staff or Admins can reconcile matches' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = expenseMatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid match body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let entry: MinimalExpenseEntry;
    let counterpart: MinimalExpenseEntry;

    try {
      entry = await fetchExpenseEntry(adminClient, id);
      counterpart = await fetchExpenseEntry(adminClient, parsed.data.counterpartEntryId);
    } catch (loadErr) {
      const msg = loadErr instanceof Error ? loadErr.message : 'Expense entry not found';
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    if (entry.source_type === counterpart.source_type) {
      return NextResponse.json(
        { error: 'A request can only be matched against a payment entry (and vice-versa).' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const varianceAmount = Number((entry.total_amount - counterpart.total_amount).toFixed(2));

    const { error: updateEntryError } = await adminClient
      .from('expense_entries')
      .update({
        match_status: parsed.data.matchStatus,
        matched_entry_id: counterpart.id,
        matched_by: user.id,
        matched_at: now,
        matched_variance_amount: varianceAmount,
        matched_notes: parsed.data.matchedNotes || null,
      })
      .eq('id', entry.id);

    const { error: updateCounterpartError } = await adminClient
      .from('expense_entries')
      .update({
        match_status: parsed.data.matchStatus,
        matched_entry_id: entry.id,
        matched_by: user.id,
        matched_at: now,
        matched_variance_amount: Number((-varianceAmount).toFixed(2)),
        matched_notes: parsed.data.matchedNotes || null,
      })
      .eq('id', counterpart.id);

    if (updateEntryError || updateCounterpartError) {
      return NextResponse.json({ error: 'Failed to save match result' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'match_expense_entries',
      tableName: 'expense_entries',
      recordId: entry.id,
      metadata: {
        counterpartEntryId: counterpart.id,
        matchStatus: parsed.data.matchStatus,
        varianceAmount,
      },
    });

    const reviewerDisplayName = await getUserDisplayName(user.id);
    notifyMatchResult(entry, counterpart, parsed.data.matchStatus, reviewerDisplayName);

    return NextResponse.json({
      data: {
        matchStatus: parsed.data.matchStatus,
        varianceAmount,
        entryId: entry.id,
        counterpartEntryId: counterpart.id,
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/expenses/[id]/verify (match action):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
