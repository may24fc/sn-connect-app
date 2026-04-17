'use client';

import { useJobPostings, type JobPostingRecord } from '@/hooks/useJobPostings';
import {
  useCreateJobPosting,
  useUpdateJobPosting,
  useArchiveJobPosting,
} from '@/hooks/useJobMutations';
import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { formatDate } from '@/lib/format';
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
  Label,
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
  SlidePanelTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, Archive, Briefcase, ChevronDown, Edit, Loader2, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

interface JobFormData {
  title: string;
  business_unit_id: string;
  department: string;
  location: string;
  total_headcount: number;
  employment_type: string;
  description: string;
  requirements: string;
  benefits: string;
  salary_range: string;
  is_active: boolean;
  closes_at: string;
}

type FormMode = 'create' | 'edit';

const EMPTY_FORM: JobFormData = {
  title: '',
  business_unit_id: '',
  department: '',
  location: '',
  total_headcount: 1,
  employment_type: 'full-time',
  description: '',
  requirements: '',
  benefits: '',
  salary_range: '',
  is_active: true,
  closes_at: '',
};

export default function AdminJobsPage() {
  const { addToast } = useToast();
  const { data: businessUnits = [] } = useQuery({
    queryKey: ['business-units-list'],
    queryFn: async (): Promise<Array<{ id: string; slug: string; name: string }>> => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return [];
      const { data } = await supabase
        .from('business_units')
        .select('id, slug, name')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });
      return (data as Array<{ id: string; slug: string; name: string }>) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const queryFilters = {
    ...(search ? { search } : {}),
    ...(typeFilter !== 'all'
      ? { employmentType: typeFilter as 'full-time' | 'part-time' | 'internship' | 'contract' }
      : {}),
    ...(statusFilter !== 'all' ? { isActive: statusFilter === 'active' } : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error } = useJobPostings(queryFilters);
  const createJob = useCreateJobPosting();
  const updateJob = useUpdateJobPosting();
  const archiveJob = useArchiveJobPosting();

  const jobs = data?.data || [];

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({
    initialColumn: 'created_at',
    initialDirection: 'desc',
  });

  const sortedJobs = sortItems(jobs, {
    title: (j) => j.title.toLowerCase(),
    department: (j) => j.department || '',
    employment_type: (j) => j.employment_type,
    status: (j) => (j.is_active ? 0 : 1),
    created_at: (j) => j.created_at,
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => j.is_active).length;
    const archived = jobs.filter((j) => !j.is_active).length;
    const openings = jobs.reduce((sum, job) => {
      const requisition = job.job_requisition;
      if (!requisition) return sum;
      return sum + Math.max(requisition.total_headcount - requisition.filled_headcount, 0);
    }, 0);
    return { total, active, archived, openings };
  }, [jobs]);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobFormData>(EMPTY_FORM);

  function openCreateForm() {
    setFormData(EMPTY_FORM);
    setFormMode('create');
    setEditingId(null);
    setFormOpen(true);
  }

  function openEditForm(job: JobPostingRecord) {
    setFormData({
      title: job.title,
      business_unit_id: job.business_unit_id || '',
      department: job.department || '',
      location: job.location || '',
      total_headcount: job.job_requisition?.total_headcount || 1,
      employment_type: job.employment_type,
      description: job.description,
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      salary_range: job.salary_range || '',
      is_active: job.is_active,
      closes_at: job.closes_at ? (job.closes_at.split('T')[0] ?? '') : '',
    });
    setFormMode('edit');
    setEditingId(job.id);
    setFormOpen(true);
  }

  async function handleSubmitForm() {
    const payload: Record<string, unknown> = {
      title: formData.title,
      total_headcount: formData.total_headcount,
      employment_type: formData.employment_type,
      description: formData.description,
      is_active: formData.is_active,
      closes_at: formData.closes_at ? new Date(formData.closes_at).toISOString() : null,
    };
    if (formData.business_unit_id) payload.business_unit_id = formData.business_unit_id;
    if (formData.department) payload.department = formData.department;
    if (formData.location) payload.location = formData.location;
    if (formData.requirements) payload.requirements = formData.requirements;
    if (formData.benefits) payload.benefits = formData.benefits;
    if (formData.salary_range) payload.salary_range = formData.salary_range;

    try {
      if (formMode === 'create') {
        await createJob.mutateAsync(payload as never);
        addToast({
          variant: 'success',
          title: 'Job posting created',
          description: `"${formData.title}" is now ${formData.is_active ? 'live' : 'saved as draft'}.`,
        });
      } else if (editingId) {
        await updateJob.mutateAsync({ id: editingId, ...payload } as never);
        addToast({
          variant: 'success',
          title: 'Job posting updated',
          description: `"${formData.title}" has been saved.`,
        });
      }
      setFormOpen(false);
    } catch {
      addToast({
        variant: 'error',
        title: formMode === 'create' ? 'Failed to create posting' : 'Failed to update posting',
        description: 'Please check your inputs and try again.',
      });
    }
  }

  function handleArchive(id: string) {
    const job = jobs.find((j) => j.id === id);
    archiveJob.mutate(id, {
      onSuccess: () =>
        addToast({
          variant: 'default',
          title: 'Job posting archived',
          ...(job ? { description: `"${job.title}" is no longer visible to applicants.` } : {}),
        }),
      onError: () =>
        addToast({
          variant: 'error',
          title: 'Failed to archive posting',
          description: 'Could not archive the job posting. Please try again.',
        }),
    });
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Job Postings</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Create, edit, and manage job postings for your organization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/jobs/archive">
                <Archive className="h-4 w-4 mr-1.5" />
                View Archive
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/jobs/applications">View Applications</Link>
            </Button>
            <Button
              onClick={openCreateForm}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Job
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Postings', value: stats.total },
            { label: 'Active', value: stats.active },
            { label: 'Archived', value: stats.archived },
            { label: 'Open Seats', value: stats.openings },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border border-border rounded-lg p-4">
              <CardContent className="p-0">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search job postings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0">
              <EmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading job postings"
                description="Retrieving job postings and current filters."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-8">
            <CardContent className="p-0">
              <EmptyState
                icon={AlertCircle}
                title="Failed to load job postings"
                description="The jobs list could not be retrieved. Refresh and try again."
                size="sm"
              />
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="bg-card border border-border rounded-lg p-12">
            <CardContent className="p-0">
              <EmptyState
                icon={Briefcase}
                title="No job postings yet"
                description="Create your first job posting to start receiving applications."
                action={{ label: 'Create Job', onClick: openCreateForm }}
                size="md"
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                  <SortableTableHead column="title" {...sortHeadProps}>
                    Title
                  </SortableTableHead>
                  <SortableTableHead column="department" {...sortHeadProps}>
                    Department
                  </SortableTableHead>
                  <SortableTableHead column="employment_type" {...sortHeadProps}>
                    Type
                  </SortableTableHead>
                  <SortableTableHead column="status" {...sortHeadProps}>
                    Position Status
                  </SortableTableHead>
                  <SortableTableHead column="created_at" {...sortHeadProps}>
                    Created
                  </SortableTableHead>
                  <TableHead className="text-sm font-medium text-zinc-600 dark:text-zinc-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      <div>
                        <p>{job.title}</p>
                        {job.job_requisition ? (
                          <p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                            {job.job_requisition.filled_headcount} of {job.job_requisition.total_headcount} filled
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {job.department || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      <Badge variant="outline">{job.employment_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={job.is_active ? 'success' : 'secondary'}>
                          {job.is_active ? 'Open' : 'Closed'}
                        </Badge>
                        {job.job_requisition ? (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {job.job_requisition.status === 'filled' ? 'Headcount filled' : 'Hiring in progress'}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(job.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5">
                              Manage
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => openEditForm(job)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit posting
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/admin/jobs/applications">View applications</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!job.is_active}
                              onSelect={() => handleArchive(job.id)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive posting
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Create/Edit Slide Panel */}
      <SlidePanel open={formOpen} onOpenChange={setFormOpen}>
        <SlidePanelContent size="2xl">
          <SlidePanelHeader>
            <SlidePanelTitle>
              {formMode === 'create' ? 'Create Job Posting' : 'Edit Job Posting'}
            </SlidePanelTitle>
          </SlidePanelHeader>
          <SlidePanelBody>
            <div className="space-y-5">
              <div>
                <Label htmlFor="jp-title">Job Title *</Label>
                <Input
                  id="jp-title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Senior Software Engineer"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Business Unit</Label>
                  <Select
                    value={formData.business_unit_id}
                    onValueChange={(v) => setFormData((p) => ({ ...p, business_unit_id: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select business unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {businessUnits.map((bu) => (
                        <SelectItem key={bu.id} value={bu.id}>{bu.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="jp-location">Location</Label>
                  <Input
                    id="jp-location"
                    value={formData.location}
                    onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Remote, Cebu"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jp-department">Team / Division</Label>
                  <Input
                    id="jp-department"
                    value={formData.department}
                    onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                    placeholder="e.g. Sales, Engineering"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="jp-headcount">Approved Headcount *</Label>
                  <Input
                    id="jp-headcount"
                    type="number"
                    min="1"
                    max="999"
                    value={formData.total_headcount}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        total_headcount: Math.max(1, Number(e.target.value || 1)),
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(v) => setFormData((p) => ({ ...p, employment_type: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="jp-salary">Salary Range</Label>
                <Input
                  id="jp-salary"
                  value={formData.salary_range}
                  onChange={(e) => setFormData((p) => ({ ...p, salary_range: e.target.value }))}
                  placeholder="e.g. ₱50k-80k"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="jp-description">Description *</Label>
                <Textarea
                  id="jp-description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={5}
                  placeholder="Describe the role, responsibilities, and what makes it exciting..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="jp-requirements">Requirements</Label>
                <Textarea
                  id="jp-requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData((p) => ({ ...p, requirements: e.target.value }))}
                  rows={4}
                  placeholder="Required qualifications and skills..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="jp-benefits">Benefits</Label>
                <Textarea
                  id="jp-benefits"
                  value={formData.benefits}
                  onChange={(e) => setFormData((p) => ({ ...p, benefits: e.target.value }))}
                  rows={3}
                  placeholder="Health insurance, flexible hours, etc."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jp-closes">Closing Date</Label>
                  <Input
                    id="jp-closes"
                    type="date"
                    value={formData.closes_at}
                    onChange={(e) => setFormData((p) => ({ ...p, closes_at: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input
                    type="checkbox"
                    id="jp-active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-zinc-300 text-slate-700 focus:ring-slate-500"
                  />
                  <Label htmlFor="jp-active" className="cursor-pointer">
                    Publish immediately
                  </Label>
                </div>
              </div>
            </div>
          </SlidePanelBody>
          <SlidePanelFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitForm}
              disabled={
                !formData.title ||
                !formData.description ||
                formData.total_headcount < 1 ||
                createJob.isPending ||
                updateJob.isPending
              }
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {createJob.isPending || updateJob.isPending
                ? 'Saving...'
                : formMode === 'create'
                  ? 'Create Posting'
                  : 'Update Posting'}
            </Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>
    </div>
  );
}
