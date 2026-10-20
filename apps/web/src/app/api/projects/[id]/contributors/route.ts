import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { normalizeDepartmentName, normalizePersonName } from '@/lib/people/directory-people';
import { contributorAddSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext } from '../../_lib';
import { canManageProject } from '@/lib/work-management/permissions';

export const dynamic = 'force-dynamic';

const CANDIDATE_PAGE_SIZE = 25;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CandidateRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  position: string | null;
  department_name: string | null;
  role: string | null;
}

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

async function ensureCanManageContributors(
  supabaseAdmin: ReturnType<
    typeof import('@/lib/supabase/server').createSupabaseAdminClient
  >,
  projectId: string,
  userId: string,
  role: string | null
): Promise<boolean> {
  return canManageProject(supabaseAdmin, projectId, userId, role);
}

/**
 * GET /api/projects/[id]/contributors?search=
 * People who can be added as contributors, for whoever may manage this project's contributors.
 * Project leads are usually associates without directory access, so this returns only the
 * identity the picker shows (no email or contact details) and excludes current contributors.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  if (!(await ensureCanManageContributors(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 100);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('project_contributors')
    .select('user_id')
    .eq('project_id', projectId);

  if (existingError) {
    return NextResponse.json({ error: 'Failed to load contributors' }, { status: 500 });
  }

  let query = supabaseAdmin
    .from('employee_directory')
    .select('user_id, full_name, avatar_url, position, department_name, role', { count: 'exact' })
    .not('user_id', 'is', null)
    .neq('status', 'terminated');

  const existingIds = (existing ?? []).map((row: { user_id: string }) => row.user_id);
  if (existingIds.length > 0) {
    query = query.filter('user_id', 'not.in', `(${existingIds.join(',')})`);
  }

  if (search) {
    query = query.ilike('full_name', `%${escapeLikePattern(search)}%`);
  }

  const { data, error, count } = await query
    .order('full_name', { ascending: true })
    .range(0, CANDIDATE_PAGE_SIZE - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to load people' }, { status: 500 });
  }

  return NextResponse.json({
    data: ((data ?? []) as Array<CandidateRow>).map((row) => ({
      user_id: row.user_id,
      full_name: normalizePersonName(row.full_name) ?? 'Unnamed account',
      avatar_url: row.avatar_url,
      position: row.position?.trim() || null,
      department_name: normalizeDepartmentName(row.department_name),
      role: row.role,
    })),
    total: count ?? 0,
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await ensureCanManageContributors(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = contributorAddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from('project_contributors')
    .upsert(
      { project_id: projectId, user_id: parsed.data.userId, role: parsed.data.role },
      { onConflict: 'project_id,user_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_contributor_added',
    tableName: 'project_contributors',
    recordId: projectId,
    metadata: { contributor: parsed.data.userId, role: parsed.data.role },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await ensureCanManageContributors(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userIdToRemove = request.nextUrl.searchParams.get('userId');
  if (!userIdToRemove) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('project_contributors')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userIdToRemove);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_contributor_removed',
    tableName: 'project_contributors',
    recordId: projectId,
    metadata: { contributor: userIdToRemove },
  });

  return NextResponse.json({ ok: true });
}
