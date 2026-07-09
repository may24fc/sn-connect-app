import {
  getRevenueForecastAuthedContext,
  hasRevenueForecastAccess,
  isRevenueForecastAdmin,
} from '@/app/api/revenue-forecast/_lib';
import { revenueForecastGoalCreateSchema } from '@/lib/schemas/revenue-forecast.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasRevenueForecastAccess(auth.context.role, auth.context.hasGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = yearQuerySchema.safeParse({
      year: request.nextUrl.searchParams.get('year') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid year query parameter' }, { status: 400 });
    }

    const year = parsed.data.year;

    let query = auth.context.supabaseAdmin
      .from('sfo_revenue_goals')
      .select('id, year, goal_amount_aud, label, sort_order, created_at, updated_at')
      .is('deleted_at', null)
      .order('year', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (typeof year === 'number') {
      query = query.eq('year', year);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch revenue goals:', error);
      return NextResponse.json({ error: 'Failed to fetch revenue goals' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/revenue-forecast/goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isRevenueForecastAdmin(auth.context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = revenueForecastGoalCreateSchema.safeParse(
      await request.json().catch(() => ({}))
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { error } = await auth.context.supabaseAdmin.from('sfo_revenue_goals').insert({
      year: payload.year,
      goal_amount_aud: payload.goalAmountAud,
      label: payload.label ?? null,
      sort_order: payload.sortOrder,
      created_by: auth.context.user.id,
      updated_by: auth.context.user.id,
    });

    if (error) {
      console.error('Failed to create revenue goal:', error);
      return NextResponse.json({ error: 'Failed to create revenue goal' }, { status: 500 });
    }

    const { data: goals, error: listError } = await auth.context.supabaseAdmin
      .from('sfo_revenue_goals')
      .select('id, year, goal_amount_aud, label, sort_order, created_at, updated_at')
      .is('deleted_at', null)
      .eq('year', payload.year)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (listError) {
      console.error('Failed to reload revenue goals:', listError);
      return NextResponse.json({ error: 'Failed to reload revenue goals' }, { status: 500 });
    }

    return NextResponse.json({ data: goals ?? [] }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/revenue-forecast/goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
