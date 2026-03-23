import { createKPIEvidenceSchema } from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, resolveEmployeeIdForUser } from '../../../_lib';

/**
 * GET /api/performance/kpis/[id]/evidence
 * List evidence items for a KPI
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: kpiId } = await params;
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify KPI exists
    const { data: kpi, error: kpiError } = await supabaseAdmin
      .from('kpis')
      .select('id, employee_id')
      .eq('id', kpiId)
      .maybeSingle();

    if (kpiError || !kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
    }

    const { data: evidence, error: fetchError } = await supabaseAdmin
      .from('kpi_evidence')
      .select('*')
      .eq('kpi_id', kpiId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch evidence' }, { status: 500 });
    }

    // Resolve submitter names
    const submitterIds = [...new Set((evidence || []).map((e) => e.submitted_by))];
    const namesMap = new Map<string, string>();

    if (submitterIds.length > 0) {
      const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', submitterIds)
        .is('deleted_at', null);

      for (const emp of employees || []) {
        namesMap.set(emp.user_id, `${emp.first_name} ${emp.last_name}`);
      }
    }

    const enriched = (evidence || []).map((item) => ({
      ...item,
      submitted_by_name: namesMap.get(item.submitted_by) || 'Unknown',
    }));

    return NextResponse.json({ data: enriched });
  } catch (err) {
    console.error('GET /api/performance/kpis/[id]/evidence error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/performance/kpis/[id]/evidence
 * Submit evidence for a KPI (links, notes, or file metadata)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: kpiId } = await params;
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createKPIEvidenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify KPI exists and user owns it
    const { data: kpi, error: kpiError } = await supabaseAdmin
      .from('kpis')
      .select('id, employee_id')
      .eq('id', kpiId)
      .maybeSingle();

    if (kpiError || !kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
    }

    // Check that the user is the KPI owner
    const employeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
    if (!employeeId || employeeId !== kpi.employee_id) {
      return NextResponse.json(
        { error: 'Only the KPI owner can submit evidence' },
        { status: 403 }
      );
    }

    const insertPayload: Record<string, unknown> = {
      kpi_id: kpiId,
      submitted_by: user.id,
      evidence_type: parsed.data.evidenceType,
      content: parsed.data.content,
      label: parsed.data.label || null,
    };

    // For file evidence, extract file metadata from the content URL
    if (parsed.data.evidenceType === 'file' && body.fileName) {
      insertPayload.file_name = body.fileName;
      insertPayload.file_size = body.fileSize || null;
      insertPayload.mime_type = body.mimeType || null;
    }

    const { data: evidence, error: insertError } = await supabaseAdmin
      .from('kpi_evidence')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !evidence) {
      console.error('Error creating KPI evidence:', insertError);
      return NextResponse.json({ error: 'Failed to submit evidence' }, { status: 500 });
    }

    return NextResponse.json({ data: evidence }, { status: 201 });
  } catch (err) {
    console.error('POST /api/performance/kpis/[id]/evidence error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/performance/kpis/[id]/evidence
 * Soft-delete an evidence item (pass evidenceId as query param)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // consume params
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const evidenceId = request.nextUrl.searchParams.get('evidenceId');
    if (!evidenceId) {
      return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
    }

    // Verify evidence exists and user is the submitter
    const { data: evidence, error: fetchError } = await supabaseAdmin
      .from('kpi_evidence')
      .select('id, submitted_by')
      .eq('id', evidenceId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    if (evidence.submitted_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the submitter can delete evidence' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('kpi_evidence')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', evidenceId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete evidence' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/performance/kpis/[id]/evidence error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
