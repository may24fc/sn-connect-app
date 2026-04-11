import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createInAppNotification } from '../_shared/in-app-notify.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Main handler
// Runs on days 25–31 of each month at 8 AM PHT (0 0 25-31 * * UTC).
// Reminds employees who have pending/draft invoices to submit them before
// the end of the billing period.
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = validateAdminAuth(req);
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ success: false, error: auth.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

    // ----- Step 1: Find employees with draft/pending invoices for current period -----
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: draftInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, created_by, status')
      .in('status', ['draft', 'pending'])
      .gte('period_start', periodStart)
      .lte('period_start', periodEnd)
      .is('deleted_at', null);

    if (invoiceError) {
      console.error('[payroll-reminder] Invoice query error:', invoiceError.message);
    }

    // ----- Step 2: Find employees who haven't created an invoice this period -----
    const { data: allEmployees, error: empError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('role', ['employee', 'intern'])
      .eq('status', 'active')
      .is('deleted_at', null);

    if (empError) {
      console.error('[payroll-reminder] Employee query error:', empError.message);
    }

    // Get all users who already have an invoice (any status) this period
    const { data: allInvoices, error: allInvError } = await supabase
      .from('invoices')
      .select('created_by')
      .gte('period_start', periodStart)
      .lte('period_start', periodEnd)
      .is('deleted_at', null);

    if (allInvError) {
      console.error('[payroll-reminder] All invoices query error:', allInvError.message);
    }

    const usersWithInvoice = new Set(
      (allInvoices ?? []).map((i: { created_by: string }) => i.created_by).filter(Boolean)
    );
    const userNameById = new Map(
      (allEmployees ?? []).map((employee) => [
        employee.id,
        `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || employee.email || 'Team member',
      ])
    );

    // ----- Step 3: Send reminders -----
    let remindedCount = 0;

    // Remind users with draft/pending invoices to finalize
    const draftUserIds = new Set<string>();
    for (const invoice of draftInvoices ?? []) {
      if (!invoice.created_by || draftUserIds.has(invoice.created_by)) continue;
      draftUserIds.add(invoice.created_by);
      const recipientName = userNameById.get(invoice.created_by) ?? 'Team member';

      await createInAppNotification(supabase, {
        userId: invoice.created_by,
        type: 'reminder',
        title: 'Invoice Submission Reminder',
        message: `${recipientName}, you have a ${invoice.status} invoice for ${currentMonth}. Please finalize and submit it. ${daysRemaining} day(s) remain until month-end.`,
        link: '/invoices',
        dedupeKey: `payroll-draft:${invoice.id}:${daysRemaining}`,
        metadata: {
          invoiceId: invoice.id,
          periodStart,
          periodEnd,
          daysRemaining,
        },
      });
      remindedCount++;
    }

    // Remind employees who haven't created any invoice this period
    let noInvoiceCount = 0;
    for (const emp of allEmployees ?? []) {
      if (usersWithInvoice.has(emp.id) || draftUserIds.has(emp.id)) continue;
      const recipientName = userNameById.get(emp.id) ?? 'Team member';

      await createInAppNotification(supabase, {
        userId: emp.id,
        type: 'reminder',
        title: 'Invoice Submission Reminder',
        message: `${recipientName}, no invoice was found for ${currentMonth}. Please create and submit your invoice. ${daysRemaining} day(s) remain until month-end.`,
        link: '/invoices/new',
        dedupeKey: `payroll-missing:${emp.id}:${periodStart}:${daysRemaining}`,
        metadata: { periodStart, periodEnd, daysRemaining },
      });
      remindedCount++;
      noInvoiceCount++;
    }

    if (remindedCount > 0) {
      await writeAuditLog(supabase, {
        tableName: 'invoices',
        recordId: `payroll-reminder-${periodStart}`,
        action: 'payroll_reminder_sent',
        metadata: {
          period: currentMonth,
          periodStart,
          periodEnd,
          daysRemaining,
          draftInvoiceReminders: draftUserIds.size,
          noInvoiceReminders: noInvoiceCount,
          totalReminded: remindedCount,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          period: currentMonth,
          daysRemaining,
          draftInvoiceReminders: draftUserIds.size,
          noInvoiceReminders: noInvoiceCount,
          totalReminded: remindedCount,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[payroll-reminder] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
