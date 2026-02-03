'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Search,
  Filter,
  Download,
  Plus,
  TrendingUp,
  FileText,
  Clock,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  InternshipSummaryCards,
  InternList,
  InternRow,
  type InternDashboardStats,
  type InternSummary,
  type InternId,
  type SupervisorId,
} from '@hr-portal/ui';

// Mock data
const mockStats: InternDashboardStats = {
  totalInterns: 25,
  activeInterns: 18,
  completedInterns: 7,
  averageProgress: 65,
  totalHoursLogged: 4520,
  pendingReports: 12,
  reportsThisWeek: 45,
};

const mockInterns: InternSummary[] = [
  {
    id: 'intern-1' as InternId,
    name: 'John Doe',
    email: 'john.doe@university.edu',
    school: 'State University',
    program: 'Computer Science',
    department: 'Engineering',
    supervisor: 'Sarah Johnson',
    supervisorId: 'sup-1' as SupervisorId,
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    requiredHours: 480,
    completedHours: 245,
    progressPercentage: 51,
    status: 'active',
    lastReportDate: '2024-02-15',
    pendingReports: 0,
  },
  {
    id: 'intern-2' as InternId,
    name: 'Jane Smith',
    email: 'jane.smith@techcollege.edu',
    school: 'Tech College',
    program: 'Information Technology',
    department: 'Engineering',
    supervisor: 'Mike Brown',
    supervisorId: 'sup-2' as SupervisorId,
    startDate: '2024-01-08',
    endDate: '2024-04-08',
    requiredHours: 400,
    completedHours: 320,
    progressPercentage: 80,
    status: 'active',
    lastReportDate: '2024-02-15',
    pendingReports: 2,
  },
  {
    id: 'intern-3' as InternId,
    name: 'Alex Johnson',
    email: 'alex.j@cityuniversity.edu',
    school: 'City University',
    program: 'Business Administration',
    department: 'Marketing',
    supervisor: 'Emily Davis',
    supervisorId: 'sup-3' as SupervisorId,
    startDate: '2024-02-01',
    endDate: '2024-05-01',
    requiredHours: 500,
    completedHours: 120,
    progressPercentage: 24,
    status: 'active',
    lastReportDate: '2024-02-14',
    pendingReports: 1,
  },
  {
    id: 'intern-4' as InternId,
    name: 'Maria Garcia',
    email: 'maria.g@stateu.edu',
    school: 'State University',
    program: 'Human Resources',
    department: 'HR',
    supervisor: 'Tom Wilson',
    supervisorId: 'sup-4' as SupervisorId,
    startDate: '2023-10-01',
    endDate: '2024-01-31',
    requiredHours: 480,
    completedHours: 480,
    progressPercentage: 100,
    status: 'completed',
    lastReportDate: '2024-01-31',
    pendingReports: 0,
  },
  {
    id: 'intern-5' as InternId,
    name: 'Robert Lee',
    email: 'robert.lee@techcollege.edu',
    school: 'Tech College',
    program: 'Software Engineering',
    department: 'Engineering',
    supervisor: 'Sarah Johnson',
    supervisorId: 'sup-1' as SupervisorId,
    startDate: '2024-01-22',
    endDate: '2024-04-22',
    requiredHours: 400,
    completedHours: 180,
    progressPercentage: 45,
    status: 'active',
    lastReportDate: '2024-02-13',
    pendingReports: 3,
  },
];

export default function AdminInternsPage(): ReactNode {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const schools = [...new Set(mockInterns.map((i) => i.school))];
  const supervisors = [...new Set(mockInterns.map((i) => i.supervisor))];

  const filteredInterns = mockInterns.filter((intern) => {
    const matchesSearch =
      intern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.program.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || intern.status === statusFilter;
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
      <InternshipSummaryCards stats={mockStats} />

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
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school} value={school}>{school}</SelectItem>
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
                  <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(statusFilter !== 'all' || schoolFilter !== 'all' || supervisorFilter !== 'all' || searchQuery) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {filteredInterns.length} of {mockInterns.length} interns
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
            searchQuery || statusFilter !== 'all' || schoolFilter !== 'all' || supervisorFilter !== 'all'
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
                  {searchQuery || statusFilter !== 'all' || schoolFilter !== 'all' || supervisorFilter !== 'all'
                    ? 'No interns match the selected filters'
                    : 'No interns found'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Reports Alert */}
      {mockStats.pendingReports > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Pending Report Reviews</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There are {mockStats.pendingReports} daily reports waiting for supervisor review.
                  Timely feedback helps interns improve their performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
