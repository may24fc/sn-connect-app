import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/invoices/[id]/submit
 * Submit an invoice for approval.
 *
 * Uses admin client to bypass RLS (same pattern as other invoice endpoints).
 * Security enforced at application layer via JWT + ownership validation.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the invoice exists and belongs to the current user
    const { data: invoice, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*, employees!inner(user_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !invoice) {
      console.error('Error fetching invoice for submit:', fetchError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Non-admin users can only submit their own invoices
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin'].includes(role ?? '');
    const employeeRecord = invoice.employees as unknown as { user_id: string } | null;

    if (!isAdmin && employeeRecord?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft invoices can be submitted' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error submitting invoice:', error);
      return NextResponse.json({ error: 'Failed to submit invoice' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/invoices/[id]/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
