import { logActivity } from '@/lib/audit';
import { techInquiryCreateSchema, TECH_PIPELINE_STAGE_VALUES } from '@/lib/schemas/crm.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getCrmAuthedContext } from '../_lib';

interface TechInquiryRow {
  id: string;
  company_name: string;
  contact_person: string;
  company_background: string | null;
  requirements_summary: string;
  requirements_checklist: string[];
  pipeline_stage: (typeof TECH_PIPELINE_STAGE_VALUES)[number];
  long_form_remarks: string | null;
  follow_up_date: string | null;
  assigned_rep: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCrmAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin } = auth.context;
    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim();
    const stage = searchParams.get('stage');

    let query = supabaseAdmin
      .from('crm_tech_inquiries')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        [
          `company_name.ilike.%${search}%`,
          `contact_person.ilike.%${search}%`,
          `requirements_summary.ilike.%${search}%`,
          `long_form_remarks.ilike.%${search}%`,
        ].join(',')
      );
    }

    if (
      stage &&
      TECH_PIPELINE_STAGE_VALUES.includes(stage as (typeof TECH_PIPELINE_STAGE_VALUES)[number])
    ) {
      query = query.eq('pipeline_stage', stage);
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET /api/crm/tech error:', error);
      return NextResponse.json({ error: 'Failed to fetch TECH CRM records' }, { status: 500 });
    }

    return NextResponse.json({ data: (data || []) as Array<TechInquiryRow> });
  } catch (error) {
    console.error('Unexpected error in GET /api/crm/tech:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCrmAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user } = auth.context;
    const body = await request.json();
    const parsed = techInquiryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const { data, error } = await supabaseAdmin
      .from('crm_tech_inquiries')
      .insert({
        company_name: payload.companyName,
        contact_person: payload.contactPerson,
        company_background: payload.companyBackground ?? null,
        requirements_summary: payload.requirementsSummary,
        requirements_checklist: payload.requirementsChecklist,
        pipeline_stage: payload.pipelineStage,
        long_form_remarks: payload.longFormRemarks ?? null,
        follow_up_date: payload.followUpDate ?? null,
        assigned_rep: payload.assignedRep ?? null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('POST /api/crm/tech error:', error);
      return NextResponse.json({ error: 'Failed to create TECH CRM record' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_crm_tech_record',
      tableName: 'crm_tech_inquiries',
      recordId: data.id,
      metadata: {
        companyName: data.company_name,
        pipelineStage: data.pipeline_stage,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/crm/tech:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
