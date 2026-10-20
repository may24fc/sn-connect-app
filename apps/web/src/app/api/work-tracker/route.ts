import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import {
  type DirectoryPerson,
  loadDirectoryPeople,
  normalizeDepartmentName,
} from '@/lib/people/directory-people';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getManagedMemberIds,
  getWorkManagementScope,
} from '@/lib/work-management/permissions';

export const dynamic = 'force-dynamic';

type WorkItem =
  | {
      source: 'project';
      id: string;
      title: string;
      description: string | null;
      status: string;
      health: string | null;
      progressPct: number;
      dueDate: string | null;
      updatedAt: string;
      href: string;
      projectRole: 'lead' | 'contributor';
    }
  | {
      source: 'task';
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      dueDate: string | null;
      updatedAt: string;
      href: string;
      projectId: string | null;
      projectName: string | null;
      milestoneId: string | null;
      milestoneName: string | null;
      blockedReason: string | null;
    };

interface StaffRow {
  user_id: string;
  full_name: string | null;
  department_name: string | null;
  role: string | null;
  status: string;
  avatar_url: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  lead_user_id: string;
  status: string;
  health: string;
  progress_pct: number | null;
  target_end_date: string | null;
  updated_at: string;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  milestone_id: string | null;
  blocked_reason: string | null;
}

interface UsageRow {
  user_id: string;
  activity_date: string;
  last_seen_at: string;
  session_count: number;
}

function manilaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function rangeStart(days: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - (days - 1));
  return manilaDate(value);
}

