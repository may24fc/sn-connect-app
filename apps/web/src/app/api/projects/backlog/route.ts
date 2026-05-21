/**
 * GET /api/projects/backlog
 *   Returns claimable backlog items by default, plus archived rows for
 *   super-admin review when explicitly requested.
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
  const statusParam = url.searchParams.get('status') ?? 'claimable';

  if (statusParam !== 'claimable' && statusParam !== 'archived') {
    return NextResponse.json({ error: 'Invalid backlog status' }, { status: 400 });
  }

  if (statusParam === 'archived' && ctx.context.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const backlogClient =
    statusParam === 'archived' ? ctx.context.supabaseAdmin : ctx.context.supabase;

  if (countOnly) {
    const { count, error } = await backlogClient
      .from('project_backlog')
      .select('id', { count: 'exact', head: true })
      .eq('status', statusParam);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ count: count ?? 0 });
  }

  const { data, error } = await backlogClient
    .from('project_backlog')
    .select(
      'id, title, problem_statement, objective, technical_scope, target_departments, priority, status, created_at'
    )
    .eq('status', statusParam)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
