'use client';

import { useState, type ReactNode } from 'react';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  MoreVertical,
  Eye,
  MessageSquare,
  ChevronRight,
  Star,
  Target,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';

type ProbationStatus = 'on-track' | 'at-risk' | 'completed' | 'extended';
type ProbationStage = 1 | 2 | 3 | 4;
type PerformanceRating = 'exceptional' | 'exceeds' | 'meets' | 'needs_improvement' | 'unsatisfactory';

interface OKR {
  id: string;
  objective: string;
  keyResults: {
    id: string;
    description: string;
    target: string;
    current: string;
    progress: number;
  }[];
  status: 'draft' | 'submitted' | 'approved' | 'in_progress' | 'completed';
}

interface KPI {
  id: string;
  name: string;
  description: string;
  target: string;
  actual: string;
  score: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  startDate: string;
  stage: ProbationStage;
  status: ProbationStatus;
  daysRemaining: number;
  manager: string;
  avatarUrl?: string;
  documentsComplete: number;
  totalDocuments: number;
  okrs: OKR[];
  kpis: KPI[];
}

// Mock data with OKRs and KPIs
const employees: Employee[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    department: 'Engineering',
    position: 'Software Developer',
    startDate: '2024-01-02',
    stage: 2,
    status: 'on-track',
    daysRemaining: 45,
    manager: 'Sarah Johnson',
    documentsComplete: 6,
    totalDocuments: 8,
    okrs: [
      {
        id: 'okr1',
        objective: 'Build HR Portal Prototype',
        keyResults: [
          {
            id: 'kr1',
            description: 'Complete the dashboard UI with all components',
            target: '100%',
            current: '75%',
            progress: 75,
          },
          {
            id: 'kr2',
            description: 'Implement user authentication flow',
            target: '100%',
            current: '100%',
            progress: 100,
          },
          {
            id: 'kr3',
            description: 'Create API integration for employee data',
            target: '100%',
            current: '50%',
            progress: 50,
          },
        ],
        status: 'in_progress',
      },
    ],
    kpis: [
      {
        id: 'kpi1',
        name: 'Code Quality',
        description: 'Maintain code coverage above target',
        target: '80%',
        actual: '85%',
        score: 106,
      },
      {
        id: 'kpi2',
        name: 'Task Completion',
        description: 'Complete assigned tasks within sprint',
        target: '90%',
        actual: '88%',
        score: 98,
      },
    ],
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    department: 'Marketing',
    position: 'Marketing Specialist',
    startDate: '2024-01-10',
    stage: 1,
    status: 'at-risk',
    daysRemaining: 60,
    manager: 'Mike Brown',
    documentsComplete: 3,
    totalDocuments: 8,
    okrs: [
      {
        id: 'okr2',
        objective: 'Launch Social Media Campaign',
        keyResults: [
          {
            id: 'kr4',
            description: 'Increase Instagram followers by 20%',
            target: '20%',
            current: '8%',
            progress: 40,
          },
          {
            id: 'kr5',
            description: 'Create 15 content pieces per month',
            target: '15',
            current: '6',
            progress: 40,
          },
        ],
        status: 'in_progress',
      },
    ],
    kpis: [
      {
        id: 'kpi3',
        name: 'Campaign ROI',
        description: 'Return on marketing investment',
        target: '150%',
        actual: '90%',
        score: 60,
      },
    ],
  },
  {
    id: '3',
    name: 'Alex Johnson',
    email: 'alex.johnson@company.com',
    department: 'Finance',
    position: 'Financial Analyst',
    startDate: '2023-11-15',
    stage: 3,
    status: 'on-track',
    daysRemaining: 15,
    manager: 'Emily Davis',
    documentsComplete: 8,
    totalDocuments: 8,
    okrs: [
      {
        id: 'okr3',
        objective: 'Streamline Monthly Reporting Process',
        keyResults: [
          {
            id: 'kr6',
            description: 'Reduce report generation time by 30%',
            target: '30%',
            current: '35%',
            progress: 100,
          },
          {
            id: 'kr7',
            description: 'Automate 5 recurring reports',
            target: '5',
            current: '5',
            progress: 100,
          },
        ],
        status: 'completed',
      },
    ],
    kpis: [
      {
        id: 'kpi4',
        name: 'Report Accuracy',
        description: 'Financial report error rate',
        target: '99%',
        actual: '99.5%',
        score: 100,
      },
    ],
  },
  {
    id: '4',
    name: 'Maria Garcia',
    email: 'maria.garcia@company.com',
    department: 'HR',
    position: 'HR Coordinator',
    startDate: '2023-10-01',
    stage: 4,
    status: 'completed',
    daysRemaining: 0,
    manager: 'Tom Wilson',
    documentsComplete: 8,
    totalDocuments: 8,
    okrs: [],
    kpis: [],
  },
  {
    id: '5',
    name: 'Robert Lee',
    email: 'robert.lee@company.com',
    department: 'Engineering',
    position: 'QA Engineer',
    startDate: '2023-12-01',
    stage: 2,
    status: 'extended',
    daysRemaining: 30,
    manager: 'Sarah Johnson',
    documentsComplete: 5,
    totalDocuments: 8,
    okrs: [
      {
        id: 'okr4',
        objective: 'Implement Automated Testing Framework',
        keyResults: [
          {
            id: 'kr8',
            description: 'Write 100 automated test cases',
            target: '100',
            current: '45',
            progress: 45,
          },
          {
            id: 'kr9',
            description: 'Achieve 70% test coverage',
            target: '70%',
            current: '40%',
            progress: 57,
          },
        ],
        status: 'in_progress',
      },
    ],
    kpis: [
      {
        id: 'kpi5',
        name: 'Bug Detection Rate',
        description: 'Bugs found before production',
        target: '95%',
        actual: '78%',
        score: 82,
      },
    ],
  },
];

