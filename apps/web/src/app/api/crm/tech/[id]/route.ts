import { logActivity } from '@/lib/audit';
import { techInquiryUpdateSchema } from '@/lib/schemas/crm.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { assertCrmTrackerAccess, getCrmAuthedContext } from '../../_lib';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCrmAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const trackerAccess = assertCrmTrackerAccess(
      auth.context.role,
      auth.context.grantedTrackers,
      'sn_tech_inquiries',
    );

    if (!trackerAccess.ok) {
      return NextResponse.json({ error: trackerAccess.error }, { status: trackerAccess.status });
    }

    const { id } = await params;
    const { supabaseAdmin, user } = auth.context;
    const body = await request.json();
    const parsed = techInquiryUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('crm_tech_inquiries')
      .select('id, pipeline_stage')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingError) {
      console.error('PATCH /api/crm/tech/[id] lookup error:', existingError);
      return NextResponse.json({ error: 'Failed to update TECH CRM record' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'TECH CRM record not found' }, { status: 404 });
    }

    const payload = parsed.data;
    const { data, error } = await supabaseAdmin
      .from('crm_tech_inquiries')
      .update({
        company_name: payload.companyName,
        contact_person: payload.contactPerson,
        company_background: payload.companyBackground,
        requirements_summary: payload.requirementsSummary,
        requirements_checklist: payload.requirementsChecklist,
        pipeline_stage: payload.pipelineStage,
        long_form_remarks: payload.longFormRemarks,
        follow_up_date: payload.followUpDate,
        assigned_rep: payload.assignedRep,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      console.error('PATCH /api/crm/tech/[id] update error:', error);
      return NextResponse.json({ error: 'Failed to update TECH CRM record' }, { status: 500 });
    }

    const stageChanged = existing.pipeline_stage !== data.pipeline_stage;

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: stageChanged ? 'update_crm_tech_stage' : 'update_crm_tech_record',
      tableName: 'crm_tech_inquiries',
      recordId: data.id,
      metadata: {
        previousStage: existing.pipeline_stage,
        nextStage: data.pipeline_stage,
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/crm/tech/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCrmAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const trackerAccess = assertCrmTrackerAccess(
      auth.context.role,
      auth.context.grantedTrackers,
      'sn_tech_inquiries',
    );

    if (!trackerAccess.ok) {
      return NextResponse.json({ error: trackerAccess.error }, { status: trackerAccess.status });
    }

    const { id } = await params;
    const { supabaseAdmin, user } = auth.context;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('crm_tech_inquiries')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingError) {
      console.error('DELETE /api/crm/tech/[id] lookup error:', existingError);
      return NextResponse.json({ error: 'Failed to delete TECH CRM record' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'TECH CRM record not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('crm_tech_inquiries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('DELETE /api/crm/tech/[id] delete error:', error);
      return NextResponse.json({ error: 'Failed to delete TECH CRM record' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'delete_crm_tech_record',
      tableName: 'crm_tech_inquiries',
      recordId: id,
      metadata: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/crm/tech/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
