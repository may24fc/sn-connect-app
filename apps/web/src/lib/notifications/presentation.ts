import {
  Bell,
  BookOpen,
  CheckCircle,
  ClipboardList,
  FileText,
  FolderOpen,
  Info,
  Megaphone,
  Receipt,
  Target,
  UserCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export type NotificationType =
  | 'task_assigned'
  | 'task_due'
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected'
  | 'invoice_submitted'
  | 'invoice_approved'
  | 'invoice_rejected'
  | 'intern_log_submitted'
  | 'intern_log_approved'
  | 'onboarding_approved'
  | 'onboarding_rejected'
  | 'announcement_new'
  | 'resource_new'
  | 'reminder'
  | 'onboarding_step'
  | 'probation_update'
  | 'system';

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  task_assigned: ClipboardList,
  task_due: Target,
  report_submitted: FileText,
  report_approved: CheckCircle,
  report_rejected: XCircle,
  invoice_submitted: Receipt,
  invoice_approved: CheckCircle,
  invoice_rejected: XCircle,
  intern_log_submitted: FileText,
  intern_log_approved: CheckCircle,
  onboarding_approved: UserCheck,
  onboarding_rejected: XCircle,
  announcement_new: Megaphone,
  resource_new: FolderOpen,
  reminder: Bell,
  onboarding_step: BookOpen,
  probation_update: UserCheck,
  system: Info,
};

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  task_assigned: 'text-slate-500',
  task_due: 'text-amber-500',
  report_submitted: 'text-blue-500',
  report_approved: 'text-emerald-500',
  report_rejected: 'text-rose-500',
  invoice_submitted: 'text-indigo-500',
  invoice_approved: 'text-emerald-500',
  invoice_rejected: 'text-rose-500',
  intern_log_submitted: 'text-sky-500',
  intern_log_approved: 'text-emerald-500',
  onboarding_approved: 'text-emerald-500',
  onboarding_rejected: 'text-rose-500',
  announcement_new: 'text-violet-500',
  resource_new: 'text-teal-500',
  reminder: 'text-amber-500',
  onboarding_step: 'text-cyan-500',
  probation_update: 'text-orange-500',
  system: 'text-zinc-500 dark:text-zinc-400',
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task Assigned',
  task_due: 'Task Due',
  report_submitted: 'Report Submitted',
  report_approved: 'Report Approved',
  report_rejected: 'Report Rejected',
  invoice_submitted: 'Invoice Submitted',
  invoice_approved: 'Invoice Approved',
  invoice_rejected: 'Invoice Rejected',
  intern_log_submitted: 'Intern Log Submitted',
  intern_log_approved: 'Intern Log Approved',
  onboarding_approved: 'Onboarding Approved',
  onboarding_rejected: 'Onboarding Rejected',
  announcement_new: 'Announcement',
  resource_new: 'New Resource',
  reminder: 'Reminder',
  onboarding_step: 'Onboarding',
  probation_update: 'Probation',
  system: 'System',
};