const statusConfig: Record<
  ProbationStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'secondary'; icon: typeof CheckCircle2 }
> = {
  'on-track': { label: 'On Track', variant: 'success', icon: TrendingUp },
  'at-risk': { label: 'At Risk', variant: 'error', icon: AlertTriangle },
  completed: { label: 'Completed', variant: 'secondary', icon: CheckCircle2 },
  extended: { label: 'Extended', variant: 'warning', icon: Clock },
};

const ratingConfig: Record<
  PerformanceRating,
  { label: string; description: string; color: string }
> = {
  exceptional: {
    label: 'Exceptional',
    description: 'Consistently exceeds all expectations and delivers outstanding results',
    color: 'bg-emerald-500',
  },
  exceeds: {
    label: 'Exceeds Expectations',
    description: 'Frequently exceeds expectations and delivers high-quality work',
    color: 'bg-green-500',
  },
  meets: {
    label: 'Meets Expectations',
    description: 'Consistently meets job requirements and expectations',
    color: 'bg-blue-500',
  },
  needs_improvement: {
    label: 'Needs Improvement',
    description: 'Performance is below expectations in some areas',
    color: 'bg-yellow-500',
  },
  unsatisfactory: {
    label: 'Unsatisfactory',
    description: 'Performance is significantly below expectations',
    color: 'bg-red-500',
  },
};

