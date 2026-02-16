'use client';

import { useInternships } from '@/hooks/useInternships';
import { type InternshipFilters } from '@/lib/query-keys';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  type InternDashboardStats,
  type InternId,
  InternList,
  InternRow,
  type InternSummary,
  InternshipSummaryCards,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SupervisorId,
} from '@hr-portal/ui';
import { Download, FileText, Filter, GraduationCap, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

export default function AdminInternsPage(): ReactNode {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const internshipFilters: InternshipFilters = {
    page: 1,
    pageSize: 100,
  };

  if (statusFilter !== 'all') {
    internshipFilters.status = statusFilter as 'active' | 'completed' | 'terminated' | 'converted';
  }
  if (schoolFilter !== 'all') {
    internshipFilters.school = schoolFilter;
  }
  if (searchQuery.trim()) {
    internshipFilters.search = searchQuery.trim();
  }

  const internshipsQuery = useInternships(internshipFilters);

  const interns = useMemo<Array<InternSummary>>(
    () =>
      (internshipsQuery.data?.data || []).map((internship) => ({
        id: internship.id as InternId,
        name: internship.name,
        email: internship.email,
        school: internship.school,
        program: internship.program,
        department: internship.department,
        supervisor: internship.supervisor,
        supervisorId: (internship.supervisorId || '') as SupervisorId,
        startDate: internship.startDate,
        endDate: internship.endDate,
        requiredHours: internship.requiredHours,
        completedHours: internship.completedHours,
        progressPercentage: internship.progressPercentage,
        status: internship.status === 'converted' ? 'completed' : internship.status,
        ...(internship.lastReportDate ? { lastReportDate: internship.lastReportDate } : {}),
        pendingReports: internship.pendingReports,
      })),
    [internshipsQuery.data]
  );

  const stats: InternDashboardStats = internshipsQuery.data?.summary || {
    totalInterns: 0,
    activeInterns: 0,
    completedInterns: 0,
    averageProgress: 0,
    totalHoursLogged: 0,
    pendingReports: 0,
    reportsThisWeek: 0,
  };

  const schools = [...new Set(interns.map((i) => i.school))];
  const supervisors = [...new Set(interns.map((i) => i.supervisor))];

  const filteredInterns = interns.filter((intern) => {
    const matchesSearch =
      intern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.program.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'converted'
        ? intern.status === 'completed'
        : intern.status === statusFilter);
    const matchesSchool = schoolFilter === 'all' || intern.school === schoolFilter;
    const matchesSupervisor = supervisorFilter === 'all' || intern.supervisor === supervisorFilter;
    return matchesSearch && matchesStatus && matchesSchool && matchesSupervisor;
  });

  const handleViewIntern = (intern: InternSummary): void => {
    router.push(`/admin/interns/${intern.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intern Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage all interns across the organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Intern
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <InternshipSummaryCards stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Supervisors</SelectItem>
                {supervisors.map((sup) => (
                  <SelectItem key={sup} value={sup}>
                    {sup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(statusFilter !== 'all' ||
            schoolFilter !== 'all' ||
            supervisorFilter !== 'all' ||
            searchQuery) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {filteredInterns.length} of {interns.length} interns
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSchoolFilter('all');
                  setSupervisorFilter('all');
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Interns ({filteredInterns.length})</h2>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Interns Display */}
      {viewMode === 'grid' ? (
        <InternList
          interns={filteredInterns}
          onView={handleViewIntern}
          layout="grid"
          emptyMessage={
            searchQuery ||
            statusFilter !== 'all' ||
            schoolFilter !== 'all' ||
            supervisorFilter !== 'all'
              ? 'No interns match the selected filters'
              : 'No interns found'
          }
        />
      ) : (
        <Card>
          <CardContent className="p-4 space-y-2">
            {filteredInterns.length > 0 ? (
              filteredInterns.map((intern) => (
                <InternRow key={intern.id} intern={intern} onView={handleViewIntern} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchQuery ||
                  statusFilter !== 'all' ||
                  schoolFilter !== 'all' ||
                  supervisorFilter !== 'all'
                    ? 'No interns match the selected filters'
                    : 'No interns found'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Reports Alert */}
      {stats.pendingReports > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Pending Report Reviews</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There are {stats.pendingReports} daily reports waiting for supervisor review.
                  Timely feedback helps interns improve their performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {internshipsQuery.isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading interns...</CardContent>
        </Card>
      )}

      {internshipsQuery.error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">Failed to load interns.</CardContent>
        </Card>
      )}
    </div>
  );
}