export async function GET(request: NextRequest) {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  const scope = request.nextUrl.searchParams.get('scope') === 'team' ? 'team' : 'mine';
  const requestedDays = Number.parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const managementScope = await getWorkManagementScope(supabaseAdmin, user.id, role);
  const canViewTeam = managementScope.isGlobal || managementScope.ledDepartmentIds.length > 0;

  if (scope === 'team' && !canViewTeam) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [
    staffResult,
    projectsResult,
    contributorsResult,
    milestonesResult,
    initialTasksResult,
    usageResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('employee_directory')
      .select('user_id, full_name, department_name, role, status, avatar_url')
      .in('role', ['employee', 'associate'])
      // Probation is an employment_type; active probationary staff are included here.
      .in('status', ['active', 'on_leave'])
      .not('user_id', 'is', null),
    supabaseAdmin
      .from('projects')
      .select(
        'id, name, description, lead_user_id, status, health, progress_pct, target_end_date, updated_at'
      )
      .is('deleted_at', null),
    supabaseAdmin.from('project_contributors').select('project_id, user_id, role'),
    supabaseAdmin
      .from('project_milestones')
      .select('id, project_id, title, due_date, status')
      .is('deleted_at', null),
    supabaseAdmin
      .from('tasks')
      .select(
        'id, title, description, assigned_to, status, priority, due_date, completed_at, created_at, updated_at, project_id, milestone_id, blocked_reason'
      )
      .is('deleted_at', null),
    supabaseAdmin
      .from('hub_usage_daily')
      .select('user_id, activity_date, last_seen_at, session_count')
      .gte('activity_date', rangeStart(days)),
  ]);

  let tasksError = initialTasksResult.error;
  let taskRows = initialTasksResult.data as Array<Partial<TaskRow>> | null;
  let taskProjectLinksAvailable = true;

  // Keep the core tracker available during a staggered schema rollout. The project-link columns
  // were added after the tasks table, so an older database can still provide useful task data.
  if (tasksError) {
    const legacyTasksResult = await supabaseAdmin
      .from('tasks')
      .select(
        'id, title, description, assigned_to, status, priority, due_date, completed_at, created_at, updated_at'
      )
      .is('deleted_at', null);

    if (!legacyTasksResult.error) {
      console.warn('GET /api/work-tracker: task project links are unavailable:', tasksError);
      taskRows = legacyTasksResult.data as Array<Partial<TaskRow>> | null;
      tasksError = null;
      taskProjectLinksAvailable = false;
    }
  }

  const firstError = [
    staffResult.error,
    projectsResult.error,
    contributorsResult.error,
    milestonesResult.error,
    tasksError,
  ].find(Boolean);
  if (firstError) {
    console.error('GET /api/work-tracker failed:', firstError);
    return NextResponse.json({ error: 'Failed to load work tracker' }, { status: 500 });
  }

  const managedMemberIds = await getManagedMemberIds(supabaseAdmin, user.id, role);
  const managedMemberSet = managedMemberIds ? new Set(managedMemberIds) : null;
  const allStaff = (staffResult.data ?? []) as Array<StaffRow>;
  const allProjects = (projectsResult.data ?? []) as Array<ProjectRow>;
  let departmentProjectIds: Set<string> | null = null;
  if (!managementScope.isGlobal && managementScope.ledDepartmentIds.length > 0) {
    const { data: departmentProjects } = await supabaseAdmin
      .from('project_departments')
      .select('project_id')
      .in('department_id', managementScope.ledDepartmentIds)
      .eq('status', 'active');
    departmentProjectIds = new Set((departmentProjects ?? []).map((row) => row.project_id));
  }
  const staff = scope === 'team' && managedMemberSet
    ? allStaff.filter((member) => managedMemberSet.has(member.user_id))
    : allStaff;
  const projects = scope === 'team' && departmentProjectIds
    ? allProjects.filter((project) => departmentProjectIds.has(project.id))
    : allProjects;
  if (usageResult.error) {
    console.warn('GET /api/work-tracker: hub usage analytics are unavailable:', usageResult.error);
  }

  const allTasks = (taskRows ?? []).map((task) => ({
    ...(task as Omit<TaskRow, 'project_id'>),
    project_id: taskProjectLinksAvailable
      ? ((task as { project_id?: string | null }).project_id ?? null)
      : null,
  }));
  const tasks = scope === 'team' && managedMemberSet
    ? allTasks.filter((task) => !!task.assigned_to && managedMemberSet.has(task.assigned_to))
    : allTasks;
  const canSeeUsage = managementScope.isGlobal;
  const usage = (canSeeUsage && !usageResult.error ? (usageResult.data ?? []) : []) as Array<UsageRow>;
  const usageAvailable = canSeeUsage && !usageResult.error;
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const milestoneById = new Map(
    (milestonesResult.data ?? []).map((milestone) => [milestone.id, milestone.title])
  );
  const milestones = (milestonesResult.data ?? []) as Array<{
    id: string;
    project_id: string;
    title: string;
    due_date: string;
    status: string;
  }>;
  const projectMembers = new Map<string, Map<string, 'lead' | 'contributor'>>();

  for (const project of projects) {
    projectMembers.set(project.id, new Map([[project.lead_user_id, 'lead']]));
  }
  for (const contributor of contributorsResult.data ?? []) {
    const members = projectMembers.get(contributor.project_id);
    if (!members || members.has(contributor.user_id)) continue;
    members.set(contributor.user_id, 'contributor');
  }

  const buildItems = (userId: string): Array<WorkItem> => {
    const projectItems: Array<WorkItem> = projects.flatMap((project) => {
      const projectRole = projectMembers.get(project.id)?.get(userId);
      if (!projectRole) return [];
      return [
        {
          source: 'project' as const,
          id: project.id,
          title: project.name,
          description: project.description,
          status: project.status,
          health: project.health,
          progressPct: Number(project.progress_pct ?? 0),
          dueDate: project.target_end_date,
          updatedAt: project.updated_at,
          href: `/projects/${project.id}`,
          projectRole,
        },
      ];
    });

    const taskItems: Array<WorkItem> = tasks
      .filter((task) => task.assigned_to === userId)
      .map((task) => ({
        source: 'task' as const,
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        updatedAt: task.updated_at,
        href: `/tasks/${task.id}`,
        projectId: task.project_id,
        projectName: task.project_id ? (projectById.get(task.project_id)?.name ?? null) : null,
        milestoneId: task.milestone_id ?? null,
        milestoneName: task.milestone_id ? (milestoneById.get(task.milestone_id) ?? null) : null,
        blockedReason: task.blocked_reason ?? null,
      }));

    return [...projectItems, ...taskItems].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  };

  const buildSummary = (staffMember: StaffRow) => {
    const items = buildItems(staffMember.user_id);
    const projectItems = items.filter(
      (item): item is Extract<WorkItem, { source: 'project' }> => item.source === 'project'
    );
    const taskItems = items.filter(
      (item): item is Extract<WorkItem, { source: 'task' }> => item.source === 'task'
    );
    const activeProjects = projectItems.filter(
      (item) => !['completed', 'archived'].includes(item.status)
    );
    const periodStart = rangeStart(days);
    const completedTasks = tasks.filter(
      (task) =>
        task.assigned_to === staffMember.user_id &&
        task.status === 'completed' &&
        !!task.completed_at &&
        manilaDate(new Date(task.completed_at)) >= periodStart
    ).length;
    const usageRows = usage.filter((entry) => entry.user_id === staffMember.user_id);

    return {
      userId: staffMember.user_id,
      name: staffMember.full_name?.trim() || 'Unnamed staff member',
      department: normalizeDepartmentName(staffMember.department_name),
      role: staffMember.role,
      avatarUrl: staffMember.avatar_url?.trim() || null,
      activeProjectCount: activeProjects.length,
      averageProjectProgress: activeProjects.length
        ? Math.round(
            activeProjects.reduce((sum, item) => sum + item.progressPct, 0) / activeProjects.length
          )
        : 0,
      openTaskCount: taskItems.filter((item) =>
        ['pending', 'in_progress', 'blocked'].includes(item.status)
      ).length,
      completedTaskCount: completedTasks,
      blockedCount: taskItems.filter((item) => item.status === 'blocked').length,
      overdueCount: taskItems.filter(
        (item) =>
          !!item.dueDate &&
          item.dueDate < new Date().toISOString() &&
          !['completed', 'cancelled'].includes(item.status)
      ).length,
      lastActiveAt: usageRows.reduce<string | null>(
        (latest, entry) => (!latest || entry.last_seen_at > latest ? entry.last_seen_at : latest),
        null
      ),
      activeDays: new Set(usageRows.map((entry) => entry.activity_date)).size,
      sessionCount: usageRows.reduce((sum, entry) => sum + entry.session_count, 0),
      items,
    };
  };

  // Staff only covers employees and associates; projects led by admins resolve their lead from the
  // directory so the roadmap never shows "Unassigned" for a project that has a lead.
  const staffById = new Map(staff.map((member) => [member.user_id, member]));
  const visibleProjects =
    scope === 'mine'
      ? projects.filter((project) => projectMembers.get(project.id)?.has(user.id))
      : projects;
  const directoryPeople: Map<string, DirectoryPerson> = await loadDirectoryPeople(supabaseAdmin, [
    ...visibleProjects
      .map((project) => project.lead_user_id)
      .filter((leadUserId) => !staffById.has(leadUserId)),
    ...(scope === 'mine' && !staffById.has(user.id) ? [user.id] : []),
  ]);
  const buildProjectSummary = (project: ProjectRow) => {
    const leadStaff = staffById.get(project.lead_user_id);
    const leadPerson = directoryPeople.get(project.lead_user_id);
    const projectTasks = tasks.filter(
      (task) => task.project_id === project.id && task.status !== 'cancelled'
    );
    const nextMilestone = milestones
      .filter(
        (milestone) =>
          milestone.project_id === project.id &&
          !['approved', 'completed'].includes(milestone.status)
      )
      .sort((left, right) => left.due_date.localeCompare(right.due_date))[0];
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      health: project.health,
      progressPct: Number(project.progress_pct ?? 0),
      dueDate: project.target_end_date,
      nextMilestone: nextMilestone
        ? { title: nextMilestone.title, dueDate: nextMilestone.due_date }
        : null,
      leadUserId: project.lead_user_id,
      leadName: leadStaff?.full_name?.trim() || leadPerson?.name || null,
      leadAvatarUrl: leadStaff?.avatar_url?.trim() || leadPerson?.avatarUrl || null,
      totalTasks: projectTasks.length,
      completedTasks: projectTasks.filter((task) => task.status === 'completed').length,
      blockedTasks: projectTasks.filter((task) => task.status === 'blocked').length,
      overdueTasks: projectTasks.filter(
        (task) =>
          !!task.due_date &&
          task.due_date < new Date().toISOString() &&
          !['completed', 'cancelled'].includes(task.status)
      ).length,
    };
  };

  if (scope === 'mine') {
    const ownDirectoryRow = directoryPeople.get(user.id);
    const matchingStaff: StaffRow = staffById.get(user.id) ?? {
      user_id: user.id,
      full_name: ownDirectoryRow?.name ?? null,
      department_name: ownDirectoryRow?.department ?? null,
      role: ownDirectoryRow?.role ?? role ?? null,
      status: 'active',
      avatar_url: ownDirectoryRow?.avatarUrl ?? null,
    };
    return NextResponse.json({
      scope,
      days,
      canAssignTasks: canViewTeam,
      canViewTeam,
      teamLabel: managementScope.isGlobal ? 'Team visibility' : 'My department',
      usageAvailable,
      usageRestricted: !canSeeUsage,
      person: buildSummary(matchingStaff),
      projects: visibleProjects.map(buildProjectSummary),
    });
  }

  const people = staff.map(buildSummary).sort((left, right) => left.name.localeCompare(right.name));

  return NextResponse.json({
    scope,
    days,
    canAssignTasks: canViewTeam,
    canViewTeam,
    teamLabel: managementScope.isGlobal ? 'Team visibility' : 'My department',
    usageAvailable,
    usageRestricted: !canSeeUsage,
    people,
    projects: visibleProjects.map(buildProjectSummary),
    unassignedTaskCount: tasks.filter(
      (task) => !task.assigned_to && ['pending', 'in_progress', 'blocked'].includes(task.status)
    ).length,
  });
}
