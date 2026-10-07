import { logActivity } from '@/lib/audit';
import { resolveExpenseCapabilities } from '@/lib/expenses/capabilities';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const decisionSchema = z.object({ action: z.enum(['approve','reject']), notes: z.string().trim().max(2000).optional().nullable() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = createSupabaseAdminClient();
    const capabilities = await resolveExpenseCapabilities(admin, user.id);
    if (!capabilities.canMatch) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    const outcome = parsed.data.action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await (admin as any).rpc('decide_finance_variance', { expense_id: id, actor_id: user.id, outcome, decision_note: parsed.data.notes ?? '' });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    if (!data) return NextResponse.json({ error: 'This variance needs its designated approver, or cannot be decided by its submitter' }, { status: 409 });
    logActivity(supabase, { userId: user.id, action: `${parsed.data.action}_expense_entry` as any, tableName: 'expense_entries', recordId: id, metadata: { notes: parsed.data.notes ?? null } });
    const updated = await admin.from('expense_entries').select('*').eq('id', id).single();
    return NextResponse.json({ data: updated.data });
  } catch (error) {
    console.error('Failed to decide expense variance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
