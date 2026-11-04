import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import {
  getPersonDisplayName,
  normalizeDepartmentName,
  normalizePersonName,
} from '@/lib/people/directory-people';
import { getWorkManagementScope, isGlobalWorkManager } from '@/lib/work-management/permissions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 250;

export async function GET() {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  let ledDepartmentIds: Array<string>;
  try {
    ({ ledDepartmentIds } = await getWorkManagementScope(supabaseAdmin, user.id, role));
  } catch (error) {
    console.error('Failed to resolve project lead candidates:', error);
    return NextResponse.json({ error: 'Failed to load eligible project leads' }, { status: 500 });
  }
  const people: Array<{
    id: string;
    name: string;
    email: string | null;
    role: string | null;
    department: string | null;
    position: string | null;
    avatarUrl: string | null;
    requiresInvitation: boolean;
  }> = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = supabaseAdmin
      .from('employee_directory')
      .select('user_id, full_name, email, role, department_name, position, avatar_url')
      .not('user_id', 'is', null)
      .neq('status', 'terminated');
    const { data, error } = await query
      .order('full_name', { ascending: true })
      .order('user_id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error('Failed to load project lead candidates:', error);
      return NextResponse.json({ error: 'Failed to load eligible project leads' }, { status: 500 });
    }

    const userIds = (data ?? []).flatMap((person) => person.user_id ? [person.user_id] : []);
    const { data: users, error: usersError } = userIds.length
      ? await supabaseAdmin
          .from('users')
          .select('id, department_id')
          .in('id', userIds)
          .is('deleted_at', null)
          .neq('status', 'terminated')
      : { data: [], error: null };
    if (usersError) {
      console.error('Failed to validate project lead candidates:', usersError.code);
      return NextResponse.json({ error: 'Failed to load eligible project leads' }, { status: 500 });
    }
    const departments = new Map((users ?? []).map((candidate) => [candidate.id, candidate.department_id]));
    for (const person of data ?? []) {
      if (!person.user_id || !departments.has(person.user_id)) continue;
      const departmentId = departments.get(person.user_id);
      people.push({
        id: person.user_id,
        name: isGlobalWorkManager(role)
          ? getPersonDisplayName(person.full_name, person.email)
          : normalizePersonName(person.full_name) ?? 'Unnamed account',
        email: isGlobalWorkManager(role) ? person.email : null,
        role: person.role,
        department: normalizeDepartmentName(person.department_name),
        position: person.position?.trim() || null,
        avatarUrl: person.avatar_url,
        requiresInvitation:
          person.user_id !== user.id &&
          (!departmentId || !ledDepartmentIds.includes(departmentId)),
      });
    }
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }

  return NextResponse.json({ data: people });
}