function StageIndicator({ stage, status }: { stage: ProbationStage; status: ProbationStatus }): ReactNode {
  const stages = [1, 2, 3, 4];

  return (
    <div className="flex items-center gap-1">
      {stages.map((s) => (
        <div
          key={s}
          className={`h-2 w-6 rounded-full ${
            s < stage
              ? 'bg-success'
              : s === stage
              ? status === 'at-risk'
                ? 'bg-error'
                : status === 'extended'
                ? 'bg-warning'
                : 'bg-primary'
              : 'bg-muted'
          }`}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">Stage {stage}/4</span>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}): ReactNode {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-colors ${readonly ? '' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProbationPage(): ReactNode {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [appraisalDialogOpen, setAppraisalDialogOpen] = useState(false);
  const [overallRating, setOverallRating] = useState<PerformanceRating>('meets');
  const [starRating, setStarRating] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [okrRatings, setOkrRatings] = useState<Record<string, number>>({});
  const [kpiRatings, setKpiRatings] = useState<Record<string, number>>({});

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesDepartment =
      departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const stats = {
    total: employees.length,
    onTrack: employees.filter((e) => e.status === 'on-track').length,
    atRisk: employees.filter((e) => e.status === 'at-risk').length,
    completed: employees.filter((e) => e.status === 'completed').length,
  };

  const departments = [...new Set(employees.map((e) => e.department))];

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleViewAppraisal = (employee: Employee): void => {
    setSelectedEmployee(employee);
    setAppraisalDialogOpen(true);
    // Reset form
    setOverallRating('meets');
    setStarRating(3);
    setFeedback('');
    setOkrRatings({});
    setKpiRatings({});
  };

  const handleSubmitAppraisal = (): void => {
    // TODO: Implement actual submission logic
    console.log('Submitting appraisal:', {
      employee: selectedEmployee?.id,
      overallRating,
      starRating,
      feedback,
      okrRatings,
      kpiRatings,
    });
    setAppraisalDialogOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Probation Tracker</h1>
        <p className="text-muted-foreground">
          Monitor and manage employee probation periods
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className="text-2xl font-bold">{stats.onTrack}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold">{stats.atRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="on-track">On Track</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
              <SelectItem value="extended">Extended</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>View</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => {
                const config = statusConfig[employee.status];
                const StatusIcon = config.icon;
                const docProgress = Math.round(
                  (employee.documentsComplete / employee.totalDocuments) * 100
                );

                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {employee.avatarUrl && (
                            <AvatarImage src={employee.avatarUrl} />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {employee.position}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      <StageIndicator
                        stage={employee.stage}
                        status={employee.status}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={docProgress} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground">
                          {employee.documentsComplete}/{employee.totalDocuments}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAppraisal(employee)}
                        disabled={employee.okrs.length === 0 && employee.kpis.length === 0}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                    <TableCell>
                      {employee.status === 'completed' ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span
                          className={
                            employee.daysRemaining <= 15
                              ? 'text-error font-medium'
                              : ''
                          }
                        >
                          {employee.daysRemaining} days
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewAppraisal(employee)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Appraisal
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Add Note
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ChevronRight className="mr-2 h-4 w-4" />
                            Advance Stage
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Appraisal Modal */}
      <Dialog open={appraisalDialogOpen} onOpenChange={setAppraisalDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              Performance Appraisal
            </DialogTitle>
            <DialogDescription>
              Review and rate {selectedEmployee?.name}&apos;s performance based on their OKRs and KPIs
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
                <Avatar className="h-14 w-14">
                  {selectedEmployee.avatarUrl && (
                    <AvatarImage src={selectedEmployee.avatarUrl} />
                  )}
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedEmployee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedEmployee.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.position} - {selectedEmployee.department}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Manager: {selectedEmployee.manager}
                  </p>
                </div>
                <Badge variant={statusConfig[selectedEmployee.status].variant}>
                  {statusConfig[selectedEmployee.status].label}
                </Badge>
              </div>

              <Tabs defaultValue="okrs" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="okrs">OKRs</TabsTrigger>
                  <TabsTrigger value="kpis">KPIs</TabsTrigger>
                  <TabsTrigger value="rating">Overall Rating</TabsTrigger>
                </TabsList>

                {/* OKRs Tab */}
                <TabsContent value="okrs" className="space-y-4">
                  {selectedEmployee.okrs.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        No OKRs submitted yet
                      </CardContent>
                    </Card>
                  ) : (
                    selectedEmployee.okrs.map((okr) => (
                      <Card key={okr.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{okr.objective}</CardTitle>
                              <CardDescription>
                                Status: <Badge variant="secondary" className="ml-1">{okr.status.replace('_', ' ')}</Badge>
                              </CardDescription>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Rate this OKR</p>
                              <StarRating
                                value={okrRatings[okr.id] || 0}
                                onChange={(rating) =>
                                  setOkrRatings((prev) => ({ ...prev, [okr.id]: rating }))
                                }
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {okr.keyResults.map((kr) => (
                            <div key={kr.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium">{kr.description}</p>
                                <span className="text-sm font-semibold text-primary">
                                  {kr.progress}%
                                </span>
                              </div>
                              <Progress value={kr.progress} className="h-2" />
                              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span>Current: {kr.current}</span>
                                <span>Target: {kr.target}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* KPIs Tab */}
                <TabsContent value="kpis" className="space-y-4">
                  {selectedEmployee.kpis.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        No KPIs defined yet
                      </CardContent>
                    </Card>
                  ) : (
                    selectedEmployee.kpis.map((kpi) => (
                      <Card key={kpi.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{kpi.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {kpi.description}
                              </p>
                              <div className="flex gap-6 mt-3">
                                <div>
                                  <p className="text-xs text-muted-foreground">Target</p>
                                  <p className="font-semibold">{kpi.target}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Actual</p>
                                  <p className="font-semibold">{kpi.actual}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Score</p>
                                  <p className={`font-semibold ${
                                    kpi.score >= 100 ? 'text-success' :
                                    kpi.score >= 80 ? 'text-warning' : 'text-error'
                                  }`}>
                                    {kpi.score}%
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Rate</p>
                              <StarRating
                                value={kpiRatings[kpi.id] || 0}
                                onChange={(rating) =>
                                  setKpiRatings((prev) => ({ ...prev, [kpi.id]: rating }))
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* Overall Rating Tab */}
                <TabsContent value="rating" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Overall Performance Rating</CardTitle>
                      <CardDescription>
                        Select the overall rating based on OKR and KPI performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-center gap-4 py-4">
                        <StarRating value={starRating} onChange={setStarRating} />
                        <span className="text-2xl font-bold">{starRating}/5</span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rating Category</label>
                        <Select
                          value={overallRating}
                          onValueChange={(value) => setOverallRating(value as PerformanceRating)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ratingConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <div className={`h-3 w-3 rounded-full ${config.color}`} />
                                  {config.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          {ratingConfig[overallRating].description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Feedback & Comments</CardTitle>
                      <CardDescription>
                        Provide detailed feedback based on {selectedEmployee.name}&apos;s performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder={`Based on ${selectedEmployee.name}'s ${
                          selectedEmployee.okrs[0]?.objective
                            ? `goal to "${selectedEmployee.okrs[0].objective}"`
                            : 'submitted objectives'
                        }, provide specific feedback on their progress, areas of strength, and areas for improvement...`}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="min-h-[150px]"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAppraisalDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSubmitAppraisal}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Submit Appraisal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
