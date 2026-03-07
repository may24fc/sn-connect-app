'use client';

import { useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import { useProbation } from '@/hooks/useProbation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Search,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysRemaining(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── 30/60/90 Stage System ──────────────────────────────────────────────

type ProbationStage = 1 | 2 | 3 | 4;
type ProbationStatus = 'on-track' | 'at-risk' | 'completed' | 'extended';

const STAGE_LABELS: Record<ProbationStage, { name: string; description: string }> = {
  1: { name: '0–30 Days', description: 'Orientation & settling in' },
  2: { name: '30–60 Days', description: 'Early performance assessment' },
  3: { name: '60–90 Days', description: 'Mid-probation review' },
  4: { name: '90+ Days', description: 'Final evaluation' },
};

function getStage(dateHired: string, probationEndDate: string): ProbationStage {
  const start = new Date(dateHired);
  const end = new Date(probationEndDate);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const elapsed = Math.max(
    0,
    Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const ratio = elapsed / totalDays;

  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function getProbationStatus(
  dateHired: string,
  probationEndDate: string
): ProbationStatus {
  const daysRemaining = getDaysRemaining(probationEndDate);
  if (daysRemaining !== null && daysRemaining <= 0) return 'completed';
  // Check if extended beyond 90-day baseline
  const baselineEnd = new Date(dateHired);
  baselineEnd.setDate(baselineEnd.getDate() + 90);
  if (new Date(probationEndDate) > baselineEnd) return 'extended';
  if (daysRemaining !== null && daysRemaining <= 14) return 'at-risk';
  return 'on-track';
}

const STATUS_CONFIG: Record<
  ProbationStatus,
  { label: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  'on-track': {
    label: 'On Track',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    icon: TrendingUp,
  },
  'at-risk': {
    label: 'At Risk',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    icon: CheckCircle2,
  },
  extended: {
    label: 'Extended',
    badgeClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    icon: Clock,
  },
};

function StageIndicator({
  stage,
  status,
}: { stage: ProbationStage; status: ProbationStatus }): ReactNode {
  const stages: ProbationStage[] = [1, 2, 3, 4];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {stages.map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s < stage
                ? 'bg-emerald-500 dark:bg-emerald-400'
                : s === stage
                  ? status === 'at-risk'
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : status === 'extended'
                      ? 'bg-orange-500 dark:bg-orange-400'
                      : 'bg-indigo-500 dark:bg-indigo-400'
                  : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          {STAGE_LABELS[stage].name}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {STAGE_LABELS[stage].description}
        </span>
      </div>
    </div>
  );
}

const SAMPLE_PROBATION_EMPLOYEES: Array<{
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  date_hired: string;
  probation_end_date: string;
  avatar_url?: string;
}> = [
  {
    id: 'sample-1',
    user_id: 'sample-u1',
    first_name: 'Maria',
    last_name: 'Santos',
    position: 'Junior Software Engineer',
    department: 'Engineering',
    date_hired: '2025-12-01',
    probation_end_date: '2026-05-30',
  },
  {
    id: 'sample-2',
    user_id: 'sample-u2',
    first_name: 'Carlos',
    last_name: 'Reyes',
    position: 'Marketing Associate',
    department: 'Marketing',
    date_hired: '2026-01-15',
    probation_end_date: '2026-07-14',
  },
  {
    id: 'sample-3',
    user_id: 'sample-u3',
    first_name: 'Angela',
    last_name: 'Cruz',
    position: 'HR Coordinator',
    department: 'Human Resources',
    date_hired: '2025-09-15',
    probation_end_date: '2026-03-14',
  },
  {
    id: 'sample-4',
    user_id: 'sample-u4',
    first_name: 'Jerome',
    last_name: 'Villanueva',
    position: 'Finance Analyst',
    department: 'Finance',
    date_hired: '2025-11-01',
    probation_end_date: '2026-04-30',
  },
  {
    id: 'sample-5',
    user_id: 'sample-u5',
    first_name: 'Patricia',
    last_name: 'Lim',
    position: 'UI/UX Designer',
    department: 'Design',
    date_hired: '2026-02-01',
    probation_end_date: '2026-07-31',
  },
];

type ProbationView = 'cards' | 'list';

export default function EmployeeManagementPage(): ReactNode {
  const [activeTab, setActiveTab] = useState('probation');
  const [searchTerm, setSearchTerm] = useState('');
  const [probationView, setProbationView] = useState<ProbationView>('cards');

  // Probation data
  const { data: probationData, isLoading: probationLoading } = useProbation();

  // Onboarding profiles
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboardingProfiles({
    ...(searchTerm && { search: searchTerm }),
    page: 1,
    pageSize: 50,
  });

  const probationEmployees =
    probationData?.data && probationData.data.length > 0
      ? probationData.data
      : SAMPLE_PROBATION_EMPLOYEES;
  const onboardingProfiles = onboardingData?.data || [];

  const filteredProbation = searchTerm
    ? probationEmployees.filter(
        (emp: { first_name?: string; last_name?: string; position?: string }) => {
          const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
          return (
            name.includes(searchTerm.toLowerCase()) ||
            emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      )
    : probationEmployees;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UserCog className="h-5 w-5 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Employee Management
          </h1>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage employee probation, onboarding, and directory access
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="probation">
            Probation
            {probationEmployees.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {probationEmployees.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="onboarding">
            Onboarding
            {onboardingProfiles.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {onboardingProfiles.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Probation Tab */}
        <TabsContent value="probation" className="mt-4">
          {probationLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : filteredProbation.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2
                  className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No employees on probation
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* View Toggle */}
              <div className="flex items-center justify-end mb-4">
                <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setProbationView('cards')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      probationView === 'cards'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setProbationView('list')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      probationView === 'list'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" strokeWidth={1.5} />
                    List
                  </button>
                </div>
              </div>

              {probationView === 'cards' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProbation.map(
                    (emp: {
                      id: string;
                      user_id?: string;
                      first_name?: string;
                      last_name?: string;
                      position?: string;
                      department?: string;
                      date_hired?: string;
                      probation_end_date?: string;
                      avatar_url?: string;
                    }) => {
                      const daysRemaining = getDaysRemaining(emp.probation_end_date);
                      const isUrgent = daysRemaining !== null && daysRemaining <= 14;
                      const stage =
                        emp.date_hired && emp.probation_end_date
                          ? getStage(emp.date_hired, emp.probation_end_date)
                          : 1;
                      const status =
                        emp.date_hired && emp.probation_end_date
                          ? getProbationStatus(emp.date_hired, emp.probation_end_date)
                          : 'on-track';
                      const statusCfg = STATUS_CONFIG[status];
                      const StatusIcon = statusCfg.icon;

                      return (
                        <Card
                          key={emp.id}
                          className={isUrgent ? 'border-amber-300 dark:border-amber-700' : ''}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={emp.avatar_url} />
                                <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                  {getInitials(`${emp.first_name || ''} ${emp.last_name || ''}`)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-sm">
                                  {emp.first_name} {emp.last_name}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {emp.position || 'No position'}
                                </CardDescription>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.badgeClass}`}
                              >
                                <StatusIcon className="h-3 w-3" strokeWidth={1.5} />
                                {statusCfg.label}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Stage Progress */}
                            <StageIndicator stage={stage} status={status} />

                            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                              <span>Hired: {formatDate(emp.date_hired)}</span>
                              <span>End: {formatDate(emp.probation_end_date)}</span>
                            </div>
                            {daysRemaining !== null && (
                              <div className="flex items-center gap-2">
                                <Clock
                                  className={`h-3.5 w-3.5 ${isUrgent ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}
                                  strokeWidth={1.5}
                                />
                                <span
                                  className={`text-xs font-medium ${isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-300'}`}
                                >
                                  {daysRemaining <= 0
                                    ? 'Probation ended'
                                    : `${daysRemaining} days remaining`}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }
                  )}
                </div>
              ) : (
                <Card>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {/* List Header */}
                    <div className="grid grid-cols-[1fr_120px_160px_120px_100px] gap-4 px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <span>Employee</span>
                      <span>Department</span>
                      <span>Stage</span>
                      <span>Probation End</span>
                      <span>Status</span>
                    </div>
                    {filteredProbation.map(
                      (emp: {
                        id: string;
                        user_id?: string;
                        first_name?: string;
                        last_name?: string;
                        position?: string;
                        department?: string;
                        date_hired?: string;
                        probation_end_date?: string;
                        avatar_url?: string;
                      }) => {
                        const daysRemaining = getDaysRemaining(emp.probation_end_date);
                        const isUrgent = daysRemaining !== null && daysRemaining <= 14;
                        const stage =
                          emp.date_hired && emp.probation_end_date
                            ? getStage(emp.date_hired, emp.probation_end_date)
                            : 1;
                        const status =
                          emp.date_hired && emp.probation_end_date
                            ? getProbationStatus(emp.date_hired, emp.probation_end_date)
                            : 'on-track';
                        const statusCfg = STATUS_CONFIG[status];
                        const StatusIcon = statusCfg.icon;

                        return (
                          <div
                            key={emp.id}
                            className={`grid grid-cols-[1fr_120px_160px_120px_100px] gap-4 px-4 py-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                              isUrgent ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={emp.avatar_url} />
                                <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                  {getInitials(`${emp.first_name || ''} ${emp.last_name || ''}`)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                                  {emp.first_name} {emp.last_name}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                  {emp.position || 'No position'}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
                              {emp.department || '—'}
                            </span>
                            {/* Stage mini-indicator */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5">
                                {([1, 2, 3, 4] as ProbationStage[]).map((s) => (
                                  <div
                                    key={s}
                                    className={`h-1.5 w-5 rounded-full ${
                                      s < stage
                                        ? 'bg-emerald-500 dark:bg-emerald-400'
                                        : s === stage
                                          ? status === 'at-risk'
                                            ? 'bg-amber-500'
                                            : status === 'extended'
                                              ? 'bg-orange-500'
                                              : 'bg-indigo-500'
                                          : 'bg-zinc-200 dark:bg-zinc-700'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                {STAGE_LABELS[stage].name}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-600 dark:text-zinc-300">
                              {formatDate(emp.probation_end_date)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${statusCfg.badgeClass}`}
                            >
                              <StatusIcon className="h-3 w-3" strokeWidth={1.5} />
                              {statusCfg.label}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="mt-4">
          {onboardingLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : onboardingProfiles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users
                  className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No pending onboarding profiles
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {onboardingProfiles.map(
                (profile: {
                  id: string;
                  user_id: string;
                  first_name?: string;
                  last_name?: string;
                  is_completed?: boolean;
                  completed_steps?: number;
                  total_steps?: number;
                  created_at?: string;
                  avatar_url?: string;
                }) => {
                  const progress =
                    profile.total_steps && profile.total_steps > 0
                      ? Math.round(((profile.completed_steps || 0) / profile.total_steps) * 100)
                      : 0;

                  return (
                    <Card key={profile.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              {getInitials(
                                `${profile.first_name || ''} ${profile.last_name || ''}`
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-sm">
                              {profile.first_name} {profile.last_name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Started {formatDate(profile.created_at)}
                            </CardDescription>
                          </div>
                          {profile.is_completed && (
                            <Badge variant="default" className="ml-auto text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>
                              {profile.completed_steps || 0} / {profile.total_steps || 0} steps
                            </span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>
          )}
        </TabsContent>


      </Tabs>
    </div>
  );
}
