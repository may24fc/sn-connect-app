// Utility functions
export { cn } from './utils/cn';

// Primitives
export { Button, buttonVariants, type ButtonProps } from './primitives/button';
export { Input, type InputProps } from './primitives/input';
export { PasswordInput, type PasswordInputProps } from './primitives/password-input';
export { Textarea, type TextareaProps } from './primitives/textarea';
export { Skeleton, type SkeletonProps } from './primitives/skeleton';
export {
  Toast,
  ToastProvider,
  useToast,
  type ToastProps,
  type ToastState,
  type ToastVariant,
} from './primitives/toast';
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
export { FileDropZone, type FileDropZoneProps } from './primitives/file-drop-zone';
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
  SlidePanel,
  SlidePanelTrigger,
  SlidePanelClose,
  SlidePanelOverlay,
  SlidePanelContent,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelDescription,
  SlidePanelBody,
  SlidePanelFooter,
  SlidePanelSection,
  type SlidePanelContentProps,
} from './primitives/slide-panel';
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
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from './primitives/popover';
export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from './primitives/hover-card';

// Layout components
export { Sidebar } from './layout/Sidebar';
export { Header } from './layout/Header';
// Shared Components
export { EmptyState, type EmptyStateProps } from './components/empty-state';
export {
  MultiSelectFilter,
  ActiveFilterBadges,
  type FilterOption,
  type MultiSelectFilterProps,
} from './components/MultiSelectFilter';
// Document Components
export { FullScreenPreview, type FullScreenPreviewProps } from './components/documents';
// Components
export { AIChatbot, type ChatMessage, type AIChatbotProps, type ConversationItem } from './components/AIChatbot';

// AI Chat Citation Components
export {
  CitationBadge,
  CitedContent,
  CitationPanel,
  parseCitations,
  getCitationById,
  getUsedCitationIds,
  type Citation,
  type ParsedSegment,
  type CitationBadgeProps,
  type CitedContentProps,
  type CitationPanelProps,
} from './components/ai-chat';

export {
  Form,
  FormErrorMessage,
  FormField,
  FormGroup,
  FormInput,
  FormLabel,
  FormSelect,
  FormTextarea,
  PhoneInput,
  CurrencySelector,
  BankSelector,
} from './components/forms';
export type {
  FormProps,
  FormErrorMessageProps,
  FormFieldProps,
  FormGroupProps,
  FormInputProps,
  FormLabelProps,
  FormSelectOption,
  FormSelectProps,
  FormTextareaProps,
  PhoneInputProps,
  PhoneCountry,
  CurrencySelectorProps,
  CurrencyOption,
  BankSelectorProps,
  BankOption,
} from './components/forms';

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
  VersionHistory,
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
  ChatInterfaceMessage,
  ChatMessageProps as AIKnowledgeChatMessageProps,
  DebugPanelProps,
  AccessToggleProps,
  VersionHistoryProps,
  VersionRecord,
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
export {
  InternHoursProgressBar,
  type InternHoursProgressBarProps,
} from './components/internship/InternHoursProgressBar';

// Dashboard Components
export {
  MilestoneFeed,
  type MilestoneFeedProps,
  type MilestoneItem,
} from './components/dashboard/MilestoneFeed';
export {
  RoleDashboardWidget,
  type RoleDashboardWidgetProps,
  type KPICardData,
} from './components/dashboard/RoleDashboardWidget';
export {
  PendingApprovalsCard,
  type PendingApprovalsCardProps,
} from './components/dashboard/PendingApprovalsCard';

// Profile Components
export {
  RoleMetadataForm,
  RoleMetadataFormContainer,
  type RoleMetadataFormProps,
  type RoleMetadataFormContainerProps,
  type RoleMetadataFieldConfig,
  type RoleTypeConfig,
} from './components/profile/RoleMetadataForm';

// Notification Components
export {
  NotificationBell,
  type NotificationBellProps,
  type NotificationItem,
  type NotificationType,
} from './components/notifications/NotificationBell';

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
  OKRTargetId,
  TargetMetricType,
  CycleStatus,
  PerformanceCycle,
  OKRStatus,
  KeyResult,
  OKR,
  OKRTarget,
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
  TaskCategory,
  Task,
  TaskAssignee,
  TaskFormData,
  TaskFilters as TaskFiltersState,
  TaskDashboardStats,
} from './types/task.types';
export {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_CATEGORIES,
  isTaskOverdue,
  getDaysUntilDue,
  formatDueDate,
} from './types/task.types';

// Announcements Components
export {
  AnnouncementCard,
  AnnouncementFilters,
  AnnouncementEditor,
  TargetingSelector,
  AnnouncementPreview,
  AttachmentUploader,
  AnnouncementAnalytics,
  AnnouncementAnalyticsDashboard,
  AnnouncementDetailDialog,
} from './components/announcements';
export type {
  AnnouncementCardProps,
  AnnouncementFiltersProps,
  AnnouncementFiltersValue,
  AnnouncementEditorProps,
  TargetingSelectorProps,
  TargetingSelectorValue,
  AnnouncementPreviewProps,
  AttachmentUploaderProps,
  AnnouncementAnalyticsProps,
  AnnouncementAnalyticsDashboardProps,
  AnnouncementAnalyticsData,
  AnnouncementDetailDialogProps,
} from './components/announcements';

// Resources Components
export {
  ResourceCard,
  ResourceGrid,
  ResourceFilters,
  ResourceUploader,
  ResourcePreview,
  VideoPlayer,
  DocumentViewer,
  ResourceAnalytics,
  ResourceTargetingSelector,
  TagInput,
  CategoryBrowser,
} from './components/resources';
export type {
  ResourceCardProps,
  ResourceType,
  ResourceStatus,
  ResourceCategory,
  ResourceGridProps,
  ResourceFiltersProps,
  ResourceFiltersValue,
  ResourceUploaderProps,
  ResourcePreviewProps,
  VideoPlayerProps,
  ResourceAccessLevel,
  DocumentViewerProps,
  ResourceAnalyticsProps,
  ResourceTargetingSelectorProps,
  ResourceTargetingSelectorValue,
  TagInputProps,
  CategoryBrowserProps,
  CategoryItem,
} from './components/resources';

export type {
  FileStatus,
  AccessLevel,
  FileType,
  KnowledgeSource,
  ChatMessage as AIKnowledgeChatMessageType,
  SourceAttribution,
  UploadProgress as UploadProgressType,
  KnowledgeFilterOption,
} from './types/ai-knowledge.types';
