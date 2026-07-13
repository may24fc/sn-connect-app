import { buildMonthlyExpenseReport } from '@/lib/expenses/monthly-report';
import { renderMonthlyExpenseReportPdf } from '@/lib/expenses/monthly-report-pdf';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

function isAuthorizedServiceRequest(request: NextRequest): boolean {
  const configuredSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = request.headers.get('authorization');

  if (!configuredSecret || !authHeader) {
    return false;
  }

  return authHeader === `Bearer ${configuredSecret}`;
}

async function hasInteractiveAccess(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return false;
  }

  let role: string | null = null;
  if (typeof user.app_metadata?.db_role === 'string') {
    role = user.app_metadata.db_role;
  }

  if (!role) {
    const { data: roleData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();
    role = roleData?.role ?? null;
  }

  if (role && ADMIN_ROLES.has(role)) {
    return true;
  }

  const { data: isAccountingMember, error: accountingError } = await supabase.rpc('user_is_accounting_member', {
    target_user_id: user.id,
  });

  return !accountingError && Boolean(isAccountingMember);
}

function parseReferenceDate(searchParams: URLSearchParams): Date {
  const monthParam = searchParams.get('month');

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [yearText, monthText] = monthParam.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    return new Date(Date.UTC(year, month - 1, 1));
  }

  return new Date();
}

/**
 * GET /api/expenses/reports/monthly
 * Consolidated monthly executive expense report. Supports two auth paths:
 *  - Interactive session (Admin/Super Admin/Accounting) for in-app use.
 *  - Service-to-service Bearer SUPABASE_SERVICE_ROLE_KEY, matching the existing
 *    n8n "Supabase Service Role" Header Auth credential used by other scheduled
 *    workflows in this instance, for the monthly report delivery automation.
 * `?format=pdf` streams the rendered PDF; default returns the JSON summary.
 */
export async function GET(request: NextRequest) {
  try {
    const isServiceRequest = isAuthorizedServiceRequest(request);

    if (!isServiceRequest) {
      const authorized = await hasInteractiveAccess();
      if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') === 'pdf' ? 'pdf' : 'json';
    const referenceDate = parseReferenceDate(searchParams);

    const adminClient = createSupabaseAdminClient();
    const report = await buildMonthlyExpenseReport(adminClient, referenceDate);

    if (format === 'pdf') {
      const pdfBuffer = await renderMonthlyExpenseReportPdf(report);
      const fileNameSafeMonth = report.reportMonthLabel.replace(/\s+/g, '-').toLowerCase();

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="expense-monthly-report-${fileNameSafeMonth}.pdf"`,
        },
      });
    }

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error('GET /api/expenses/reports/monthly error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
