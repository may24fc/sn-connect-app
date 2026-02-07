// Utility functions
export { cn } from './utils/cn';

// Primitives
export { Button, buttonVariants, type ButtonProps } from './primitives/button';
export { Input, type InputProps } from './primitives/input';
export { Textarea, type TextareaProps } from './primitives/textarea';
export { Label } from './primitives/label';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './primitives/card';
export { Badge, badgeVariants, type BadgeProps } from './primitives/badge';
export { Avatar, AvatarImage, AvatarFallback } from './primitives/avatar';
export { Progress } from './primitives/progress';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './primitives/tabs';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './primitives/dialog';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './primitives/table';
export { Checkbox } from './primitives/checkbox';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './primitives/dropdown-menu';
export { Separator } from './primitives/separator';
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './primitives/tooltip';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './primitives/select';

// Layout components
export { Sidebar } from './layout/Sidebar';
export { Header } from './layout/Header';

// Components
export { AIChatbot, type ChatMessage, type AIChatbotProps } from './components/AIChatbot';

// AI Knowledge Components
export {
  AIKnowledgeManager,
  KnowledgeBasePanel,
  PlaygroundPanel,
  UploadZone,
  UploadProgress,
  SourcesInventory,
  SourceRow,
  SourceFilters,
  ChatInterface,
  ChatMessage as AIKnowledgeChatMessage,
  DebugPanel,
  AccessToggle,
  mockSources,
} from './components/ai-knowledge';
export type {
  AIKnowledgeManagerProps,
  KnowledgeBasePanelProps,
  PlaygroundPanelProps,
  UploadZoneProps,
  UploadProgressProps,
  SourcesInventoryProps,
  SourceRowProps,
  SourceFiltersProps,
  ChatInterfaceProps,
  ChatMessageProps as AIKnowledgeChatMessageProps,
  DebugPanelProps,
  AccessToggleProps,
} from './components/ai-knowledge';

// Performance Components
export {
  ReviewStatusBadge,
  OKRStatusBadge,
  ProgressStatusBadge,
} from './components/performance/PerformanceStatusBadge';
export { OKRCard, OKRList } from './components/performance/OKRCard';
export { KPICard, KPIList, KPISummary } from './components/performance/KPICard';
export {
  CompletionTrendChart,
  DepartmentPerformanceChart,
  RatingDistributionChart,
  ProgressGauge,
} from './components/performance/PerformanceCharts';
export {
  PerformanceSummaryCards,
  CycleProgressCards,
} from './components/performance/PerformanceSummaryCards';

// Internship Components
export {
  InternshipStatusBadge,
  ReportStatusBadge as InternReportStatusBadge,
  HoursProgressBadge,
} from './components/internship/InternStatusBadge';
export { HoursProgressCard, HoursProgressMini } from './components/internship/HoursProgressCard';
export {
  DailyReportCard,
  DailyReportList,
  DailyReportSummary,
} from './components/internship/DailyReportCard';
export { InternCard, InternList, InternRow } from './components/internship/InternCard';
export {
  InternshipSummaryCards,
  InternPersonalStats,
} from './components/internship/InternshipSummaryCards';
export { EODReportForm } from './components/internship/EODReportForm';

// Reports Components
export {
  ReportStatusBadge,
  WeekSelector,
  WeekDropdownSelector,
  MetricInput,
  MetricInputGroup,
  ReportCard,
  ReportList,
  ReportSummaryCards,
  ReportForm,
  ReportSubmissionList,
  SubmissionRateCard,
  WeekComparisonTable,
  ExpenditureVsResultsChart,
  SpendByCategoryChart,
  ROIByDepartmentChart,
  WeeklyTrendsChart,
  MetricKPICard,
  MetricKPICardGrid,
  InsightsSummary,
  InsightsSummaryList,
} from './components/reports';
export type {
  MetricKPICardProps,
  InsightsSummaryProps,
  KeyFinding,
} from './components/reports';

// Task Components
export {
  TaskPriorityBadge,
  TaskStatusBadge,
  TaskCard,
  TaskSummaryCards,
  TaskFilters,
  TaskAssigneeSelect,
  TaskForm,
  TaskList,
  TaskDetailView,
} from './components/tasks';
export type {
  ReportId,
  ReportTypeId,
  MetricId,
  ReportStatus,
  ReportFrequency,
  MetricType,
  ReportType,
  ReportSubmission,
  ReportContent,
  ReportMetric,
  WeekPeriod,
  WeekComparison,
  MetricComparison,
  AnalyticsSummary,
  DepartmentMetrics,
  SubmissionTracking,
} from './components/reports';
export {
  REPORT_STATUS_CONFIG as WEEKLY_REPORT_STATUS_CONFIG,
  getCurrentWeekPeriod,
  getWeekNumber,
  formatPeriodLabel,
  calculateTotalExpenditure,
  calculateTotalResults,
  calculateROI,
} from './components/reports';

// Types
export type {
  EmployeeId,
  CycleId,
  OKRId,
  KeyResultId,
  KPIId,
  ReviewId,
  CycleStatus,
  PerformanceCycle,
  OKRStatus,
  KeyResult,
  OKR,
  KPI,
  ReviewStatus,
  PerformanceRating,
  PerformanceReview,
  EmployeePerformanceSummary,
  PerformanceDashboardStats,
  CompletionTrendData,
  DepartmentPerformanceData,
  RatingDistributionData,
  PerformanceFilters,
} from './types/performance.types';
export {
  REVIEW_STATUS_CONFIG,
  OKR_STATUS_CONFIG,
  RATING_CONFIG,
} from './types/performance.types';

export type {
  InternId,
  InternshipPeriodId,
  DailyReportId,
  SupervisorId,
  InternshipStatus,
  ReportStatus as InternReportStatus,
  InternshipPeriod,
  DailyReport,
  Intern,
  InternSummary,
  InternDashboardStats,
  WeeklyHoursSummary,
  InternFilters,
  EODReportFormData,
} from './types/internship.types';
export {
  INTERNSHIP_STATUS_CONFIG,
  REPORT_STATUS_CONFIG,
  calculateHoursProgress,
  getDaysRemaining,
  isOnTrack,
} from './types/internship.types';

export type {
  TaskId,
  TaskAssignmentId,
  TaskPriority,
  TaskStatus,
  Task,
  TaskAssignee,
  TaskFormData,
  TaskFilters as TaskFiltersState,
  TaskDashboardStats,
} from './types/task.types';
export {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  isTaskOverdue,
  getDaysUntilDue,
  formatDueDate,
} from './types/task.types';

export type {
  FileStatus,
  AccessLevel,
  FileType,
  KnowledgeSource,
  ChatMessage as AIKnowledgeChatMessageType,
  SourceAttribution,
  UploadProgress as UploadProgressType,
  FilterOption,
} from './types/ai-knowledge.types';
