import { logActivity } from '@/lib/audit';
import {
  createNotificationsForUsers,
  getUserDisplayName,
  getUserIdsByRoles,
} from '@/lib/notifications/create-notification';
import { extractAmountFromInvoiceDocument } from '@/lib/payroll/invoiceDocumentOcr';
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

    const updates: Record<string, string | number | null> = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    };

    let sourceCurrency = (invoice.source_currency as string | null) || 'PHP';
    const targetCurrency = (invoice.target_currency as string | null) || 'PHP';
    const netAmount = Number(invoice.net_amount || 0);
    let resolvedNetAmount = netAmount;

    if (invoice.document_id) {
      const extraction = await extractAmountFromInvoiceDocument({
        adminClient: supabaseAdmin,
        documentId: invoice.document_id as string,
        employeeId: invoice.employee_id as string,
      });

      if (!extraction.invoiceNumber) {
        return NextResponse.json(
          {
            error:
              'Invoice number must come from the uploaded invoice document OCR. Re-upload a clearer invoice that shows the document invoice number.',
          },
          { status: 400 }
        );
      }

      updates.invoice_number = extraction.invoiceNumber;

      if (typeof extraction.phpAmount === 'number' && extraction.phpAmount > 0) {
        resolvedNetAmount = extraction.phpAmount;
        updates.gross_amount = extraction.phpAmount;
        updates.net_amount = extraction.phpAmount;
        sourceCurrency = 'PHP';
      }

      if (sourceCurrency === 'PHP' && targetCurrency === 'AUD') {
        if (typeof extraction.audAmount !== 'number' || extraction.audAmount <= 0) {
          return NextResponse.json(
            {
              error:
                extraction.reason ||
                'Could not read the AUD amount from the uploaded invoice document. Re-upload a clearer invoice that shows both PHP and AUD totals.',
            },
            { status: 400 }
          );
        }

        updates.converted_amount = extraction.audAmount;
        updates.exchange_rate =
          resolvedNetAmount > 0
            ? Math.round((extraction.audAmount / resolvedNetAmount) * 1_000_000) / 1_000_000
            : null;
      }
    }

    if (sourceCurrency === targetCurrency) {
      updates.exchange_rate = 1;
      updates.converted_amount = resolvedNetAmount;
    } else if (sourceCurrency === 'PHP' && targetCurrency === 'AUD') {
      if (typeof updates.converted_amount !== 'number') {
        return NextResponse.json(
          {
            error:
              'AUD converted amount must come directly from the uploaded invoice document OCR. Re-upload a clearer invoice that shows both PHP and AUD totals.',
          },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return NextResponse.json(
          { error: `Invoice number ${updates.invoice_number ?? invoice.invoice_number} already exists.` },
          { status: 409 }
        );
      }
      console.error('Error submitting invoice:', error);
      return NextResponse.json({ error: 'Failed to submit invoice' }, { status: 500 });
    }

    // Notify super_admins about the submitted invoice (only super_admin can approve invoices)
    const submitterName = await getUserDisplayName(user.id);
    const superAdminIds = await getUserIdsByRoles(['super_admin']);
    const adminRecipients = superAdminIds.filter((adminId) => adminId !== user.id);

    createNotificationsForUsers(adminRecipients, {
      type: 'invoice_submitted',
      title: 'Invoice Submitted for Approval',
      message: `${submitterName} submitted an invoice for PHP ${data.net_amount || 0} for approval`,
      link: `/super-admin/payroll-approvals`,
      metadata: { invoiceId: id, submittedBy: user.id },
    });

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'submit_invoice',
      tableName: 'invoices',
      recordId: id,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/invoices/[id]/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
