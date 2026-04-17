import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/reports/[id]/restore
 * Restore a soft-deleted report.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isPrivileged = ['admin', 'super_admin', 'hr', 'cos', 'ceo'].includes(role ?? '');

    const { data: existingReport, error: existingReportError } = await supabaseAdmin
      .from('reports')
      .select('id, deleted_at, employees(user_id)')
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .maybeSingle();

    if (existingReportError) {
      console.error('Error loading report before restore:', existingReportError);
      return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
    }

    if (!existingReport) {
      return NextResponse.json({ error: 'Archived report not found' }, { status: 404 });
    }

    const reportOwner = Array.isArray(existingReport.employees)
      ? existingReport.employees[0]
      : existingReport.employees;

    if (!isPrivileged) {
      if (!reportOwner || reportOwner.user_id !== user.id) {
        return NextResponse.json({ error: 'Archived report not found' }, { status: 404 });
      }
    }

    const { error } = await supabaseAdmin
      .from('reports')
      .update({ deleted_at: null })
      .eq('id', id)
      .not('deleted_at', 'is', null);

    if (error) {
      console.error('Error restoring report:', error);
      return NextResponse.json({ error: 'Failed to restore report' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'restore_report',
      tableName: 'reports',
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in POST /api/reports/[id]/restore:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}