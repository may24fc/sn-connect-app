import { logActivity } from '@/lib/audit';
import {
  quarterlyTemperatureCheckFiltersSchema,
  submitQuarterlyTemperatureCheckSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  canManagePerformance,
  getAuthedPerformanceContext,
  listPerformanceAudience,
  resolvePerformanceIdentitySnapshot,
  resolveEmployeeIdForUser,
} from '../_lib';

function getCurrentQuarterKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function mapSubmissionPayload(
  input: ReturnType<typeof submitQuarterlyTemperatureCheckSchema.parse>,
  userId: string,
  employeeId: string | null,
  profile: { fullName: string; departmentRole: string }
) {
  return {
    user_id: userId,
    employee_id: employeeId,
    quarter_key: input.quarterKey,
    full_name: profile.fullName,
    department_role: profile.departmentRole,
    energy_workload_score: input.energyWorkloadScore,
    energy_workload_reason: input.energyWorkloadReason,
    clarity_support: input.claritySupport,
    improvement_change: input.improvementChange,
    achievement_recognition: input.achievementRecognition,
    feedback_suggestions: input.feedbackSuggestions,
    overall_experience_score: input.overallExperienceScore,
    overall_experience_reason: input.overallExperienceReason,
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

      const parsedFilters = quarterlyTemperatureCheckFiltersSchema.safeParse({
        quarterKey: searchParams.get('quarterKey') || undefined,
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
        .from('quarterly_temperature_checks')
        .select('*')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false });

      if (parsedFilters.data.quarterKey) {
        query = query.eq('quarter_key', parsedFilters.data.quarterKey);
      }
      if (parsedFilters.data.employeeId) {
        query = query.eq('employee_id', parsedFilters.data.employeeId);
      }

      const [{ data, error: queryError }, audience] = await Promise.all([
        query,
        listPerformanceAudience(supabaseAdmin),
      ]);
      if (queryError) {
        console.error('GET /api/performance/quarterly-temperature-checks admin error:', queryError);
        return NextResponse.json({ error: 'Failed to fetch temperature checks' }, { status: 500 });
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
            energy_workload_score: submission?.energy_workload_score ?? null,
            overall_experience_score: submission?.overall_experience_score ?? null,
            submission,
          };
        });

      return NextResponse.json({ data: merged });
    }

    const profile = await resolvePerformanceIdentitySnapshot(supabaseAdmin, user, role);

    const quarterKey = searchParams.get('quarterKey') || getCurrentQuarterKey();
    const { data, error: queryError } = await supabase
      .from('quarterly_temperature_checks')
      .select('*')
      .eq('user_id', user.id)
      .eq('quarter_key', quarterKey)
      .is('deleted_at', null)
      .maybeSingle();

    if (queryError) {
      console.error('GET /api/performance/quarterly-temperature-checks self error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch temperature check' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        quarterKey,
        profile,
        submission: data,
        isSubmitted: Boolean(data),
      },
    });
  } catch (error) {
    console.error('GET /api/performance/quarterly-temperature-checks error:', error);
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
    const parsed = submitQuarterlyTemperatureCheckSchema.safeParse(body);

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
      .from('quarterly_temperature_checks')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !data) {
      if (insertError?.code === '23505') {
        return NextResponse.json(
          { error: 'You already submitted a temperature check for this quarter.' },
          { status: 409 }
        );
      }

      console.error('POST /api/performance/quarterly-temperature-checks error:', insertError);
      return NextResponse.json({ error: 'Failed to submit temperature check' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'submit_quarterly_temperature_check',
      tableName: 'quarterly_temperature_checks',
      recordId: data.id,
      metadata: {
        quarterKey: data.quarter_key,
        departmentRole: data.department_role,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/quarterly-temperature-checks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
