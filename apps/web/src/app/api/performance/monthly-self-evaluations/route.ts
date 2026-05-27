import { logActivity } from '@/lib/audit';
import {
  monthlySelfEvaluationFiltersSchema,
  submitMonthlySelfEvaluationSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  canManagePerformance,
  getAuthedPerformanceContext,
  listPerformanceAudience,
  resolvePerformanceIdentitySnapshot,
  resolveEmployeeIdForUser,
} from '../_lib';

function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function mapSubmissionPayload(
  input: ReturnType<typeof submitMonthlySelfEvaluationSchema.parse>,
  userId: string,
  employeeId: string | null,
  profile: { fullName: string; departmentRole: string }
) {
  return {
    user_id: userId,
    employee_id: employeeId,
    month_key: input.monthKey,
    full_name: profile.fullName,
    department_role: profile.departmentRole,
    top_three_things_worked_on: input.topThreeThingsWorkedOn,
    biggest_impact: input.biggestImpact,
    impact_reason: input.impactReason,
    significant_achievement: input.significantAchievement,
    challenge_resolved: input.challengeResolved,
    monthly_improvement: input.monthlyImprovement,
    work_slowdown: input.workSlowdown,
    unseen_workflow_issue: input.unseenWorkflowIssue,
    requested_support: input.requestedSupport,
    productivity_score: input.productivityScore,
    productivity_reason: input.productivityReason,
    ownership_outside_role: input.ownershipOutsideRole,
    professional_improvement_area: input.professionalImprovementArea,
    next_skill_to_learn: input.nextSkillToLearn,
    leadership_did_well: input.leadershipDidWell,
    leadership_can_improve: input.leadershipCanImprove,
    contributions_visible: input.contributionsVisible,
    comfortable_raising_concerns: input.comfortableRaisingConcerns,
    hidden_productivity_issue: input.hiddenProductivityIssue,
    immediate_improvement: input.immediateImprovement,
    additional_comments: input.additionalComments || null,
    next_month_goal: input.nextMonthGoal,
    created_by: userId,
    submitted_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope');

    if (scope === 'admin') {
      if (!canManagePerformance(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const parsedFilters = monthlySelfEvaluationFiltersSchema.safeParse({
        monthKey: searchParams.get('monthKey') || undefined,
        departmentRole: searchParams.get('departmentRole') || undefined,
        employeeId: searchParams.get('employeeId') || undefined,
        search: searchParams.get('search') || undefined,
      });

      if (!parsedFilters.success) {
        return NextResponse.json(
          { error: 'Invalid filters', details: parsedFilters.error.flatten() },
          { status: 400 }
        );
      }

      let query = supabaseAdmin
        .from('monthly_self_evaluations')
        .select('*')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false });

      if (parsedFilters.data.monthKey) {
        query = query.eq('month_key', parsedFilters.data.monthKey);
      }
      if (parsedFilters.data.employeeId) {
        query = query.eq('employee_id', parsedFilters.data.employeeId);
      }

      const [{ data, error: queryError }, audience] = await Promise.all([
        query,
        listPerformanceAudience(supabaseAdmin),
      ]);
      if (queryError) {
        console.error('GET /api/performance/monthly-self-evaluations admin error:', queryError);
        return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
      }

      const submissionByUserId = new Map(
        (data || []).map((record) => [record.user_id as string, record])
      );
      const normalizedSearch = parsedFilters.data.search?.trim().toLowerCase() ?? '';

      const merged = audience
        .filter((member) => {
          if (
            parsedFilters.data.departmentRole &&
            member.departmentRole !== parsedFilters.data.departmentRole
          ) {
            return false;
          }

          if (
            parsedFilters.data.employeeId &&
            member.employeeId !== parsedFilters.data.employeeId
          ) {
            return false;
          }

          if (normalizedSearch && !member.fullName.toLowerCase().includes(normalizedSearch)) {
            return false;
          }

          return true;
        })
        .map((member) => {
          const submission = submissionByUserId.get(member.userId) ?? null;

          return {
            id: member.userId,
            user_id: member.userId,
            employee_id: member.employeeId,
            full_name: member.fullName,
            department_role: member.departmentRole,
            avatar_url: member.avatarUrl,
            submission_status: submission ? 'submitted' : 'pending',
            submitted_at: submission?.submitted_at ?? null,
            productivity_score: submission?.productivity_score ?? null,
            submission,
          };
        });

      return NextResponse.json({ data: merged });
    }

    const profile = await resolvePerformanceIdentitySnapshot(supabaseAdmin, user, role);

    const monthKey = searchParams.get('monthKey') || getCurrentMonthKey();
    const { data, error: queryError } = await supabase
      .from('monthly_self_evaluations')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_key', monthKey)
      .is('deleted_at', null)
      .maybeSingle();

    if (queryError) {
      console.error('GET /api/performance/monthly-self-evaluations self error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch evaluation' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        monthKey,
        profile,
        submission: data,
        isSubmitted: Boolean(data),
      },
    });
  } catch (error) {
    console.error('GET /api/performance/monthly-self-evaluations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = submitMonthlySelfEvaluationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const employeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
  const profile = await resolvePerformanceIdentitySnapshot(supabaseAdmin, user, role);
  const insertPayload = mapSubmissionPayload(parsed.data, user.id, employeeId, profile);

    const { data, error: insertError } = await supabaseAdmin
      .from('monthly_self_evaluations')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !data) {
      if (insertError?.code === '23505') {
        return NextResponse.json(
          { error: 'You already submitted a self-evaluation for this month.' },
          { status: 409 }
        );
      }

      console.error('POST /api/performance/monthly-self-evaluations error:', insertError);
      return NextResponse.json({ error: 'Failed to submit self-evaluation' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'submit_monthly_self_evaluation',
      tableName: 'monthly_self_evaluations',
      recordId: data.id,
      metadata: {
        monthKey: data.month_key,
        departmentRole: data.department_role,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/monthly-self-evaluations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}