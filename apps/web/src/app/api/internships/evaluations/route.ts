import { logActivity } from '@/lib/audit';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedInternshipContext, isInternshipAdmin } from '../_lib';

const associateEvaluationListQuerySchema = z.object({
  internshipIds: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return [] as string[];
      return value
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
    })
    .pipe(z.array(z.string().uuid()).max(200)),
});

const upsertAssociateEvaluationSchema = z.object({
  internshipId: z.string().uuid(),
  stage: z.number().int().min(1).max(4),
  overallAssessment: z.string().trim().min(1).max(8000),
  keyStrengths: z.string().trim().min(1).max(8000),
  areasForContinuedGrowth: z.string().trim().min(1).max(8000),
  overallPerformance: z.number().int().min(1).max(5),
});

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedInternshipContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isInternshipAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = associateEvaluationListQuerySchema.safeParse({
      internshipIds: request.nextUrl.searchParams.get('internshipIds') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let query = supabase
      .from('associate_evaluations')
      .select(
        'id, internship_id, employee_id, stage, overall_assessment, key_strengths, areas_for_continued_growth, overall_performance, evaluated_by, evaluated_at, updated_at, deleted_at'
      )
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (parsed.data.internshipIds.length > 0) {
      query = query.in('internship_id', parsed.data.internshipIds);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error('GET /api/internships/evaluations error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch associate evaluations' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/internships/evaluations unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedInternshipContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isInternshipAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = upsertAssociateEvaluationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: internship, error: internshipError } = await supabase
      .from('internships')
      .select('id, employee_id, deleted_at')
      .eq('id', parsed.data.internshipId)
      .is('deleted_at', null)
      .maybeSingle();

    if (internshipError || !internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    const { data, error: upsertError } = await supabase
      .from('associate_evaluations')
      .upsert(
        {
          internship_id: parsed.data.internshipId,
          employee_id: internship.employee_id,
          stage: parsed.data.stage,
          overall_assessment: parsed.data.overallAssessment,
          key_strengths: parsed.data.keyStrengths,
          areas_for_continued_growth: parsed.data.areasForContinuedGrowth,
          overall_performance: parsed.data.overallPerformance,
          evaluated_by: user.id,
          evaluated_at: nowIso,
          created_by: user.id,
          deleted_at: null,
        },
        { onConflict: 'internship_id,stage' }
      )
      .select('id, internship_id, employee_id, stage, overall_assessment, key_strengths, areas_for_continued_growth, overall_performance, evaluated_by, evaluated_at, updated_at')
      .single();

    if (upsertError || !data) {
      console.error('POST /api/internships/evaluations error:', upsertError);
      return NextResponse.json({ error: 'Failed to save associate evaluation' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'upsert_associate_evaluation',
      tableName: 'associate_evaluations',
      recordId: data.id,
      metadata: {
        internshipId: data.internship_id,
        employeeId: data.employee_id,
        stage: data.stage,
        overallPerformance: data.overall_performance,
      },
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('POST /api/internships/evaluations unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
