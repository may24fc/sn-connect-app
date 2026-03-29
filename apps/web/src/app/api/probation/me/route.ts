import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function daysBetweenToday(dateValue: string): number {
  const target = new Date(dateValue);
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function getStage(dateHired: string, probationEndDate: string): 1 | 2 | 3 | 4 {
  const start = new Date(dateHired);
  const end = new Date(probationEndDate);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const elapsed = Math.max(0, Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const ratio = elapsed / totalDays;

  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the current user's employee record
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, date_hired, probation_end_date, position, department')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (employeeError) {
      return NextResponse.json({ error: 'Failed to fetch employee data' }, { status: 500 });
    }

    // No employee record or no probation period set
    if (!employee || !employee.probation_end_date) {
      if (!employee) {
        return NextResponse.json({
          data: null,
          onProbation: false,
          probationState: 'none',
        });
      }

      const { data: latestCompletedReview } = await supabase
        .from('performance_reviews')
        .select('final_rating, manager_comments, completed_at')
        .eq('employee_id', employee.id)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestCompletedReview) {
        return NextResponse.json({
          data: null,
          onProbation: false,
          probationState: 'none',
        });
      }

      return NextResponse.json({
        data: {
          employeeId: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          position: employee.position,
          department: employee.department,
          startDate: employee.date_hired,
          endDate: null,
          stage: 4,
          status: 'completed',
          daysRemaining: 0,
          totalDays: 90,
          elapsedDays: 90,
          progressPercent: 100,
          finalRating: latestCompletedReview.final_rating,
          managerComments: latestCompletedReview.manager_comments,
          completedAt: latestCompletedReview.completed_at,
        },
        onProbation: false,
        probationState: 'completed',
      });
    }

    const daysRemaining = daysBetweenToday(employee.probation_end_date);
    const stage = getStage(employee.date_hired, employee.probation_end_date);

    // Check if extended beyond 90-day baseline
    const baselineEnd = new Date(employee.date_hired);
    baselineEnd.setDate(baselineEnd.getDate() + 90);
    const isExtended = new Date(employee.probation_end_date) > baselineEnd;

    const status =
      daysRemaining <= 0
        ? 'completed'
        : isExtended
          ? 'extended'
          : daysRemaining <= 14
            ? 'at-risk'
            : 'on-track';

    // Calculate total probation days elapsed and total
    const start = new Date(employee.date_hired);
    const end = new Date(employee.probation_end_date);
    const totalDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    const elapsedDays = Math.max(
      0,
      Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    const progressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    return NextResponse.json({
      data: {
        employeeId: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        position: employee.position,
        department: employee.department,
        startDate: employee.date_hired,
        endDate: employee.probation_end_date,
        stage,
        status,
        daysRemaining: Math.max(0, daysRemaining),
        totalDays,
        elapsedDays: Math.min(elapsedDays, totalDays),
        progressPercent,
        finalRating: null,
        managerComments: null,
        completedAt: null,
      },
      onProbation: daysRemaining > 0,
      probationState: daysRemaining > 0 ? 'active' : 'completed',
    });
  } catch (error) {
    console.error('GET /api/probation/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
