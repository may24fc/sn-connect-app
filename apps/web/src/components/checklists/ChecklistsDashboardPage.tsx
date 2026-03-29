'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import {
  ChecklistManagementDialog,
  type ChecklistManagementTab,
} from '@/components/checklists/ChecklistManagementDialog';
import { type OffboardingRecord, useOffboardingAdminList } from '@/hooks/useOffboarding';
import { type OnboardingProfileListItem, useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import { queryKeys } from '@/lib/query-keys';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import { useQueries } from '@tanstack/react-query';
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Loader2,
  LogOut,
  Pencil,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

interface OnboardingTaskRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
}

interface OnboardingChecklistRecord {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  onboarding_tasks: Array<OnboardingTaskRecord>;
}

interface ChecklistDashboardRow {
  profile: OnboardingProfileListItem;
  checklist: OnboardingChecklistRecord | null;
  isLoading: boolean;
  isError: boolean;
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return 'No date set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No date set';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function getWizardStatus(profile: OnboardingProfileListItem): {
  label: string;
  variant: 'success' | 'warning';
} {
  if (profile.status === 'completed') {
    return { label: 'Submitted', variant: 'success' };
  }

  return {
    label: `In ${profile.current_step.replaceAll('_', ' ')}`,
    variant: 'warning',
  };
}

function ChecklistRoleSection({
  title,
  description,
  rows,
  isLoadingProfiles,
  controls,
}: {
  title: string;
  description: string;
  rows: Array<ChecklistDashboardRow>;
  isLoadingProfiles: boolean;
  controls?: ReactNode;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {controls ? <div className="w-full lg:w-56">{controls}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingProfiles ? (
          <EmptyState
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            title="Loading profiles"
            description="Retrieving onboarding profiles and checklist coverage."
            size="sm"
          />
        ) : null}

        {!isLoadingProfiles && rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No onboarding profiles found"
            description="Profiles will appear here after onboarding is initiated for employees or interns."
            size="sm"
          />
        ) : null}

        {rows.map((row) => {
          const wizardStatus = getWizardStatus(row.profile);
          const taskCount = row.checklist?.onboarding_tasks.length ?? 0;
          const completedTaskCount = row.checklist?.onboarding_tasks.filter((task) => task.is_completed).length ?? 0;

          return (
            <div
              key={row.profile.id}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{row.profile.full_name}</h3>
                    <Badge variant={wizardStatus.variant}>{wizardStatus.label}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {Array.isArray(row.profile.users)
                        ? row.profile.users[0]?.role ?? 'employee'
                        : row.profile.users?.role ?? 'employee'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.profile.email_address ?? 'No email available'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {taskCount === 0
                        ? 'Wizard only'
                        : `${completedTaskCount}/${taskCount} custom task${taskCount === 1 ? '' : 's'} complete`}
                    </Badge>
                    {row.profile.departments ? (
                      <Badge variant="outline">
                        {Array.isArray(row.profile.departments)
                          ? row.profile.departments[0]?.name ?? 'No department'
                          : row.profile.departments?.name ?? 'No department'}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/onboarding/${row.profile.id}`}>
                    View onboarding detail
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-4 rounded-md bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Checklist visibility</p>
                  <Badge variant="outline">{taskCount} custom items</Badge>
                </div>

                {row.isLoading ? (
                  <div className="mt-3">
                    <EmptyState
                      icon={<Loader2 className="h-5 w-5 animate-spin" />}
                      title="Loading checklist items"
                      description="Retrieving custom onboarding tasks for this profile."
                      size="sm"
                    />
                  </div>
                ) : row.isError ? (
                  <div className="mt-3">
                    <EmptyState
                      icon={ClipboardList}
                      title="Failed to load checklist items"
                      description="The checklist items for this profile could not be retrieved."
                      size="sm"
                    />
                  </div>
                ) : taskCount > 0 ? (
                  <div className="mt-3 space-y-2">
                    {row.checklist?.onboarding_tasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          {task.is_completed ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                          ) : (
                            <ClipboardList className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className={task.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                              {task.title}
                            </p>
                            {task.description ? (
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            ) : null}
                          </div>
                        </div>
                        <Badge variant="secondary">{formatCategoryLabel(task.category)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <EmptyState
                      icon={ClipboardList}
                      title="No custom checklist items yet"
                      description="The onboarding wizard is currently the only required checklist flow."
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function ChecklistsDashboardPage(): ReactNode {
  const [managementDialogOpen, setManagementDialogOpen] = useState(false);
  const [managementTab, setManagementTab] = useState<ChecklistManagementTab>('employees');
  const [overviewRoleFilter, setOverviewRoleFilter] = useState<'employee' | 'intern'>('employee');
  const [selectedOffboardingId, setSelectedOffboardingId] = useState<string | null>(null);

  const employeeProfilesQuery = useOnboardingProfiles({ role: 'employee', pageSize: 100 });
  const internProfilesQuery = useOnboardingProfiles({ role: 'intern', pageSize: 100 });

  const employeeProfiles = employeeProfilesQuery.data?.data ?? [];
  const internProfiles = internProfilesQuery.data?.data ?? [];
  const offboardingQuery = useOffboardingAdminList();
  const offboardingRows = offboardingQuery.data?.data ?? [];
  const firstOffboardingId = offboardingRows[0]?.id ?? null;
  const allProfiles = useMemo(
    () => [...employeeProfiles, ...internProfiles],
    [employeeProfiles, internProfiles]
  );

  const checklistQueries = useQueries({
    queries: allProfiles.map((profile) => ({
      queryKey: profile.employee_id
        ? queryKeys.onboarding.checklist(profile.employee_id)
        : [...queryKeys.onboarding.all, 'checklist', `missing-${profile.id}`],
      enabled: Boolean(profile.employee_id),
      queryFn: async (): Promise<{ data: Array<OnboardingChecklistRecord> }> => {
        const response = await fetch(`/api/onboarding?employeeId=${profile.employee_id}`);
        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: 'Failed to fetch onboarding checklist' }));
          throw new Error(error.error || 'Failed to fetch onboarding checklist');
        }

        return response.json();
      },
    })),
  });

  const rows = useMemo<Array<ChecklistDashboardRow>>(
    () =>
      allProfiles.map((profile, index) => {
        const query = checklistQueries[index];
        const payload = query?.data as { data: Array<OnboardingChecklistRecord> } | undefined;
        return {
          profile,
          checklist: payload?.data?.[0] ?? null,
          isLoading: query?.isLoading ?? false,
          isError: query?.isError ?? false,
        };
      }),
    [allProfiles, checklistQueries]
  );

  const employeeRows = rows.filter((row) => {
    const role = Array.isArray(row.profile.users)
      ? row.profile.users[0]?.role
      : row.profile.users?.role;
    return role !== 'intern';
  });

  const internRows = rows.filter((row) => {
    const role = Array.isArray(row.profile.users)
      ? row.profile.users[0]?.role
      : row.profile.users?.role;
    return role === 'intern';
  });

  const activeProfilesCount = rows.length;
  const submittedCount = rows.filter((row) => row.profile.status === 'completed').length;
  const openCustomTasks = rows.reduce((count, row) => {
    const openTasks = row.checklist?.onboarding_tasks.filter((task) => !task.is_completed).length ?? 0;
    return count + openTasks;
  }, 0);
  const profilesNeedingAction = rows.filter((row) => {
    const hasOpenCustomTasks = row.checklist?.onboarding_tasks.some((task) => !task.is_completed) ?? false;
    return row.profile.status !== 'completed' || hasOpenCustomTasks;
  }).length;
  const offboardingOpenTasks = offboardingRows.reduce(
    (count, record) => count + record.offboarding_tasks.filter((task) => !task.is_completed).length,
    0
  );
  const offboardingEmployeeActions = offboardingRows.reduce(
    (count, record) =>
      count +
      record.offboarding_tasks.filter(
        (task) => !task.is_completed && task.owner_type === 'employee'
      ).length,
    0
  );
  const offboardingCompleted = offboardingRows.filter((record) => record.status === 'completed').length;

  const overviewConfig =
    overviewRoleFilter === 'intern'
      ? {
          title: 'Full Intern Overview',
          description:
            'See onboarding wizard progress and custom checklist items for all intern accounts.',
          rows: internRows,
          isLoadingProfiles: internProfilesQuery.isLoading,
        }
      : {
          title: 'Full Employee Overview',
          description:
            'See onboarding wizard progress and custom checklist items for all employee accounts.',
          rows: employeeRows,
          isLoadingProfiles: employeeProfilesQuery.isLoading,
        };

  const openChecklistManager = (
    tab: ChecklistManagementTab,
    options?: { offboardingId?: string | null }
  ): void => {
    setManagementTab(tab);

    if (tab === 'offboarding') {
      setSelectedOffboardingId(options?.offboardingId ?? firstOffboardingId ?? null);
    }

    setManagementDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Checklists</h1>
          <p className="text-muted-foreground">
            Review onboarding compliance in one place and prepare the offboarding workspace for the
            next implementation slice.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openChecklistManager('employees')}>
            <Users className="mr-2 h-4 w-4" />
            Manage checklists
          </Button>
        </div>
      </div>

      <Tabs defaultValue="onboarding" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding" className="space-y-6">
          <StatCardGrid columns={4}>
            <StatCard
              label="Active Profiles"
              value={activeProfilesCount}
              icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Wizard Submitted"
              value={submittedCount}
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Open Custom Tasks"
              value={openCustomTasks}
              icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Needs Action"
              value={profilesNeedingAction}
              icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
            />
          </StatCardGrid>

          <ChecklistRoleSection
            title={overviewConfig.title}
            description={overviewConfig.description}
            rows={overviewConfig.rows}
            isLoadingProfiles={overviewConfig.isLoadingProfiles}
            controls={
              <Select
                value={overviewRoleFilter}
                onValueChange={(value) =>
                  setOverviewRoleFilter(value as 'employee' | 'intern')
                }
              >
                <SelectTrigger aria-label="Choose overview role">
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employees</SelectItem>
                  <SelectItem value="intern">Interns</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </TabsContent>

        <TabsContent value="offboarding" className="space-y-6">
          <StatCardGrid columns={4}>
            <StatCard
              label="Active Offboardings"
              value={offboardingRows.length}
              icon={<LogOut className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Completed Exits"
              value={offboardingCompleted}
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Open Tasks"
              value={offboardingOpenTasks}
              icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Employee Actions Open"
              value={offboardingEmployeeActions}
              icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
            />
          </StatCardGrid>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Offboarding Workspace</CardTitle>
                  <CardDescription>
                    Review exit workflows, see what is still assigned to the employee, and track internal action items in one place.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => openChecklistManager('offboarding')}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Open offboarding manager
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {offboardingQuery.isLoading ? (
                <EmptyState
                  icon={<Loader2 className="h-5 w-5 animate-spin" />}
                  title="Loading offboarding records"
                  description="Retrieving active offboarding workflows and assignments."
                  size="sm"
                />
              ) : null}

              {offboardingQuery.isError ? (
                <EmptyState
                  icon={LogOut}
                  title="Failed to load offboarding records"
                  description="The offboarding workspace could not be retrieved. Refresh and try again."
                  size="sm"
                />
              ) : null}

              {!offboardingQuery.isLoading && !offboardingQuery.isError && offboardingRows.length === 0 ? (
                <EmptyState
                  icon={LogOut}
                  title="No offboarding records"
                  description="No active offboarding records are available yet. Once an exit workflow is initiated, it will appear here with grouped tasks and ownership labels."
                />
              ) : null}

              {offboardingRows.map((record: OffboardingRecord) => {
                const completedTaskCount = record.offboarding_tasks.filter((task) => task.is_completed).length;
                const openTaskCount = record.offboarding_tasks.length - completedTaskCount;

                return (
                  <div key={record.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {record.employee?.full_name ?? 'Unknown employee'}
                          </h3>
                          <Badge variant={record.status === 'completed' ? 'success' : 'warning'}>
                            {formatCategoryLabel(record.status)}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {record.employee?.role ?? 'employee'}
                          </Badge>
                          <Badge variant="secondary">{formatCategoryLabel(record.exit_type)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.employee?.email ?? 'No email available'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            Last working day: {formatDateLabel(record.last_working_day)}
                          </Badge>
                          {record.employee?.department ? (
                            <Badge variant="outline">{record.employee.department}</Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {completedTaskCount}/{record.offboarding_tasks.length} task{record.offboarding_tasks.length === 1 ? '' : 's'} complete
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChecklistManager('offboarding', { offboardingId: record.id })}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Manage checklist
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-md bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">Checklist visibility</p>
                        <Badge variant="outline">{openTaskCount} open</Badge>
                      </div>

                      {record.offboarding_tasks.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {record.offboarding_tasks.map((task) => (
                            <div key={task.id} className="flex items-start justify-between gap-3 text-sm">
                              <div className="flex items-start gap-2">
                                {task.is_completed ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                                ) : (
                                  <ClipboardList className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className={task.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                                    {task.title}
                                  </p>
                                  {task.description ? (
                                    <p className="text-xs text-muted-foreground">{task.description}</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 justify-end">
                                <Badge variant="secondary">{formatCategoryLabel(task.category)}</Badge>
                                <Badge variant={task.owner_type === 'employee' ? 'outline' : 'secondary'}>
                                  {task.owner_label}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3">
                          <EmptyState
                            icon={ClipboardList}
                            title="No offboarding tasks yet"
                            description="Tasks will appear here once the exit checklist is configured."
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ChecklistManagementDialog
        open={managementDialogOpen}
        onOpenChange={setManagementDialogOpen}
        activeTab={managementTab}
        onActiveTabChange={setManagementTab}
        employeeProfiles={employeeProfiles}
        internProfiles={internProfiles}
        offboardingRecords={offboardingRows}
        selectedOffboardingId={selectedOffboardingId}
        onSelectedOffboardingId={setSelectedOffboardingId}
      />
    </div>
  );
}

export default ChecklistsDashboardPage;