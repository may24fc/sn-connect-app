'use client';

import { useApplications, type ApplicationRecord } from '@/hooks/useApplications';
import { useJobPostings } from '@/hooks/useJobPostings';
import { useUpdateApplicationStatus } from '@/hooks/useJobMutations';
import { useTableSort } from '@/hooks/useTableSort';
import { useAuth } from '@/contexts/AuthContext';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
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
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Search,
  Shield,
  Star,
  ThumbsDown,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

export default function ApplicationsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isSuperAdmin = user?.role === 'super_admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Candidate detail drawer
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Offer letter view
  const [showOfferLetter, setShowOfferLetter] = useState(false);

  // Signed URL for resume preview (private bucket — generate on demand)
  const [resumeSignedUrl, setResumeSignedUrl] = useState<string | null>(null);

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

  const queryFilters = {
    ...(search ? { search } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter as ApplicationStatus } : {}),
    ...(jobFilter !== 'all' ? { jobPostingId: jobFilter } : {}),
    page: 1,
    pageSize: 200,
  };

  const { data, isLoading, error } = useApplications(queryFilters);
  const { data: jobsData } = useJobPostings({ page: 1, pageSize: 100 });
  const updateStatus = useUpdateApplicationStatus();

  const applications = data?.data || [];
  const jobPostings = jobsData?.data || [];

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({
    initialColumn: 'created_at',
    initialDirection: 'desc',
  });

  const sortedApps = sortItems(applications, {
    name: (a) => a.full_name.toLowerCase(),
    email: (a) => a.email.toLowerCase(),
    position: (a) => a.job_postings?.title?.toLowerCase() || '',
    status: (a) => PIPELINE_ORDER.indexOf(a.status as ApplicationStatus),
    created_at: (a) => a.created_at,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === 'pending').length;
    const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;
    const interview = applications.filter((a) => a.status === 'interview').length;
    const approved = applications.filter((a) => a.status === 'approved').length;
    return { total, pending, shortlisted, interview, approved };
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
    setSelectedApp(app);
    setNotes(app.notes || '');
    setShowOfferLetter(false);
    setDrawerOpen(true);
  }

  async function handleStatusChange(appId: string, newStatus: string) {
    const candidateName = selectedApp?.full_name ?? 'Candidate';
    const statusLabel = STATUS_CONFIG[newStatus as ApplicationStatus]?.label ?? newStatus;
    try {
      await updateStatus.mutateAsync({ id: appId, status: newStatus, ...(notes ? { notes } : {}) });
      if (selectedApp?.id === appId) {
        setSelectedApp((prev) => (prev ? { ...prev, status: newStatus as ApplicationStatus } : null));
      }
      if (newStatus === 'approved') {
        setShowOfferLetter(true);
        addToast({
          variant: 'success',
          title: 'Application approved',
          description: `${candidateName} has been approved. Offer letter is ready.`,
        });
      } else if (newStatus === 'rejected') {
        addToast({
          variant: 'warning',
          title: 'Application rejected',
          description: `${candidateName}'s application has been rejected.`,
        });
      } else if (newStatus === 'hired') {
        addToast({
          variant: 'success',
          title: '🎉 Candidate hired!',
          description: `${candidateName} has been marked as hired.`,
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
        description: 'Something went wrong. Please try again.',
      });
    }
  }

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/jobs"
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Application Pipeline
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Screen, shortlist, and manage candidate applications
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: Users },
            { label: 'Pending', value: stats.pending, icon: Clock },
            { label: 'Shortlisted', value: stats.shortlisted, icon: Star },
            { label: 'Interview', value: stats.interview, icon: Users },
            { label: 'Approved', value: stats.approved, icon: CheckCircle },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border border-border rounded-lg p-4">
              <CardContent className="p-0 flex items-center gap-3">
                <stat.icon className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
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
              <SelectItem value="all">All Positions</SelectItem>
              {jobPostings.map((jp) => (
                <SelectItem key={jp.id} value={jp.id}>
                  {jp.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'kanban')}>
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0 text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Loading applications...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0 text-sm text-rose-600 text-center">
              Failed to load applications.
            </CardContent>
          </Card>
        ) : applications.length === 0 ? (
          <Card className="bg-card border border-border rounded-lg p-12">
            <CardContent className="p-0 flex flex-col items-center gap-3">
              <FileText className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                No applications yet
              </p>
              <p className="text-sm text-zinc-500">
                Applications will appear here once candidates apply through your careers page.
              </p>
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
                      onClick={() => openCandidate(app)}
                    >
                      <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {app.full_name}
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
                      <TableCell className="text-right">
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: row click handled */}
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openCandidate(app)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-zinc-500" />
                          </Button>
                          {app.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(app.id, 'shortlisted')}
                              title="Shortlist"
                            >
                              <Star className="h-4 w-4 text-amber-500" />
                            </Button>
                          )}
                          {(app.status === 'shortlisted' || app.status === 'reviewed') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(app.id, 'interview')}
                              title="Move to Interview"
                            >
                              <Users className="h-4 w-4 text-indigo-500" />
                            </Button>
                          )}
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
                            {app.full_name}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">{app.email}</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                            {app.job_postings?.title || 'Unknown Position'}
                          </p>
                          <p className="text-xs text-zinc-400 mt-2">
                            {formatDate(app.created_at)}
                          </p>
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
      <SlidePanel open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SlidePanelContent size="2xl">
          {selectedApp && !showOfferLetter && (
            <>
              <SlidePanelHeader>
                <SlidePanelTitle>{selectedApp.full_name}</SlidePanelTitle>
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
                  {/* Contact Info */}
                  <SlidePanelSection label="Contact Information">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Email</span>
                        <a
                          href={`mailto:${selectedApp.email}`}
                          className="text-indigo-600 hover:underline"
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
                              className="text-xs text-indigo-600 hover:underline"
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
                  {/* Reject - available to admin and super_admin */}
                  {selectedApp.status !== 'rejected' && selectedApp.status !== 'approved' && selectedApp.status !== 'hired' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedApp.id, 'rejected')}
                      disabled={updateStatus.isPending}
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
                      disabled={updateStatus.isPending}
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
                      disabled={updateStatus.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Move to Interview
                    </Button>
                  )}

                  {/* SUPER-ADMIN ONLY: Final Approval */}
                  {isSuperAdmin &&
                    selectedApp.status !== 'approved' &&
                    selectedApp.status !== 'hired' &&
                    selectedApp.status !== 'rejected' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(selectedApp.id, 'approved')}
                        disabled={updateStatus.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Final Approval
                      </Button>
                    )}
                </div>
              </SlidePanelFooter>
            </>
          )}

          {/* ─── OFFER LETTER PLACEHOLDER VIEW ─── */}
          {selectedApp && showOfferLetter && (
            <>
              <SlidePanelHeader>
                <SlidePanelTitle>Offer Letter</SlidePanelTitle>
              </SlidePanelHeader>
              <SlidePanelBody>
                <div className="flex flex-col items-center gap-6 py-12">
                  <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                  </div>
                  <div className="text-center max-w-md">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      Application Approved!
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                      The offer letter for <strong>{selectedApp.full_name}</strong> is ready to be
                      generated.
                    </p>
                  </div>

                  <Card className="w-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="text-center border-b border-zinc-200 dark:border-zinc-700 pb-4">
                          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                            SN INTERNATIONAL GROUP
                          </p>
                          <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                            Employment Offer Letter
                          </h4>
                        </div>
                        <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <p>
                            <strong>Candidate:</strong> {selectedApp.full_name}
                          </p>
                          <p>
                            <strong>Email:</strong> {selectedApp.email}
                          </p>
                          <p>
                            <strong>Position:</strong>{' '}
                            {selectedApp.job_postings?.title || 'To be assigned'}
                          </p>
                          <p>
                            <strong>Department:</strong>{' '}
                            {selectedApp.job_postings?.department || 'To be assigned'}
                          </p>
                          <p>
                            <strong>Status:</strong>{' '}
                            <Badge variant="success">Approved</Badge>
                          </p>
                          <p>
                            <strong>Date:</strong> {formatDate(new Date().toISOString())}
                          </p>
                        </div>
                        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                          <p className="text-xs text-zinc-400 italic">
                            This is a placeholder offer letter. The actual offer letter template
                            will be configured by HR.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </SlidePanelBody>
              <SlidePanelFooter>
                <Button variant="outline" onClick={() => setShowOfferLetter(false)}>
                  Back to Candidate
                </Button>
                <Button
                  onClick={() => setDrawerOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Done
                </Button>
              </SlidePanelFooter>
            </>
          )}
        </SlidePanelContent>
      </SlidePanel>
    </div>
  );
}
