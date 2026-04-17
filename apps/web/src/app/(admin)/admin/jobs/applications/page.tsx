'use client';

import { useApplication, useApplications, type ApplicationRecord } from '@/hooks/useApplications';
import { useJobPostings } from '@/hooks/useJobPostings';
import {
  useBulkImportApplications,
  useEvaluateApplication,
  useHireApplication,
  useRemoveApplication,
  useUpdateApplicationStatus,
} from '@/hooks/useJobMutations';
import { useRealtimeApplications } from '@/hooks/useRealtimeApplications';
import { useTableSort } from '@/hooks/useTableSort';
import { useAuth } from '@/contexts/AuthContext';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { formatDate, formatDateTime, formatPersonName } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  ProgressTimeline,
  type ProgressTimelineStep,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SlidePanel,
  SlidePanelBody,
  SlidePanelContent,
  SlidePanelFooter,
  SlidePanelHeader,
  SlidePanelSection,
  SlidePanelTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  CheckCircle,
  Clock,
  Columns,
  Eye,
  FileText,
  LayoutList,
  Loader2,
  Search,
  Star,
  Trash2,
  ThumbsDown,
  Upload,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ApplicationStatus =
  | 'pending'
  | 'reviewed'
  | 'shortlisted'
  | 'interview'
  | 'rejected'
  | 'approved'
  | 'hired';

const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
    icon: typeof Clock;
  }
> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  reviewed: { label: 'Reviewed', variant: 'default', icon: Eye },
  shortlisted: { label: 'Shortlisted', variant: 'warning', icon: Star },
  interview: { label: 'Interview', variant: 'default', icon: Users },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle },
  hired: { label: 'Hired', variant: 'success', icon: UserCheck },
};

const PIPELINE_ORDER: ApplicationStatus[] = [
  'pending',
  'reviewed',
  'shortlisted',
  'interview',
  'approved',
  'hired',
];

type AiEvaluationStatus = ApplicationRecord['ai_evaluation_status'];

const APPLICATIONS_POLL_INTERVAL_MS = 2000;
const AI_IN_PROGRESS_STATUSES = new Set<AiEvaluationStatus>(['queued', 'parsing', 'evaluating']);
const AI_ACTIVE_EVALUATION_STATUSES = new Set<AiEvaluationStatus>(['parsing', 'evaluating']);

