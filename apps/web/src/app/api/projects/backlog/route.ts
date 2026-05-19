/**
 * GET /api/projects/backlog
 *   Returns claimable backlog items + a "count" for the Project Pool badge.
 *   Any authenticated user can read claimable rows (RLS enforces this).
 */

import { NextResponse } from 'next/server';
import { getProjectAuthedContext } from '../_lib';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const ctx = await getProjectAuthedContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const url = new URL(request.url);
  const countOnly = url.searchParams.get('count') === '1';

  if (countOnly) {
    const { count, error } = await ctx.context.supabase
      .from('project_backlog')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'claimable');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ count: count ?? 0 });
  }

  const { data, error } = await ctx.context.supabase
    .from('project_backlog')
    .select(
      'id, title, problem_statement, objective, technical_scope, target_departments, priority, status, created_at'
    )
    .eq('status', 'claimable')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
