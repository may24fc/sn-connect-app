import { logActivity } from '@/lib/audit';
import { getSubmissionEditStatus } from '@/lib/performance/submission-edit-status';
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
import { notifyPerformanceEvaluationManagers } from '../_notifications';

function getCurrentQuarterKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function mapSubmissionPayload(
  input: ReturnType<typeof submitQuarterlyTemperatureCheckSchema.parse>,
  userId: string,
  employeeId: string | null,
  profile: { fullName: string; departmentRole: string },
  timestamp: string
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
    submitted_at: timestamp,
    updated_at: timestamp,
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
          const editStatus = getSubmissionEditStatus({
            submittedAt: submission?.submitted_at ?? null,
            updatedAt: submission?.updated_at ?? null,
          });

          return {
            id: member.userId,
            user_id: member.userId,
            employee_id: member.employeeId,
            full_name: member.fullName,
            department_role: member.departmentRole,
            avatar_url: member.avatarUrl,
            submission_status: submission ? 'submitted' : 'pending',
            submitted_at: submission?.submitted_at ?? null,
            last_employee_edit_at: editStatus.lastEmployeeEditAt,
            has_employee_edits: editStatus.hasEmployeeEdits,
            energy_workload_score: submission?.energy_workload_score ?? null,
            overall_experience_score: submission?.overall_experience_score ?? null,
            submission,
          };
        });

      const audienceUserIds = new Set(audience.map((member) => member.userId));
      const supplementalSubmissions = (data || [])
        .filter((record) => !audienceUserIds.has(record.user_id as string))
        .filter((record) => {
          if (
            parsedFilters.data.departmentRole &&
            record.department_role !== parsedFilters.data.departmentRole
          ) {
            return false;
          }

          if (parsedFilters.data.employeeId && record.employee_id !== parsedFilters.data.employeeId) {
            return false;
          }

          if (normalizedSearch && !String(record.full_name || '').toLowerCase().includes(normalizedSearch)) {
            return false;
          }

          return true;
        })
        .map((submission) => {
          const editStatus = getSubmissionEditStatus({
            submittedAt: submission.submitted_at ?? null,
            updatedAt: submission.updated_at ?? null,
          });

          return {
            id: submission.user_id as string,
            user_id: submission.user_id as string,
            employee_id: (submission.employee_id as string | null) ?? null,
            full_name: String(submission.full_name || 'Unknown user'),
            department_role: String(submission.department_role || 'Unassigned'),
            avatar_url: null,
            submission_status: 'submitted' as const,
            submitted_at: submission.submitted_at ?? null,
            last_employee_edit_at: editStatus.lastEmployeeEditAt,
            has_employee_edits: editStatus.hasEmployeeEdits,
            energy_workload_score: submission.energy_workload_score ?? null,
            overall_experience_score: submission.overall_experience_score ?? null,
            submission,
          };
        });

      return NextResponse.json({
        data: [...merged, ...supplementalSubmissions].sort((left, right) =>
          left.full_name.localeCompare(right.full_name)
        ),
      });
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
    const timestamp = new Date().toISOString();
    const submissionPayload = mapSubmissionPayload(parsed.data, user.id, employeeId, profile, timestamp);

    const { data: existingSubmission, error: existingSubmissionError } = await supabaseAdmin
      .from('quarterly_temperature_checks')
      .select('id, submitted_at')
      .eq('user_id', user.id)
      .eq('quarter_key', parsed.data.quarterKey)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingSubmissionError) {
      console.error(
        'POST /api/performance/quarterly-temperature-checks existing submission lookup error:',
        existingSubmissionError
      );
      return NextResponse.json({ error: 'Failed to submit temperature check' }, { status: 500 });
    }

    if (existingSubmission) {
      const { data, error: updateError } = await supabaseAdmin
        .from('quarterly_temperature_checks')
        .update({
          ...submissionPayload,
          submitted_at: existingSubmission.submitted_at,
          updated_at: timestamp,
        })
        .eq('id', existingSubmission.id)
        .select('*')
        .single();

      if (updateError || !data) {
        console.error('POST /api/performance/quarterly-temperature-checks update error:', updateError);
        return NextResponse.json({ error: 'Failed to update temperature check' }, { status: 500 });
      }

      logActivity(supabaseAdmin, {
        userId: user.id,
        action: 'update_quarterly_temperature_check',
        tableName: 'quarterly_temperature_checks',
        recordId: data.id,
        metadata: {
          quarterKey: data.quarter_key,
          departmentRole: data.department_role,
        },
      });

      await notifyPerformanceEvaluationManagers({
        evaluationKind: 'quarterly',
        action: 'updated',
        submissionId: data.id,
        submittedBy: user.id,
        cycleKey: data.quarter_key,
        departmentRole: data.department_role,
      });

      return NextResponse.json({ data });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('quarterly_temperature_checks')
      .insert(submissionPayload)
      .select('*')
      .single();

    if (insertError || !data) {
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

    await notifyPerformanceEvaluationManagers({
      evaluationKind: 'quarterly',
      action: 'submitted',
      submissionId: data.id,
      submittedBy: user.id,
      cycleKey: data.quarter_key,
      departmentRole: data.department_role,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/quarterly-temperature-checks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
