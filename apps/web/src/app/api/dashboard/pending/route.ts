import { NextResponse } from 'next/server';
import { getAuthedSupabase, isNotificationAdmin } from '../../notifications/_lib';

/**
 * GET: Returns counts and latest items for pending approvals.
 * - Pending report submissions
 * - Pending invoice approvals
 * - Pending performance reviews
 * - Late intern EOD reports
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isNotificationAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Pending report submissions (status = 'submitted', awaiting review)
    const { count: pendingReportsCount, data: pendingReports } = await supabase
      .from('reports')
      .select('id, employee_id, report_type, period_start, period_end, submitted_at, created_at', {
        count: 'exact',
      })
      .eq('status', 'submitted')
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(5);

    // Pending invoice approvals (status = 'submitted')
    const { count: pendingInvoicesCount, data: pendingInvoices } = await supabase
      .from('invoices')
      .select('id, employee_id, invoice_number, gross_amount, net_amount, created_at', {
        count: 'exact',
      })
      .eq('status', 'submitted')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Pending performance reviews (status = 'pending' or 'in_progress')
    const { count: pendingReviewsCount, data: pendingReviews } = await supabase
      .from('performance_reviews')
      .select('id, employee_id, review_period, reviewer_id, created_at', { count: 'exact' })
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Late intern standups (interns who didn't submit yesterday's standup)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Get active interns (need both internship id and employee_id)
    const { data: activeInterns } = await supabase
      .from('internships')
      .select('id, employee_id')
      .eq('status', 'active');

    let lateEodCount = 0;
    if (activeInterns && activeInterns.length > 0) {
      const internshipIds = activeInterns.map((i: { id: string }) => i.id);

      // Get interns who submitted yesterday — intern_daily_logs uses internship_id, not employee_id
      const { data: submittedLogs } = await supabase
        .from('intern_daily_logs')
        .select('internship_id')
        .in('internship_id', internshipIds)
        .gte('log_date', yesterdayStr)
        .lte('log_date', yesterdayStr);

      const submittedInternshipIds = new Set(
        (submittedLogs ?? []).map((s: { internship_id: string }) => s.internship_id)
      );
      lateEodCount = activeInterns.filter(
        (i: { id: string }) => !submittedInternshipIds.has(i.id)
      ).length;
    }

    // Calculate overdue items
    const now = new Date();
    let overdueReports = 0;
    if (pendingReports) {
      overdueReports = pendingReports.filter((r: { period_end?: string | null }) => {
        if (!r.period_end) return false;
        const periodEnd = new Date(r.period_end);
        const daysSince = Math.floor((now.getTime() - periodEnd.getTime()) / 86_400_000);
        return daysSince > 7; // Overdue if more than 7 days past period end
      }).length;
    }

    return NextResponse.json({
      data: {
        pendingReports: {
          count: pendingReportsCount ?? 0,
          overdue: overdueReports,
          latest: pendingReports ?? [],
        },
        pendingInvoices: {
          count: pendingInvoicesCount ?? 0,
          latest: pendingInvoices ?? [],
        },
        pendingReviews: {
          count: pendingReviewsCount ?? 0,
          latest: pendingReviews ?? [],
        },
        lateEodReports: {
          count: lateEodCount,
        },
        totalPending:
          (pendingReportsCount ?? 0) +
          (pendingInvoicesCount ?? 0) +
          (pendingReviewsCount ?? 0) +
          lateEodCount,
      },
    });
  } catch (err) {
    console.error('Pending approvals GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
