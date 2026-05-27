import { logActivity } from '@/lib/audit';
import {
  fivePercentReflectionFiltersSchema,
  submitFivePercentReflectionSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  canManagePerformance,
  getAuthedPerformanceContext,
  listPerformanceAudience,
  resolveEmployeeIdForUser,
  resolvePerformanceIdentitySnapshot,
} from '../_lib';
import { notifyFivePercentReflectionWebhook } from '../_notifications';

function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getAverageRank(input: {
  workRank: number;
  familyRank: number;
  personalRank: number;
}): number {
  return Math.round(((input.workRank + input.familyRank + input.personalRank) / 3) * 10) / 10;
}

function mapSubmissionPayload(
  input: ReturnType<typeof submitFivePercentReflectionSchema.parse>,
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
    work_feelings: input.workFeelings,
    work_headline: input.workHeadline,
    work_significance: input.workSignificance,
    work_rank: input.workRank,
    work_action: input.workAction,
    family_feelings: input.familyFeelings,
    family_headline: input.familyHeadline,
    family_significance: input.familySignificance,
    family_rank: input.familyRank,
    family_action: input.familyAction,
    personal_feelings: input.personalFeelings,
    personal_headline: input.personalHeadline,
    personal_significance: input.personalSignificance,
    personal_rank: input.personalRank,
    personal_action: input.personalAction,
    deep_dive_parking_lot: input.deepDiveParkingLot,
    exploration_topics: input.explorationTopics,
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

      const parsedFilters = fivePercentReflectionFiltersSchema.safeParse({
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
        .from('five_percent_reflections')
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
        console.error('GET /api/performance/five-percent-reflections admin error:', queryError);
        return NextResponse.json({ error: 'Failed to fetch reflections' }, { status: 500 });
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
            average_rank: submission
              ? getAverageRank({
                  workRank: submission.work_rank as number,
                  familyRank: submission.family_rank as number,
                  personalRank: submission.personal_rank as number,
                })
              : null,
            submission,
          };
        });

      return NextResponse.json({ data: merged });
    }

    const profile = await resolvePerformanceIdentitySnapshot(supabaseAdmin, user, role);

    const monthKey = searchParams.get('monthKey') || getCurrentMonthKey();
    const { data, error: queryError } = await supabase
      .from('five_percent_reflections')
      .select('*')
      .eq('user_id', user.id)
      .eq('month_key', monthKey)
      .is('deleted_at', null)
      .maybeSingle();

    if (queryError) {
      console.error('GET /api/performance/five-percent-reflections self error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch reflection' }, { status: 500 });
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
    console.error('GET /api/performance/five-percent-reflections error:', error);
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
    const parsed = submitFivePercentReflectionSchema.safeParse(body);

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
      .from('five_percent_reflections')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !data) {
      if (insertError?.code === '23505') {
        return NextResponse.json(
          { error: 'You already submitted a 5% reflection for this month.' },
          { status: 409 }
        );
      }

      console.error('POST /api/performance/five-percent-reflections error:', insertError);
      return NextResponse.json({ error: 'Failed to submit 5% reflection' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'submit_five_percent_reflection',
      tableName: 'five_percent_reflections',
      recordId: data.id,
      metadata: {
        monthKey: data.month_key,
        departmentRole: data.department_role,
      },
    });

    await notifyFivePercentReflectionWebhook({
      submission: {
        id: data.id,
        user_id: data.user_id,
        employee_id: data.employee_id,
        month_key: data.month_key,
        full_name: data.full_name,
        department_role: data.department_role,
        work_feelings: data.work_feelings,
        work_headline: data.work_headline,
        work_significance: data.work_significance,
        work_rank: data.work_rank,
        work_action: data.work_action,
        family_feelings: data.family_feelings,
        family_headline: data.family_headline,
        family_significance: data.family_significance,
        family_rank: data.family_rank,
        family_action: data.family_action,
        personal_feelings: data.personal_feelings,
        personal_headline: data.personal_headline,
        personal_significance: data.personal_significance,
        personal_rank: data.personal_rank,
        personal_action: data.personal_action,
        deep_dive_parking_lot: data.deep_dive_parking_lot,
        exploration_topics: data.exploration_topics,
        submitted_at: data.submitted_at,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/five-percent-reflections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
