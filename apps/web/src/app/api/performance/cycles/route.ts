import { logActivity } from '@/lib/audit';
import {
  getReviewCycleName,
  getReviewCycleQuarterBounds,
  updateReviewCycleSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { canManagePerformance, getAuthedPerformanceContext, isPerformanceAdmin } from '../_lib';

function getQuarterFromStartDate(startDate: string): { quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; year: number } {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const quarterNumber = Math.floor(month / 3) + 1;
  const quarter = `Q${quarterNumber}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';

  return { quarter, year };
}

function getNextQuarter(quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', year: number): { quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; year: number } {
  if (quarter === 'Q4') {
    return { quarter: 'Q1', year: year + 1 };
  }

  const nextQuarterNumber = Number.parseInt(quarter.slice(1), 10) + 1;
  return { quarter: `Q${nextQuarterNumber}` as 'Q1' | 'Q2' | 'Q3' | 'Q4', year };
}

function getDeadlineValidationError(
  label: string,
  value: string | null | undefined,
  startDate: string,
  endDate: string
): string | null {
  if (!value) return null;
  if (value < startDate || value > endDate) {
    return `${label} must be within cycle dates (${startDate} to ${endDate})`;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;

    let query = supabaseAdmin
      .from('review_cycles')
      .select('*')
      .order('start_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch review cycles' }, { status: 500 });
    }

    return NextResponse.json(
      { data: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/performance/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManagePerformance(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateReviewCycleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existingCycle, error: existingCycleError } = await supabaseAdmin
      .from('review_cycles')
      .select('id, name, start_date, end_date')
      .eq('id', parsed.data.id)
      .maybeSingle();

    if (existingCycleError) {
      console.error('PATCH /api/performance/cycles fetch error:', existingCycleError);
      return NextResponse.json({ error: 'Failed to load review cycle' }, { status: 500 });
    }

    if (!existingCycle) {
      return NextResponse.json({ error: 'Review cycle not found' }, { status: 404 });
    }

    const payload: Record<string, unknown> = {};
    let effectiveStartDate = existingCycle.start_date;
    let effectiveEndDate = existingCycle.end_date;

    if (parsed.data.quarter && parsed.data.year) {
      const bounds = getReviewCycleQuarterBounds(parsed.data.year, parsed.data.quarter);
      const name = getReviewCycleName(parsed.data.year, parsed.data.quarter);

      const { data: duplicateCycle } = await supabaseAdmin
        .from('review_cycles')
        .select('id')
        .eq('start_date', bounds.startDate)
        .eq('end_date', bounds.endDate)
        .neq('id', parsed.data.id)
        .maybeSingle();

      if (duplicateCycle) {
        return NextResponse.json(
          { error: `Cycle already exists for ${name}.` },
          { status: 409 }
        );
      }

      payload.name = name;
      payload.start_date = bounds.startDate;
      payload.end_date = bounds.endDate;
      effectiveStartDate = bounds.startDate;
      effectiveEndDate = bounds.endDate;
    }

    const deadlineError =
      getDeadlineValidationError(
        'OKR submission deadline',
        parsed.data.okrSubmissionDeadline,
        effectiveStartDate,
        effectiveEndDate
      ) ||
      getDeadlineValidationError(
        'KPI submission deadline',
        parsed.data.kpiSubmissionDeadline,
        effectiveStartDate,
        effectiveEndDate
      ) ||
      getDeadlineValidationError(
        'Self-review deadline',
        parsed.data.selfReviewDeadline,
        effectiveStartDate,
        effectiveEndDate
      ) ||
      getDeadlineValidationError(
        'Manager-review deadline',
        parsed.data.managerReviewDeadline,
        effectiveStartDate,
        effectiveEndDate
      );

    if (deadlineError) {
      return NextResponse.json({ error: deadlineError }, { status: 400 });
    }

    if (parsed.data.description !== undefined) payload.description = parsed.data.description;
    if (parsed.data.okrSubmissionDeadline !== undefined)
      payload.okr_submission_deadline = parsed.data.okrSubmissionDeadline;
    if (parsed.data.kpiSubmissionDeadline !== undefined)
      payload.kpi_submission_deadline = parsed.data.kpiSubmissionDeadline;
    if (parsed.data.selfReviewDeadline !== undefined)
      payload.self_review_deadline = parsed.data.selfReviewDeadline;
    if (parsed.data.managerReviewDeadline !== undefined)
      payload.manager_review_deadline = parsed.data.managerReviewDeadline;
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;

    if (parsed.data.status === 'active') {
      const { error: closeActiveError } = await supabaseAdmin
        .from('review_cycles')
        .update({ status: 'completed' })
        .eq('status', 'active')
        .neq('id', parsed.data.id);

      if (closeActiveError) {
        console.error('PATCH /api/performance/cycles close-active error:', closeActiveError);
        return NextResponse.json({ error: 'Failed to normalize active cycle state' }, { status: 500 });
      }
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('review_cycles')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (updateError || !data) {
      console.error('PATCH /api/performance/cycles update error:', updateError);
      return NextResponse.json({ error: 'Failed to update review cycle' }, { status: 500 });
    }

    if (parsed.data.status === 'completed') {
      const currentQuarter = getQuarterFromStartDate(effectiveStartDate);
      const nextQuarter = getNextQuarter(currentQuarter.quarter, currentQuarter.year);
      const nextQuarterBounds = getReviewCycleQuarterBounds(nextQuarter.year, nextQuarter.quarter);

      const { data: existingNextCycle, error: nextCycleLookupError } = await supabaseAdmin
        .from('review_cycles')
        .select('id')
        .eq('start_date', nextQuarterBounds.startDate)
        .eq('end_date', nextQuarterBounds.endDate)
        .maybeSingle();

      if (nextCycleLookupError) {
        console.error('PATCH /api/performance/cycles next-cycle lookup error:', nextCycleLookupError);
        return NextResponse.json({ error: 'Failed to prepare next quarter cycle' }, { status: 500 });
      }

      if (!existingNextCycle) {
        const nextCycleName = getReviewCycleName(nextQuarter.year, nextQuarter.quarter);
        const { error: createNextCycleError } = await supabaseAdmin.from('review_cycles').insert({
          name: nextCycleName,
          description: null,
          start_date: nextQuarterBounds.startDate,
          end_date: nextQuarterBounds.endDate,
          status: 'draft',
          created_by: user.id,
        });

        if (createNextCycleError) {
          console.error('PATCH /api/performance/cycles next-cycle create error:', createNextCycleError);
          return NextResponse.json({ error: 'Failed to prepare next quarter cycle' }, { status: 500 });
        }
      }
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'update_review_cycle',
      tableName: 'review_cycles',
      recordId: parsed.data.id,
      metadata: { name: data.name },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/performance/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Cycle id is required' }, { status: 400 });
    }

    const { data: deletedCycle, error: deleteError } = await supabaseAdmin
      .from('review_cycles')
      .delete()
      .eq('id', id)
      .select('id, name')
      .maybeSingle();

    if (deleteError) {
      if (deleteError.code === '23503') {
        return NextResponse.json(
          {
            error:
              'Cycle cannot be deleted because it is referenced by existing performance records. Close/archive the cycle instead.',
          },
          { status: 409 }
        );
      }

      console.error('DELETE /api/performance/cycles delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete review cycle' }, { status: 500 });
    }

    if (!deletedCycle) {
      return NextResponse.json(
        { error: 'Review cycle was not deleted. It may not exist or you may not have permission.' },
        { status: 404 }
      );
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'delete_review_cycle',
      tableName: 'review_cycles',
      recordId: deletedCycle.id,
      metadata: { name: deletedCycle.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/performance/cycles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
