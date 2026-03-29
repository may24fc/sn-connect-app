import { logActivity } from '@/lib/audit';
import {
  createNotification,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { executePayroll } from '@/app/actions/execute-payroll';
import { invoiceApprovalSchema } from '@/lib/schemas/invoice.schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const WISE_ENVIRONMENT = process.env.WISE_ENVIRONMENT ?? 'sandbox';
const WISE_SANDBOX_FALLBACK_RECIPIENT_ID =
  process.env.WISE_SANDBOX_FALLBACK_RECIPIENT_ID ?? '';

/**
 * POST /api/invoices/[id]/approve
 * Approve or reject invoice
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // After role consolidation, only admin and super_admin can approve invoices
    const approverRoles = ['admin', 'super_admin'];
    if (!approverRoles.includes(roleData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = invoiceApprovalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const updateData = {
      status: parsed.data.action,
      approved_by: user.id,
      approved_at: now,
      notes: parsed.data.notes || null,
    };

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, employee_id, net_amount, source_currency, target_currency, status')
      .single();

    if (error || !data) {
      console.error('Error approving invoice:', error);
      return NextResponse.json({ error: 'Failed to update invoice status' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: `invoice_${parsed.data.action}`,
      tableName: 'invoices',
      recordId: id,
      metadata: { notes: parsed.data.notes || null },
    });

    // Notify employee about invoice approval/rejection
    if (data.employee_id) {
      const approverName = await getUserDisplayName(user.id);
      const isApproved = parsed.data.action === 'approved';

      createNotification({
        userId: data.employee_id,
        type: isApproved ? 'invoice_approved' : 'invoice_rejected',
        title: isApproved ? 'Invoice Approved' : 'Invoice Rejected',
        message: `${approverName} ${isApproved ? 'approved' : 'rejected'} your invoice for PHP ${data.net_amount || 0}${parsed.data.notes ? `: ${parsed.data.notes}` : ''}`,
        link: `/invoice`,
        metadata: { invoiceId: id, approvedBy: user.id, action: parsed.data.action },
      });
    }

    // Auto-wire payroll execution when invoice is approved.
    if (parsed.data.action === 'approved') {
      const { data: bankingInfo, error: bankingError } = await supabase
        .from('employee_banking_info')
        .select('wise_recipient_id, currency')
        .eq('employee_id', data.employee_id)
        .is('deleted_at', null)
        .maybeSingle();

      let recipientIdRaw = bankingInfo?.wise_recipient_id ?? null;
      let recipientSource: 'employee_banking_info' | 'sandbox_fallback' =
        'employee_banking_info';

      if (!recipientIdRaw && WISE_ENVIRONMENT === 'sandbox' && WISE_SANDBOX_FALLBACK_RECIPIENT_ID) {
        recipientIdRaw = WISE_SANDBOX_FALLBACK_RECIPIENT_ID;
        recipientSource = 'sandbox_fallback';
      }

      if (bankingError || !recipientIdRaw) {
        return NextResponse.json(
          {
            data,
            payroll: {
              triggered: false,
              success: false,
              error:
                'Invoice approved but payroll was not executed: missing employee Wise recipient ID. Add employee_banking_info.wise_recipient_id, or set WISE_SANDBOX_FALLBACK_RECIPIENT_ID for sandbox testing.',
            },
          },
          { status: 202 }
        );
      }

      const recipientId = Number(recipientIdRaw);
      if (!Number.isInteger(recipientId) || recipientId <= 0) {
        return NextResponse.json(
          {
            data,
            payroll: {
              triggered: false,
              success: false,
              error:
                'Invoice approved but payroll was not executed: invalid Wise recipient ID (must be a positive integer).',
            },
          },
          { status: 202 }
        );
      }

      const sourceAmount = Number(data.net_amount || 0);
      if (sourceAmount <= 0) {
        return NextResponse.json(
          {
            data,
            payroll: {
              triggered: false,
              success: false,
              error: 'Invoice approved but payroll was not executed: invoice net amount must be greater than 0.',
            },
          },
          { status: 202 }
        );
      }

      const sourceCurrency = String(data.source_currency || 'EUR').toUpperCase();
      const targetCurrency = String(data.target_currency || bankingInfo?.currency || 'PHP').toUpperCase();

      const payrollResult = await executePayroll({
        invoiceId: data.id,
        recipientId,
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        reference: `SN Payroll ${data.id.slice(0, 8)}`,
      });

      if (!payrollResult.success) {
        return NextResponse.json(
          {
            data,
            payroll: {
              triggered: true,
              recipientSource,
              ...payrollResult,
            },
          },
          { status: 202 }
        );
      }

      return NextResponse.json({
        data,
        payroll: {
          triggered: true,
          recipientSource,
          ...payrollResult,
        },
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/invoices/[id]/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
