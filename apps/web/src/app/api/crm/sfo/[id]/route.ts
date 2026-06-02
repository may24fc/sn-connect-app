import { logActivity } from '@/lib/audit';
import { sfoLeadUpdateSchema } from '@/lib/schemas/crm.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getCrmAuthedContext } from '../../_lib';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCrmAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { supabaseAdmin, user } = auth.context;
    const body = await request.json();
    const parsed = sfoLeadUpdateSchema.safeParse(body);

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
      .from('crm_sfo_leads')
      .select('id, status, follow_up_status')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingError) {
      console.error('PATCH /api/crm/sfo/[id] lookup error:', existingError);
      return NextResponse.json({ error: 'Failed to update SFO CRM record' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'SFO CRM record not found' }, { status: 404 });
    }

    const payload = parsed.data;
    const { data, error } = await supabaseAdmin
      .from('crm_sfo_leads')
      .update({
        customer_name: payload.customerName,
        social_link: payload.socialLink,
        message_source: payload.messageSource,
        platform: payload.platform,
        date_of_contact: payload.dateOfContact,
        action_plan: payload.actionPlan,
        follow_up_status: payload.followUpStatus,
        action_taken: payload.actionTaken,
        customer_type: payload.customerType,
        reason_for_reaching_out: payload.reasonForReachingOut,
        contact_number: payload.contactNumber,
        address: payload.address,
        order_date: payload.orderDate,
        products: payload.products,
        amount: payload.amount,
        invoice_number: payload.invoiceNumber,
        status: payload.status,
        remarks: payload.remarks,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      console.error('PATCH /api/crm/sfo/[id] update error:', error);
      return NextResponse.json({ error: 'Failed to update SFO CRM record' }, { status: 500 });
    }

    const statusChanged =
      existing.status !== data.status || existing.follow_up_status !== data.follow_up_status;

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: statusChanged ? 'update_crm_sfo_status' : 'update_crm_sfo_record',
      tableName: 'crm_sfo_leads',
      recordId: data.id,
      metadata: {
        previousStatus: existing.status,
        nextStatus: data.status,
        previousFollowUpStatus: existing.follow_up_status,
        nextFollowUpStatus: data.follow_up_status,
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/crm/sfo/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