function renderAiEvaluationBadge(application: ApplicationRecord) {
  if (application.ai_evaluation_status === 'queued') {
    return (
      <Badge variant="outline" className="text-zinc-600 dark:text-zinc-300">
        <Clock className="mr-1 h-3 w-3" />
        Queued
      </Badge>
    );
  }

  if (AI_ACTIVE_EVALUATION_STATUSES.has(application.ai_evaluation_status)) {
    return (
      <Badge variant="outline" className="text-zinc-600 dark:text-zinc-300">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Evaluating…
      </Badge>
    );
  }

  if (application.ai_evaluation_status === 'failed') {
    return <Badge variant="destructive">Failed</Badge>;
  }

  if (application.ai_match_score != null) {
    return (
      <Badge variant={application.ai_match_score >= 70 ? 'success' : application.ai_match_score >= 40 ? 'warning' : 'destructive'}>
        <Bot className="h-3 w-3 mr-1" />
        {application.ai_match_score}%
      </Badge>
    );
  }

  return <span className="text-xs text-zinc-400">—</span>;
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const handleBack = useBackNavigation({ fallbackPath: '/admin/jobs' });
  const { addToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Candidate detail drawer
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [applicationsRefetchInterval, setApplicationsRefetchInterval] = useState<number | false>(false);
  const [selectedApplicationRefetchInterval, setSelectedApplicationRefetchInterval] = useState<number | false>(false);

  // Signed URL for resume preview (private bucket — generate on demand)
  const [resumeSignedUrl, setResumeSignedUrl] = useState<string | null>(null);

  const queryFilters = {
    ...(search ? { search } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter as ApplicationStatus } : {}),
    ...(jobFilter !== 'all' ? { jobPostingId: jobFilter } : {}),
    page: 1,
    pageSize: 200,
  };

  const { data, isLoading, error } = useApplications(queryFilters, {
    refetchInterval: applicationsRefetchInterval,
  });
  const { data: selectedApplicationData } = useApplication(selectedApplicationId, {
    refetchInterval: selectedApplicationRefetchInterval,
  });
  const { data: jobsData } = useJobPostings({ page: 1, pageSize: 100 });
  const updateStatus = useUpdateApplicationStatus();
  const hireApplication = useHireApplication();
  const bulkImport = useBulkImportApplications();
  const evaluateApp = useEvaluateApplication();
  const removeApplication = useRemoveApplication();

  useRealtimeApplications({
    applicationId: selectedApplicationId,
    enabled: Boolean(user),
  });

  // Bulk import state
  const [importOpen, setImportOpen] = useState(false);
  const [importJobId, setImportJobId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBulkImport = useCallback(async (files: FileList) => {
    if (!importJobId) {
      addToast({ variant: 'error', title: 'Select a job posting first' });
      return;
    }
    try {
      const result = await bulkImport.mutateAsync({ jobPostingId: importJobId, files: Array.from(files) });
      const { summary } = result.data;
      addToast({
        variant: 'success',
        title: `Imported ${summary.queued} of ${summary.total} CVs`,
        description: summary.failed > 0 ? `${summary.failed} failed — check console for details.` : 'Resumes are being parsed and evaluated by AI.',
      });
      setImportOpen(false);
      setImportJobId('');
    } catch (err) {
      addToast({ variant: 'error', title: 'Import failed', description: err instanceof Error ? err.message : 'Please try again.' });
    }
  }, [importJobId, bulkImport, addToast]);

  const applications = data?.data || [];
  const jobPostings = jobsData?.data || [];
  const selectedApp = useMemo(() => {
    if (selectedApplicationData?.data) {
      return selectedApplicationData.data;
    }

    if (!selectedApplicationId) {
      return null;
    }

    return applications.find((application) => application.id === selectedApplicationId) ?? null;
  }, [applications, selectedApplicationData?.data, selectedApplicationId]);

  useEffect(() => {
    const hasActiveAiProcessing = applications.some((application) =>
      AI_IN_PROGRESS_STATUSES.has(application.ai_evaluation_status)
    );

    setApplicationsRefetchInterval(
      hasActiveAiProcessing ? APPLICATIONS_POLL_INTERVAL_MS : false
    );
  }, [applications]);

  useEffect(() => {
    const shouldPollSelectedApplication =
      drawerOpen &&
      selectedApp != null &&
      AI_IN_PROGRESS_STATUSES.has(selectedApp.ai_evaluation_status);

    setSelectedApplicationRefetchInterval(
      shouldPollSelectedApplication ? APPLICATIONS_POLL_INTERVAL_MS : false
    );
  }, [drawerOpen, selectedApp]);

  useEffect(() => {
    setResumeSignedUrl(null);
    const raw = selectedApp?.cv_url || selectedApp?.resume_url;
    if (!raw) return;

    // Extract storage path from either a legacy full URL or a plain path
    let storagePath = raw;
    if (raw.startsWith('http')) {
      const match = raw.match(/\/storage\/v1\/object\/(?:public|sign(?:ed)?)\/applications\/(.+?)(?:\?|$)/);
      storagePath = match?.[1] ?? raw;
    }

    const supabase = createSupabaseBrowserClient();
    const run = async () => {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('applications')
        .createSignedUrl(storagePath, 3600);
      if (!signedError && signedData?.signedUrl) setResumeSignedUrl(signedData.signedUrl);
    };
    void run();
  }, [selectedApp?.cv_url, selectedApp?.resume_url]);

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({
    initialColumn: 'created_at',
    initialDirection: 'desc',
  });

  const sortedApps = sortItems(applications, {
    name: (a) => a.full_name.toLowerCase(),
    email: (a) => a.email.toLowerCase(),
    position: (a) => a.job_postings?.title?.toLowerCase() || '',
    status: (a) => PIPELINE_ORDER.indexOf(a.status as ApplicationStatus),
    ai_score: (a) => a.ai_match_score ?? -1,
    created_at: (a) => a.created_at,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === 'pending').length;
    const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;
    const interview = applications.filter((a) => a.status === 'interview').length;
    const hired = applications.filter((a) => a.status === 'hired').length;
    return { total, pending, shortlisted, interview, hired };
  }, [applications]);

  // Kanban board groups
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, ApplicationRecord[]> = {};
    for (const status of PIPELINE_ORDER) {
      groups[status] = applications.filter((a) => a.status === status);
    }
    groups.rejected = applications.filter((a) => a.status === 'rejected');
    return groups;
  }, [applications]);

  function openCandidate(app: ApplicationRecord) {
    setSelectedApplicationId(app.id);
    setNotes(app.notes || '');
    setDrawerOpen(true);
  }

  function getApplicationName(appId: string): string {
    if (selectedApp?.id === appId) {
      return formatPersonName(selectedApp.full_name);
    }

    const fallbackName = applications.find((application) => application.id === appId)?.full_name;
    return formatPersonName(fallbackName ?? 'Candidate');
  }

  async function handleStatusChange(appId: string, newStatus: string) {
    const candidateName = getApplicationName(appId);
    const statusLabel = STATUS_CONFIG[newStatus as ApplicationStatus]?.label ?? newStatus;
    try {
      await updateStatus.mutateAsync({ id: appId, status: newStatus, ...(notes ? { notes } : {}) });
      if (newStatus === 'approved') {
        addToast({
          variant: 'success',
          title: 'Application approved',
          description: `${candidateName} has been approved and is ready for the final hire step.`,
        });
      } else if (newStatus === 'rejected') {
        addToast({
          variant: 'warning',
          title: 'Application rejected',
          description: `${candidateName}'s application has been rejected.`,
        });
      } else {
        addToast({
          variant: 'default',
          title: 'Status updated',
          description: `${candidateName} moved to ${statusLabel}.`,
        });
      }
    } catch {
      addToast({
        variant: 'error',
        title: 'Failed to update status',
        description: 'Could not update the application status. Please try again.',
      });
    }
  }

  async function handleHire(appId: string) {
    const candidateName = getApplicationName(appId);

    try {
      const response = await hireApplication.mutateAsync(appId);
      const hireData = response.data;

      addToast({
        variant: 'success',
        title: hireData.autoClosed ? 'Candidate hired and position closed' : 'Candidate hired',
        description: hireData.autoClosed
          ? `${candidateName} filled the final seat. The posting is now closed.`
          : `${candidateName} has been hired. ${hireData.filledHeadcount} of ${hireData.totalHeadcount} seats are now filled.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to hire candidate',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function handleRemoveApplication(appId: string) {
    const candidateName = getApplicationName(appId);

    if (!window.confirm(`Remove ${candidateName} from the application pipeline?`)) {
      return;
    }

    try {
      await removeApplication.mutateAsync(appId);

      if (selectedApplicationId === appId) {
        setDrawerOpen(false);
        setSelectedApplicationId(null);
        setNotes('');
      }

      addToast({
        variant: 'default',
        title: 'Application removed',
        description: `${candidateName} has been removed from the active application pipeline.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to remove application',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function handleEvaluate(appId: string) {
    try {
      const response = await evaluateApp.mutateAsync(appId);
      addToast({
        variant: 'default',
        title: 'AI evaluation queued',
        description:
          response.data.status === 'parse_and_evaluation_queued'
            ? 'Resume parsing started. The AI score and summary will appear automatically.'
            : 'The AI score and summary will update automatically when the evaluation finishes.',
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to queue AI evaluation',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Application Pipeline
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Screen, shortlist, and manage candidate applications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import CVs
            </Button>
          </div>
        </div>

        {/* Stats */}
        <StatCardGrid columns={5} className="mb-6">
          <StatCard
            label="Total"
            value={stats.total}
            icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Shortlisted"
            value={stats.shortlisted}
            icon={<Star className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Interview"
            value={stats.interview}
            icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Hired"
            value={stats.hired}
            icon={<UserCheck className="h-4 w-4" strokeWidth={1.5} />}
          />
        </StatCardGrid>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Job Posting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Position</SelectItem>
                {jobPostings.map((jp) => (
                  <SelectItem key={jp.id} value={jp.id}>
                    {jp.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as 'table' | 'kanban')}>
              <TabsList>
                <TabsTrigger value="table"><LayoutList className="mr-1.5 h-3.5 w-3.5" />Table</TabsTrigger>
                <TabsTrigger value="kanban"><Columns className="mr-1.5 h-3.5 w-3.5" />Kanban</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0">
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading applications"
                description="Retrieving job applications and current pipeline filters."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0">
              <EmptyState
                icon={XCircle}
                title="Failed to load applications"
                description="The applications list could not be retrieved. Refresh and try again."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : applications.length === 0 ? (
          <Card className="bg-card border border-border rounded-lg p-12">
            <CardContent className="p-0">
              <EmptyState
                icon={FileText}
                title="No applications yet"
                description="Applications will appear here once candidates apply through your careers page."
                size="md"
              />
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* ─── TABLE VIEW ─── */
          <Card className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                  <SortableTableHead column="name" {...sortHeadProps}>
                    Candidate
                  </SortableTableHead>
                  <SortableTableHead column="email" {...sortHeadProps}>
                    Email
                  </SortableTableHead>
                  <SortableTableHead column="position" {...sortHeadProps}>
                    Position
                  </SortableTableHead>
                  <SortableTableHead column="status" {...sortHeadProps}>
                    Status
                  </SortableTableHead>
                  <SortableTableHead column="created_at" {...sortHeadProps}>
                    Applied
                  </SortableTableHead>
                  <SortableTableHead column="ai_score" {...sortHeadProps}>
                    AI Score
                  </SortableTableHead>
                  <TableHead className="text-sm font-medium text-zinc-600 dark:text-zinc-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedApps.map((app) => {
                  const cfg = STATUS_CONFIG[app.status as ApplicationStatus] || STATUS_CONFIG.pending;
                  return (
                    <TableRow
                      key={app.id}
                      className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                      onDoubleClick={() => openCandidate(app)}
                    >
                      <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {formatPersonName(app.full_name)}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                        {app.email}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                        {app.job_postings?.title || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                        {formatDate(app.created_at)}
                      </TableCell>
                      <TableCell>{renderAiEvaluationBadge(app)}</TableCell>
                      <TableCell className="text-right">
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: row click handled */}
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 gap-1.5">
                                Manage
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={() => openCandidate(app)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View details
                              </DropdownMenuItem>
                              {!AI_IN_PROGRESS_STATUSES.has(app.ai_evaluation_status) && (
                                <DropdownMenuItem onSelect={() => void handleEvaluate(app.id)}>
                                  <Bot className="mr-2 h-4 w-4" />
                                  Run AI review
                                </DropdownMenuItem>
                              )}
                              {(app.status === 'pending' || app.status === 'reviewed') && (
                                <DropdownMenuItem onSelect={() => void handleStatusChange(app.id, 'shortlisted')}>
                                  <Star className="mr-2 h-4 w-4" />
                                  Move to shortlisted
                                </DropdownMenuItem>
                              )}
                              {(app.status === 'shortlisted' || app.status === 'reviewed') && (
                                <DropdownMenuItem onSelect={() => void handleStatusChange(app.id, 'interview')}>
                                  <Users className="mr-2 h-4 w-4" />
                                  Move to interview
                                </DropdownMenuItem>
                              )}
                              {app.status === 'interview' && isAdmin && (
                                <DropdownMenuItem onSelect={() => void handleStatusChange(app.id, 'approved')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve candidate
                                </DropdownMenuItem>
                              )}
                              {app.status === 'approved' && isAdmin && (
                                <DropdownMenuItem onSelect={() => void handleHire(app.id)}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Mark as hired
                                </DropdownMenuItem>
                              )}
                              {app.status !== 'rejected' && app.status !== 'hired' && (
                                <DropdownMenuItem onSelect={() => void handleStatusChange(app.id, 'rejected')}>
                                  <ThumbsDown className="mr-2 h-4 w-4" />
                                  Reject application
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={() => void handleRemoveApplication(app.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove application
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          /* ─── KANBAN VIEW ─── */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...PIPELINE_ORDER, 'rejected' as ApplicationStatus].map((status) => {
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const items = kanbanGroups[status] || [];
              return (
                <div
                  key={status}
                  className="min-w-[280px] max-w-[300px] flex-shrink-0 flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    <span className="text-xs text-zinc-500 font-medium">{items.length}</span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {items.map((app) => (
                      <Card
                        key={app.id}
                        className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openCandidate(app)}
                      >
                        <CardContent className="p-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {formatPersonName(app.full_name)}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">{app.email}</p>
                          <p className="text-xs text-slate-700 dark:text-zinc-400 mt-1">
                            {app.job_postings?.title || 'Unknown Position'}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-zinc-400">
                              {formatDate(app.created_at)}
                            </p>
                            <div className="flex items-center justify-end">{renderAiEvaluationBadge(app)}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {items.length === 0 && (
                      <div className="text-xs text-zinc-400 text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                        No candidates
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── CANDIDATE DETAIL DRAWER ─── */}
      <SlidePanel
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelectedApplicationId(null);
          }
        }}
      >
        <SlidePanelContent size="2xl">
          {selectedApp && (
            <>
              <SlidePanelHeader>
                <SlidePanelTitle>{formatPersonName(selectedApp.full_name)}</SlidePanelTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={
                      STATUS_CONFIG[selectedApp.status as ApplicationStatus]?.variant || 'default'
                    }
                  >
                    {STATUS_CONFIG[selectedApp.status as ApplicationStatus]?.label ||
                      selectedApp.status}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    Applied {formatDateTime(selectedApp.created_at)}
                  </span>
                </div>
              </SlidePanelHeader>

              <SlidePanelBody>
                <div className="space-y-6">
                  {/* Pipeline Progress */}
                  <SlidePanelSection label="Pipeline Progress">
                    <ProgressTimeline
                      size="compact"
                      steps={PIPELINE_ORDER.map((stage): ProgressTimelineStep => {
                        const currentIdx = PIPELINE_ORDER.indexOf(selectedApp.status as ApplicationStatus);
                        const stageIdx = PIPELINE_ORDER.indexOf(stage);
                        const isRejected = selectedApp.status === 'rejected';
                        return {
                          label: STATUS_CONFIG[stage]?.label || stage,
                          status: isRejected
                            ? (stageIdx === 0 ? 'completed' : 'upcoming')
                            : stageIdx < currentIdx
                              ? 'completed'
                              : stageIdx === currentIdx
                                ? 'current'
                                : 'upcoming',
                        };
                      })}
                    />
                  </SlidePanelSection>

                  {/* Contact Info */}
                  <SlidePanelSection label="Contact Information">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Email</span>
                        <a
                          href={`mailto:${selectedApp.email}`}
                          className="text-slate-700 hover:underline"
                        >
                          {selectedApp.email}
                        </a>
                      </div>
                      {selectedApp.phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Phone</span>
                          <span className="text-zinc-900 dark:text-zinc-50">
                            {selectedApp.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </SlidePanelSection>

                  {/* Position */}
                  <SlidePanelSection label="Applied Position">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Position</span>
                        <span className="text-zinc-900 dark:text-zinc-50 font-medium">
                          {selectedApp.job_postings?.title || '—'}
                        </span>
                      </div>
                      {selectedApp.job_postings?.department && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Department</span>
                          <span className="text-zinc-900 dark:text-zinc-50">
                            {selectedApp.job_postings.department}
                          </span>
                        </div>
                      )}
                      {selectedApp.job_postings?.job_requisition ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Headcount</span>
                          <span className="text-zinc-900 dark:text-zinc-50">
                            {selectedApp.job_postings.job_requisition.filled_headcount} / {selectedApp.job_postings.job_requisition.total_headcount} filled
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </SlidePanelSection>

                  {/* Resume/CV Viewer */}
                  <SlidePanelSection label="Resume / CV">
                    {selectedApp.cv_url || selectedApp.resume_url ? (
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Document Preview
                          </span>
                          {resumeSignedUrl ? (
                            <a
                              href={resumeSignedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-700 hover:underline"
                            >
                              Open in new tab ↗
                            </a>
                          ) : null}
                        </div>
                        {resumeSignedUrl ? (
                          <iframe
                            src={resumeSignedUrl}
                            className="w-full h-[400px] border-0"
                            title="Resume preview"
                          />
                        ) : (
                          <div className="w-full h-[400px] flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-500">
                            Loading preview…
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-6 text-center">
                        No resume/CV uploaded
                      </div>
                    )}
                  </SlidePanelSection>

                  {/* AI Evaluation */}
                  <SlidePanelSection label="AI Evaluation">
                    {selectedApp.ai_evaluation_status === 'queued' ? (
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 px-4 py-5">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          <Clock className="h-4 w-4 text-amber-500" />
                          Queued for evaluation
                        </div>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                          This resume is waiting for the background worker to pick it up. Results will appear automatically once processing starts and finishes.
                        </p>
                      </div>
                    ) : AI_ACTIVE_EVALUATION_STATUSES.has(selectedApp.ai_evaluation_status) ? (
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 px-4 py-5">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                          Evaluating candidate
                        </div>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                          AI scoring is in progress. The score and summary will appear automatically when processing finishes.
                        </p>
                      </div>
                    ) : selectedApp.ai_evaluation_status === 'failed' ? (
                      <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 px-4 py-5 dark:border-red-900/50 dark:bg-red-950/20">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                          <XCircle className="h-4 w-4" />
                          AI evaluation failed
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-300/90">
                          The last background run did not complete. Re-run the evaluation to try again.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleEvaluate(selectedApp.id)}
                          disabled={evaluateApp.isPending || !(selectedApp.cv_url || selectedApp.resume_url || selectedApp.parsed_resume_markdown)}
                        >
                          <Bot className="h-4 w-4 mr-1" />
                          {evaluateApp.isPending ? 'Evaluating…' : 'Retry AI Evaluation'}
                        </Button>
                      </div>
                    ) : selectedApp.ai_match_score != null ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-indigo-500" />
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Match Score</span>
                          </div>
                          <Badge variant={selectedApp.ai_match_score >= 70 ? 'success' : selectedApp.ai_match_score >= 40 ? 'warning' : 'destructive'} className="text-base px-3 py-0.5">
                            {selectedApp.ai_match_score}%
                          </Badge>
                        </div>

                        {selectedApp.ai_executive_summary && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1">Summary</p>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">{selectedApp.ai_executive_summary}</p>
                          </div>
                        )}

                        {Array.isArray(selectedApp.ai_top_strengths) && selectedApp.ai_top_strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1">Top Strengths</p>
                            <ul className="space-y-1">
                              {selectedApp.ai_top_strengths.map((s: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                  <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-emerald-500 flex-shrink-0" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {Array.isArray(selectedApp.ai_missing_requirements) && selectedApp.ai_missing_requirements.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1">Missing Requirements</p>
                            <ul className="space-y-1">
                              {selectedApp.ai_missing_requirements.map((r: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                  <XCircle className="h-3.5 w-3.5 mt-0.5 text-red-400 flex-shrink-0" />
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {selectedApp.ai_evaluated_at && (
                          <p className="text-xs text-zinc-400">
                            Evaluated {formatDateTime(selectedApp.ai_evaluated_at)}
                            {selectedApp.ai_evaluation_model ? ` · ${selectedApp.ai_evaluation_model}` : ''}
                          </p>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleEvaluate(selectedApp.id)}
                          disabled={evaluateApp.isPending}
                        >
                          <Bot className="h-4 w-4 mr-1" />
                          {evaluateApp.isPending ? 'Re-evaluating…' : 'Re-evaluate'}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-zinc-500 mb-3">No AI evaluation yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleEvaluate(selectedApp.id)}
                          disabled={evaluateApp.isPending || !(selectedApp.cv_url || selectedApp.resume_url || selectedApp.parsed_resume_markdown)}
                        >
                          <Bot className="h-4 w-4 mr-1" />
                          {evaluateApp.isPending ? 'Evaluating…' : 'Run AI Evaluation'}
                        </Button>
                        {!(selectedApp.cv_url || selectedApp.resume_url || selectedApp.parsed_resume_markdown) && (
                          <p className="text-xs text-zinc-400 mt-2">Requires a resume to evaluate</p>
                        )}
                      </div>
                    )}
                  </SlidePanelSection>

                  {/* Cover Letter */}
                  {selectedApp.cover_letter && (
                    <SlidePanelSection label="Cover Letter">
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                        {selectedApp.cover_letter}
                      </div>
                    </SlidePanelSection>
                  )}

                  {/* Notes */}
                  <SlidePanelSection label="Internal Notes">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add notes about this candidate..."
                      className="text-sm"
                    />
                  </SlidePanelSection>
                </div>
              </SlidePanelBody>

              <SlidePanelFooter>
                <div className="flex items-center gap-2 w-full flex-wrap">
                  {/* Reject */}
                  {selectedApp.status !== 'rejected' && selectedApp.status !== 'approved' && selectedApp.status !== 'hired' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedApp.id, 'rejected')}
                      disabled={updateStatus.isPending || hireApplication.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  )}

                  {/* Shortlist */}
                  {(selectedApp.status === 'pending' || selectedApp.status === 'reviewed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedApp.id, 'shortlisted')}
                      disabled={updateStatus.isPending || hireApplication.isPending}
                    >
                      <Star className="h-4 w-4 mr-1 text-amber-500" />
                      Shortlist
                    </Button>
                  )}

                  {/* Move to Interview */}
                  {(selectedApp.status === 'shortlisted' || selectedApp.status === 'reviewed') && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(selectedApp.id, 'interview')}
                      disabled={updateStatus.isPending || hireApplication.isPending}
                      className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Move to Interview
                    </Button>
                  )}

                  {/* Approve after interview */}
                  {isAdmin && selectedApp.status === 'interview' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(selectedApp.id, 'approved')}
                      disabled={updateStatus.isPending || hireApplication.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}

                  {/* Final approval override for earlier stages */}
                  {isAdmin &&
                    selectedApp.status !== 'interview' &&
                    selectedApp.status !== 'approved' &&
                    selectedApp.status !== 'hired' &&
                    selectedApp.status !== 'rejected' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(selectedApp.id, 'approved')}
                        disabled={updateStatus.isPending || hireApplication.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Final Approval
                      </Button>
                    )}

                  {/* Mark as hired after approval */}
                  {isAdmin && selectedApp.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => handleHire(selectedApp.id)}
                      disabled={updateStatus.isPending || hireApplication.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {hireApplication.isPending ? 'Hiring...' : 'Mark as Hired'}
                    </Button>
                  )}
                </div>
              </SlidePanelFooter>
            </>
          )}
        </SlidePanelContent>
      </SlidePanel>

      {/* ─── BULK IMPORT DIALOG ─── */}
      <SlidePanel open={importOpen} onOpenChange={setImportOpen}>
        <SlidePanelContent size="md">
          <SlidePanelHeader>
            <SlidePanelTitle>Import CVs</SlidePanelTitle>
            <p className="text-sm text-zinc-500 mt-1">Upload resumes to parse and evaluate with AI</p>
          </SlidePanelHeader>
          <SlidePanelBody>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">Job Posting</label>
                <Select value={importJobId} onValueChange={setImportJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job posting…" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobPostings.map((jp) => (
                      <SelectItem key={jp.id} value={jp.id}>
                        {jp.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">Resume Files</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      void handleBulkImport(e.target.files);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!importJobId || bulkImport.isPending}
                  className="w-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {bulkImport.isPending ? 'Uploading…' : 'Click to select PDF or DOCX files'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Max 50 files, 10 MB each</p>
                </button>
              </div>
            </div>
          </SlidePanelBody>
        </SlidePanelContent>
      </SlidePanel>
    </div>
  );
}
