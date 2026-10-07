import { logActivity } from '@/lib/audit';
import { resolveExpenseCapabilities } from '@/lib/expenses/capabilities';
import { expenseMatchSchema } from '@/lib/schemas/expense.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Confirm a request/payment match; the database computes variance and records both sides atomically. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = createSupabaseAdminClient();
    const capabilities = await resolveExpenseCapabilities(admin, user.id);
    if (!capabilities.canMatch) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const parsed = expenseMatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid match body', details: parsed.error.flatten() }, { status: 400 });
    if (id === parsed.data.counterpartEntryId || parsed.data.matchStatus === 'resolved') return NextResponse.json({ error: 'Choose a separate open counterpart' }, { status: 400 });
    const { data: entries, error: loadError } = await admin.from('expense_entries').select('id,source_type').in('id', [id, parsed.data.counterpartEntryId]).is('deleted_at', null);
    if (loadError || entries?.length !== 2) return NextResponse.json({ error: 'Expense entries not found' }, { status: 404 });
    const requestEntry = entries.find((entry) => entry.source_type === 'staff_request');
    const paymentEntry = entries.find((entry) => entry.source_type === 'direct_payment');
    if (!requestEntry || !paymentEntry) return NextResponse.json({ error: 'A request must be paired with a direct payment' }, { status: 400 });
    const { data, error } = await (admin as any).rpc('reconcile_finance_expense', { request_id: requestEntry.id, payment_id: paymentEntry.id, actor_id: user.id, reason: parsed.data.matchedNotes ?? '' });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    logActivity(supabase, { userId: user.id, action: 'match_expense_entries', tableName: 'expense_entries', recordId: requestEntry.id, metadata: { counterpartEntryId: paymentEntry.id, ...data } });
    return NextResponse.json({ data: { ...data, entryId: requestEntry.id, counterpartEntryId: paymentEntry.id } });
  } catch (error) {
    console.error('Failed to reconcile expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
