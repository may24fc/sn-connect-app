import { type NextRequest, NextResponse } from 'next/server';
import { buildEvaluationCadenceSummary } from '@/lib/performance/evaluation-cadence';
import { getAuthedPerformanceContext } from '../_lib';

export async function GET(_request: NextRequest) {
  try {
    const { supabase, supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!role || !['employee', 'intern'].includes(role)) {
      return NextResponse.json(
        buildEvaluationCadenceSummary({ monthlySubmitted: false, quarterlySubmitted: false })
      );
    }

    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const quarterKey = `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;

    const [monthlyResult, quarterlyResult, cycleResult] = await Promise.all([
      supabase
        .from('monthly_self_evaluations')
        .select('id')
        .eq('user_id', user.id)
        .eq('month_key', monthKey)
        .maybeSingle(),
      supabase
        .from('quarterly_temperature_checks')
        .select('id')
        .eq('user_id', user.id)
        .eq('quarter_key', quarterKey)
        .maybeSingle(),
      supabaseAdmin
        .from('review_cycles')
        .select('self_review_deadline, end_date')
        .eq('status', 'active')
        .lte('start_date', todayIso)
        .gte('end_date', todayIso)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (monthlyResult.error) {
      console.error('GET /api/performance/evaluation-cadence monthly error:', monthlyResult.error);
      return NextResponse.json({ error: 'Failed to resolve monthly cadence status' }, { status: 500 });
    }

    if (quarterlyResult.error) {
      console.error(
        'GET /api/performance/evaluation-cadence quarterly error:',
        quarterlyResult.error
      );
      return NextResponse.json(
        { error: 'Failed to resolve quarterly cadence status' },
        { status: 500 }
      );
    }

    if (cycleResult.error) {
      console.error('GET /api/performance/evaluation-cadence cycle error:', cycleResult.error);
      return NextResponse.json(
        { error: 'Failed to resolve active performance cycle' },
        { status: 500 }
      );
    }

    const quarterlyDueDate =
      cycleResult.data?.self_review_deadline ?? cycleResult.data?.end_date ?? null;

    return NextResponse.json(
      buildEvaluationCadenceSummary({
        monthlySubmitted: Boolean(monthlyResult.data?.id),
        quarterlySubmitted: Boolean(quarterlyResult.data?.id),
      }, now, { quarterlyDueDate })
    );
  } catch (error) {
    console.error('GET /api/performance/evaluation-cadence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}