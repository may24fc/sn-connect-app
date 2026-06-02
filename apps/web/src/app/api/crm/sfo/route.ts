import { logActivity } from '@/lib/audit';
import { sfoLeadCreateSchema, SFO_STATUS_VALUES } from '@/lib/schemas/crm.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getCrmAuthedContext } from '../_lib';

interface SfoLeadRow {
  id: string;
  status: (typeof SFO_STATUS_VALUES)[number];
  follow_up_status: (typeof SFO_STATUS_VALUES)[number];
  customer_name: string;
  social_link: string | null;
  message_source: string | null;
  platform: 'META' | 'IG';
  date_of_contact: string;
  action_plan: string | null;
  action_taken: string | null;
  customer_type: 'new' | 'returning' | 'wholesale';
  reason_for_reaching_out: string | null;
  contact_number: string | null;
  address: string | null;
  order_date: string | null;
  products: string[];
  amount: number;
  invoice_number: string | null;
  remarks: string | null;
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
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('crm_sfo_leads')
      .select('*')
      .is('deleted_at', null)
      .order('date_of_contact', { ascending: false })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        [
          `customer_name.ilike.%${search}%`,
          `invoice_number.ilike.%${search}%`,
          `message_source.ilike.%${search}%`,
          `remarks.ilike.%${search}%`,
        ].join(',')
      );
    }

    if (status && SFO_STATUS_VALUES.includes(status as (typeof SFO_STATUS_VALUES)[number])) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET /api/crm/sfo error:', error);
      return NextResponse.json({ error: 'Failed to fetch SFO CRM records' }, { status: 500 });
    }

    return NextResponse.json({ data: (data || []) as Array<SfoLeadRow> });
  } catch (error) {
    console.error('Unexpected error in GET /api/crm/sfo:', error);
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
    const parsed = sfoLeadCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const { data, error } = await supabaseAdmin
      .from('crm_sfo_leads')
      .insert({
        customer_name: payload.customerName,
        social_link: payload.socialLink ?? null,
        message_source: payload.messageSource ?? null,
        platform: payload.platform,
        date_of_contact: payload.dateOfContact,
        action_plan: payload.actionPlan ?? null,
        follow_up_status: payload.followUpStatus,
        action_taken: payload.actionTaken ?? null,
        customer_type: payload.customerType,
        reason_for_reaching_out: payload.reasonForReachingOut ?? null,
        contact_number: payload.contactNumber ?? null,
        address: payload.address ?? null,
        order_date: payload.orderDate ?? null,
        products: payload.products,
        amount: payload.amount,
        invoice_number: payload.invoiceNumber ?? null,
        status: payload.status,
        remarks: payload.remarks ?? null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('POST /api/crm/sfo error:', error);
      return NextResponse.json({ error: 'Failed to create SFO CRM record' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_crm_sfo_record',
      tableName: 'crm_sfo_leads',
      recordId: data.id,
      metadata: {
        customerName: data.customer_name,
        platform: data.platform,
        amount: data.amount,
        status: data.status,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/crm/sfo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
